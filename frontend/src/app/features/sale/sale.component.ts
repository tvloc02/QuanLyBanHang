import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  parentId?: number | null;
  children?: CategoryResponse[];
}

type HomeSectionItemType = 'PRODUCT' | 'COUPON' | 'NEWS' | 'LINK';
type SaleBlockType = 'HERO' | 'VOUCHERS' | 'ROUND_CATEGORIES' | 'PRODUCTS';

interface HomeSectionItemResponse {
  enabled?: boolean | null;
  itemType?: HomeSectionItemType | null;
  refId?: number | null;
  title?: string | null;
  titleColor?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  route?: string | null;
  code?: string | null;
  note?: string | null;
  noteColor?: string | null;
  buttonText?: string | null;
  minOrderAmount?: number | null;
  product?: any;
  coupon?: any;
}

interface HomeSectionResponse {
  sectionKey?: string | null;
  title?: string | null;
  enabled?: boolean | null;
  items?: HomeSectionItemResponse[] | null;
}

interface ProductSearchResponse {
  data: Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    oldPrice?: number;
    imageUrl?: string;
    badge?: string;
    discountPercent?: number;
    rating?: number;
    soldCount?: number;
    brand?: string;
    category?: string;
  }>;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface SaleProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  imageUrl?: string;
  badge?: string;
  discountPercent?: number;
  rating?: number;
  soldCount?: number;
  brand?: string;
}

interface HeroSlide {
  imageUrl: string;
  title?: string | null;
  note?: string | null;
  buttonText?: string | null;
  route?: string | null;
}

interface VoucherView {
  title: string;
  code: string;
  note: string;
  buttonText: string;
  minOrderAmount: number;
}

interface CategoryTile {
  label: string;
  slug: string;
  imageUrl: string;
}

interface SaleBlockView {
  id: string;
  type: SaleBlockType;
  title: string;
  enabled: boolean;
  heroSlides: HeroSlide[];
  vouchers: VoucherView[];
  categories: CategoryTile[];
  productCategorySlugs: string[];
  products: SaleProduct[];
  loadingProducts?: boolean;
}

@Component({
  selector: 'app-sale',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sale.component.html',
  styleUrls: ['./sale.component.scss']
})
export class SaleComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';

  saleFontFamily: string | null = null;
  salePrimaryColor: string | null = null;
  productPlaceholderImage = 'https://via.placeholder.com/600x800?text=Product';

  blocks: SaleBlockView[] = [];
  activeHeroIndexes: Record<string, number> = {};
  copiedVoucherCodes = new Set<string>();
  private heroTimers = new Map<string, any>();

  constructor(private http: HttpClient, private router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.loadPage();
  }

  ngOnDestroy(): void {
    for (const timer of this.heroTimers.values()) {
      clearInterval(timer);
    }
    this.heroTimers.clear();
  }

  async loadPage(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const sectionsUrl = `${environment.apiBaseUrl}/api/home-sections`;
      const categoriesUrl = `${environment.apiBaseUrl}/api/categories/tree`;

      const [sectionsRes, categoriesRes] = await Promise.all([
        firstValueFrom(this.http.get<ApiResponse<HomeSectionResponse[]>>(sectionsUrl)),
        firstValueFrom(this.http.get<ApiResponse<CategoryResponse[]>>(categoriesUrl))
      ]);

      const sections = Array.isArray(sectionsRes?.data) ? sectionsRes.data : [];
      const categories = Array.isArray(categoriesRes?.data) ? categoriesRes.data : [];

      this.applyTheme(sections);

      const parsed = this.parseDynamicBlocks(sections, categories);
      this.blocks = parsed.length > 0 ? parsed : this.buildLegacyBlocks(sections, categories);

      await this.hydrateProductBlocks();
      this.setupHeroTimers();
      this.loading = false;
    } catch (e: any) {
      this.loading = false;
      this.error = e?.error?.message || e?.message || 'Không thể tải trang sale.';
    }
  }

  blockAnchorId(block: SaleBlockView): string {
    return `sale-block-${block.id}`;
  }

  heroSliderId(block: SaleBlockView): string {
    return `sale-hero-${block.id}`;
  }

  voucherTrackId(block: SaleBlockView): string {
    return `sale-voucher-${block.id}`;
  }

  onHeroScroll(block: SaleBlockView): void {
    const el = document.getElementById(this.heroSliderId(block));
    if (!el) return;
    const width = el.clientWidth || 1;
    this.activeHeroIndexes[block.id] = Math.round(el.scrollLeft / width);
  }

  scrollHeroTo(block: SaleBlockView, index: number): void {
    const el = document.getElementById(this.heroSliderId(block));
    if (!el) return;
    const width = el.clientWidth || 1;
    const max = Math.max(0, block.heroSlides.length - 1);
    const target = Math.min(Math.max(index, 0), max);
    el.scrollTo({ left: target * width, behavior: 'smooth' });
    this.activeHeroIndexes[block.id] = target;
  }

  prevHero(block: SaleBlockView): void {
    const max = Math.max(0, block.heroSlides.length - 1);
    if (max <= 0) return;
    const current = this.activeHeroIndexes[block.id] || 0;
    this.scrollHeroTo(block, current - 1 < 0 ? max : current - 1);
  }

  nextHero(block: SaleBlockView): void {
    const max = Math.max(0, block.heroSlides.length - 1);
    if (max <= 0) return;
    const current = this.activeHeroIndexes[block.id] || 0;
    this.scrollHeroTo(block, current + 1 > max ? 0 : current + 1);
  }

  scrollVouchers(block: SaleBlockView, dir: 'left' | 'right'): void {
    const el = document.getElementById(this.voucherTrackId(block));
    if (!el) return;
    const step = Math.max(320, Math.round(el.clientWidth * 0.92));
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  }

  async copyVoucher(code: string): Promise<void> {
    const value = String(code || '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.copiedVoucherCodes.add(value);
    } catch {}
  }

  isVoucherCopied(code: string): boolean {
    return this.copiedVoucherCodes.has(String(code || '').trim());
  }

  go(route?: string | null): void {
    const target = String(route || '').trim();
    if (!target) return;
    this.router.navigateByUrl(target);
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)));
  }

  getDiscountLabel(p: SaleProduct): string {
    if (p.discountPercent && p.discountPercent > 0) return `-${p.discountPercent}%`;
    if (p.oldPrice && p.oldPrice > p.price) {
      const pct = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
      return pct > 0 ? `-${pct}%` : '';
    }
    return '';
  }

  onProductImageError(p: SaleProduct): void {
    if (!p) return;
    if (p.imageUrl === this.productPlaceholderImage) return;
    p.imageUrl = this.productPlaceholderImage;
  }

  goToProduct(p: SaleProduct): void {
    this.router.navigate(['/product', p.slug]);
  }

  onCategoryTileImageError(tile: CategoryTile): void {
    if (!tile) return;
    tile.imageUrl = this.resolveCategoryImage(tile.slug, tile.label);
  }

  private parseDynamicBlocks(sections: HomeSectionResponse[], categories: CategoryResponse[]): SaleBlockView[] {
    const layout = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_LAYOUT');
    const items = Array.isArray(layout?.items) ? layout!.items! : [];
    const byKey = new Map<string, HomeSectionResponse>();
    for (const sec of sections) {
      const key = String(sec?.sectionKey || '').trim().toUpperCase();
      if (key) byKey.set(key, sec);
    }

    return items
      .filter((it) => String(it?.itemType || '').toUpperCase() === 'LINK')
      .map((it) => {
        const type = String(it?.code || '').trim().toUpperCase() as SaleBlockType;
        const key = String(it?.route || '').trim().toUpperCase();
        if (!key || !['HERO', 'VOUCHERS', 'ROUND_CATEGORIES', 'PRODUCTS'].includes(type)) return null;
        const section = byKey.get(key);
        return this.mapSectionToBlock(key.replace(/^SALE_BLOCK_/, ''), type, section, categories, it?.title || null, it?.enabled !== false);
      })
      .filter((x): x is SaleBlockView => !!x);
  }

  private buildLegacyBlocks(sections: HomeSectionResponse[], categories: CategoryResponse[]): SaleBlockView[] {
    const hero = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_HERO');
    const vouchers = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_VOUCHERS');
    const round = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_CATEGORIES');
    const products = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_PRODUCTS');

    return [
      this.mapSectionToBlock('hero-1', 'HERO', hero, categories, hero?.title || 'Banner (Hero)', hero?.enabled !== false),
      this.mapSectionToBlock('voucher-1', 'VOUCHERS', vouchers, categories, vouchers?.title || 'NHẬN VOUCHER ĐỘC QUYỀN ONLINE', vouchers?.enabled !== false),
      this.mapSectionToBlock('round-1', 'ROUND_CATEGORIES', round, categories, round?.title || 'HÔM NAY SALE GÌ?', round?.enabled !== false),
      this.mapSectionToBlock('products-1', 'PRODUCTS', products, categories, products?.title || 'SẢN PHẨM ĐANG GIẢM GIÁ', products?.enabled !== false)
    ].filter((x) => x.enabled);
  }

  private mapSectionToBlock(
    id: string,
    type: SaleBlockType,
    section: HomeSectionResponse | undefined,
    categories: CategoryResponse[],
    title: string | null,
    enabled: boolean
  ): SaleBlockView {
    const items = Array.isArray(section?.items) ? section!.items! : [];
    const block: SaleBlockView = {
      id,
      type,
      title: String(title || this.defaultTitle(type)),
      enabled,
      heroSlides: [],
      vouchers: [],
      categories: [],
      productCategorySlugs: [],
      products: []
    };

    if (type === 'HERO') {
      block.heroSlides = items
        .filter((x) => x?.enabled !== false && String(x?.itemType || '').toUpperCase() === 'LINK')
        .map((x) => ({
          imageUrl: this.normalizeImageUrl(String(x?.imageUrl || '').trim()),
          title: x?.title ?? null,
          note: (x as any)?.note ?? null,
          buttonText: x?.buttonText ?? null,
          route: x?.route ?? null
        }))
        .filter((x) => !!x.imageUrl);
    }

    if (type === 'VOUCHERS') {
      block.vouchers = items
        .filter((x) => x?.enabled !== false && String(x?.itemType || '').toUpperCase() === 'COUPON')
        .map((x) => {
          const coupon = (x as any)?.coupon || null;
          const code = String(coupon?.code || x?.code || '').trim();
          return {
            title: String(x?.title || `Mã: ${code}`),
            code,
            note: String((x as any)?.note || x?.description || `Nhập mã ${code}`),
            buttonText: String(x?.buttonText || 'Sao chép mã'),
            minOrderAmount: Number(coupon?.minOrderAmount || x?.minOrderAmount || 0)
          };
        })
        .filter((x) => !!x.code);
    }

    if (type === 'ROUND_CATEGORIES') {
      const configured = items
        .filter((x) => x?.enabled !== false && String(x?.itemType || '').toUpperCase() === 'LINK')
        .map((x) => ({
          label: String(x?.title || '').trim(),
          slug: String(x?.code || '').trim(),
          imageUrl: this.normalizeImageUrl(String(x?.imageUrl || '').trim())
        }))
        .filter((x) => !!x.slug);

      block.categories =
        configured.length > 0
          ? configured
          : this.flattenCategories(categories)
              .filter((x) => !x.parentId)
              .slice(0, 12)
              .map((x) => ({
                label: String(x.name || '').trim(),
                slug: String(x.slug || '').trim(),
                imageUrl: this.normalizeImageUrl(String(x.imageUrl || '').trim()) || this.resolveCategoryImage(String(x.slug || ''), String(x.name || ''))
              }));
    }

    if (type === 'PRODUCTS') {
      block.productCategorySlugs = items
        .filter((x) => x?.enabled !== false && String(x?.itemType || '').toUpperCase() === 'LINK')
        .map((x) => String(x?.code || '').trim())
        .filter((x) => !!x);
    }

    return block;
  }

  private async hydrateProductBlocks(): Promise<void> {
    const productBlocks = this.blocks.filter((x) => x.enabled && x.type === 'PRODUCTS');
    await Promise.all(
      productBlocks.map(async (block) => {
        block.loadingProducts = true;
        block.products = await this.loadProductsForBlock(block.productCategorySlugs);
        block.loadingProducts = false;
      })
    );
  }

  private async loadProductsForBlock(categorySlugs: string[]): Promise<SaleProduct[]> {
    const slugs = Array.from(new Set((categorySlugs || []).map((x) => String(x || '').trim()).filter(Boolean)));

    try {
      if (slugs.length === 0) {
        const url = `${environment.apiBaseUrl}/api/products/search?sort=newest&page=0&limit=24`;
        const res = await firstValueFrom(this.http.get<ApiResponse<ProductSearchResponse>>(url));
        return this.mapProducts(Array.isArray(res?.data?.data) ? res.data.data : []);
      }

      const responses = await Promise.all(
        slugs.map((slug) => {
          const url = `${environment.apiBaseUrl}/api/products/search?category=${encodeURIComponent(slug)}&sort=newest&page=0&limit=24`;
          return firstValueFrom(this.http.get<ApiResponse<ProductSearchResponse>>(url));
        })
      );

      const all = responses.flatMap((res) => (Array.isArray(res?.data?.data) ? res.data.data : []));
      const dedup = new Map<number, SaleProduct>();
      for (const p of this.mapProducts(all)) {
        if (!dedup.has(p.id)) dedup.set(p.id, p);
      }
      return Array.from(dedup.values());
    } catch {
      return [];
    }
  }

  private mapProducts(rows: ProductSearchResponse['data']): SaleProduct[] {
    return rows
      .map((x) => ({
        id: Number(x.id),
        name: String(x.name || 'Sản phẩm'),
        slug: String(x.slug || ''),
        price: Number(x.price || 0),
        oldPrice: x.oldPrice !== undefined ? Number(x.oldPrice) : undefined,
        imageUrl: x.imageUrl ? this.normalizeImageUrl(String(x.imageUrl)) : this.productPlaceholderImage,
        badge: x.badge ? String(x.badge) : undefined,
        discountPercent: x.discountPercent !== undefined ? Number(x.discountPercent) : undefined,
        rating: x.rating !== undefined ? Number(x.rating) : undefined,
        soldCount: x.soldCount !== undefined ? Number(x.soldCount) : undefined,
        brand: x.brand ? String(x.brand) : undefined
      }))
      .filter((p) => !!p.slug)
      .filter((p) => this.isOnSale(p));
  }

  private isOnSale(p: SaleProduct): boolean {
    if (p.discountPercent && p.discountPercent > 0) return true;
    if (p.oldPrice && p.oldPrice > p.price) return true;
    return false;
  }

  private applyTheme(sections: HomeSectionResponse[]): void {
    const sec = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_THEME');
    const items = Array.isArray(sec?.items) ? sec!.items! : [];
    let fontFamily: string | null = null;
    let primaryColor: string | null = null;

    for (const it of items) {
      const code = String(it?.code || '').trim().toUpperCase();
      if (code === 'FONT_FAMILY') {
        fontFamily = String(it?.title || '').trim() || null;
      }
      if (code === 'PRIMARY_COLOR') {
        primaryColor = String((it as any)?.titleColor || it?.title || '').trim() || null;
      }
    }

    this.saleFontFamily = fontFamily;
    this.salePrimaryColor = primaryColor;
  }

  private setupHeroTimers(): void {
    for (const timer of this.heroTimers.values()) {
      clearInterval(timer);
    }
    this.heroTimers.clear();

    for (const block of this.blocks.filter((x) => x.type === 'HERO' && x.heroSlides.length > 1)) {
      this.activeHeroIndexes[block.id] = 0;
      const timer = setInterval(() => this.nextHero(block), 5000);
      this.heroTimers.set(block.id, timer);
    }
  }

  private defaultTitle(type: SaleBlockType): string {
    if (type === 'HERO') return 'Banner (Hero)';
    if (type === 'VOUCHERS') return 'NHẬN VOUCHER ĐỘC QUYỀN ONLINE';
    if (type === 'ROUND_CATEGORIES') return 'HÔM NAY SALE GÌ?';
    return 'SẢN PHẨM ĐANG GIẢM GIÁ';
  }

  private flattenCategories(rows: CategoryResponse[]): CategoryResponse[] {
    const out: CategoryResponse[] = [];
    const walk = (node: CategoryResponse | null | undefined) => {
      if (!node) return;
      out.push(node);
      (node.children || []).forEach(walk);
    };
    (rows || []).forEach(walk);
    return out;
  }

  private normalizeImageUrl(raw: string): string {
    const v = String(raw || '').trim().replace(/\\/g, '/');
    if (!v) return '';
    if (v.startsWith('data:') || v.startsWith('blob:')) return v;
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    if (v.startsWith('/')) return `${environment.apiBaseUrl}${v}`;
    return `${environment.apiBaseUrl}/${v}`;
  }

  private resolveCategoryImage(slug: string, label: string): string {
    const s = (slug || '').toLowerCase();
    if (s.includes('ao')) return 'https://images.unsplash.com/photo-1520975958225-8c8a552aa9c7?auto=format&fit=crop&w=600&q=80';
    if (s.includes('quan')) return 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80';
    if (s.includes('giay')) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80';
    const q = encodeURIComponent((label || slug || 'fashion').trim());
    return `https://source.unsplash.com/600x600/?${q}`;
  }
}
