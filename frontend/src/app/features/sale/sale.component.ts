import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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

interface HomeSectionItemResponse {
  enabled?: boolean | null;
  itemType?: HomeSectionItemType | null;
  refId?: number | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  route?: string | null;
  code?: string | null;
  note?: string | null;
  buttonText?: string | null;
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

interface CartItem {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

@Component({
  selector: 'app-sale',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sale.component.html',
  styleUrls: ['./sale.component.scss']
})
export class SaleComponent implements OnInit {
  loading = true;
  error = '';
  products: SaleProduct[] = [];

  heroEnabled = true;
  heroLabel = 'SALE ONLINE';
  heroBanners: Array<{ imageUrl: string; alt: string; title: string; titleColor?: string | null; note?: string; noteColor?: string | null; description?: string; buttonText?: string; route?: string | null }> = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1520975958225-8c8a552aa9c7?auto=format&fit=crop&w=2000&q=80',
      alt: 'Sale banner 1',
      title: 'MUA NHIỀU GIẢM NHIỀU',
      titleColor: null,
      note: 'Ưu đãi nổi bật trong hôm nay',
      noteColor: null,
      description: 'Săn sản phẩm đang giảm giá trực tiếp từ hệ thống. Nhận voucher độc quyền và khám phá danh mục bạn quan tâm.',
      buttonText: 'Mua ngay',
      route: null
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1520975732131-0ac7f8d08b9a?auto=format&fit=crop&w=2000&q=80',
      alt: 'Sale banner 2',
      title: 'SALE ONLINE',
      titleColor: null,
      note: 'Deal hời mỗi ngày',
      noteColor: null,
      description: 'Chọn ngay sản phẩm đang giảm và thanh toán nhanh.',
      buttonText: 'Mua ngay',
      route: null
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1521335629791-ce4aec67dd47?auto=format&fit=crop&w=2000&q=80',
      alt: 'Sale banner 3',
      title: 'ƯU ĐÃI HOT',
      titleColor: null,
      note: 'Số lượng có hạn',
      noteColor: null,
      description: 'Ưu tiên sản phẩm có % giảm cao để tối ưu tiết kiệm.',
      buttonText: 'Mua ngay',
      route: null
    }
  ];

  activeHeroIndex = 0;

  categories: Array<{ label: string; slug: string }> = [];
  categoryTiles: Array<{ label: string; slug: string; imageUrl: string }> = [];

  vouchersEnabled = true;
  vouchersTitle = 'NHẬN VOUCHER ĐỘC QUYỀN ONLINE';
  vouchers: Array<{ title: string; code: string; note: string; buttonText: string }> = [];

  categoriesEnabled = true;
  categoriesTitle = 'HÔM NAY SALE GÌ?';

  sectionsNavEnabled = true;
  sectionsNavTitle = 'Menu nhanh';
  sectionsNavItems: Array<{ key: string; title: string; enabled: boolean }> = [];

  featuredTitle = 'Được yêu thích nhất';
  featuredProducts: SaleProduct[] = [];

  hotTitle = 'Sản phẩm hot mỗi ngày';
  hotProducts: SaleProduct[] = [];

  exclusiveTitle = 'Độc quyền online';
  exclusiveProducts: SaleProduct[] = [];

  cartSavingTitle = 'Giỏ hàng tiết kiệm';
  cartSavingLinks: Array<{ title: string; description?: string; imageUrl?: string; route: string; buttonText?: string }> = [];
  cartSavingProducts: SaleProduct[] = [];

  private readonly sectionDefaults: Array<{ key: string; title: string }> = [
    { key: 'FEATURED', title: 'Được yêu thích nhất' },
    { key: 'HOT', title: 'Sản phẩm hot mỗi ngày' },
    { key: 'CART_SAVING', title: 'Giỏ hàng tiết kiệm' },
    { key: 'SALE_VOUCHERS', title: 'Voucher độc quyền online' },
    { key: 'EXCLUSIVE', title: 'Độc quyền online' }
  ];

  private readonly copiedVoucherCodes = new Set<string>();

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadSaleHero();
    this.loadCategories();
    this.loadVouchers();
    this.loadSaleCategoriesConfig();
    this.loadSaleSectionsNav();
    this.loadCuratedSections();
    this.load();
  }

  scrollToSection(key: string): void {
    const k = String(key || '').trim().toUpperCase();
    if (!k) return;
    const el = document.getElementById(this.sectionAnchorId(k));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  isSectionVisible(key: string): boolean {
    const k = String(key || '').trim().toUpperCase();
    if (!k) return false;
    if (!this.isSectionEnabledByConfig(k)) return false;
    if (k === 'SALE_VOUCHERS') return !!this.vouchersEnabled;
    if (k === 'FEATURED') return this.featuredProducts.length > 0;
    if (k === 'HOT') return this.hotProducts.length > 0;
    if (k === 'EXCLUSIVE') return this.exclusiveProducts.length > 0;
    if (k === 'CART_SAVING') return this.cartSavingLinks.length > 0 || this.cartSavingProducts.length > 0;
    return false;
  }

  get visibleNavItems(): Array<{ key: string; title: string; enabled: boolean }> {
    return (this.sectionsNavItems || []).filter((x) => !!x?.enabled).filter((x) => this.isSectionVisible(x.key));
  }

  get orderedSectionKeys(): string[] {
    const order = (this.sectionsNavItems || [])
      .map((x) => String(x?.key || '').trim().toUpperCase())
      .filter((x) => !!x);

    const fallback = this.sectionDefaults.map((x) => x.key);
    const keys = order.length > 0 ? order : fallback;

    const uniq: string[] = [];
    for (const k of keys) {
      if (!uniq.includes(k)) uniq.push(k);
    }
    return uniq.filter((k) => this.isSectionVisible(k));
  }

  sectionTitle(key: string): string {
    const k = String(key || '').trim().toUpperCase();
    const fromCfg = (this.sectionsNavItems || []).find((x) => String(x?.key || '').toUpperCase() === k);
    const def = this.sectionDefaults.find((x) => x.key === k);
    return String(fromCfg?.title || def?.title || k);
  }

  scrollToProducts(): void {
    const el = document.getElementById('sale-products');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  get activeHero(): { imageUrl: string; alt: string; title: string; titleColor?: string | null; note?: string; noteColor?: string | null; description?: string; buttonText?: string; route?: string | null } {
    return this.heroBanners[this.activeHeroIndex] || this.heroBanners[0];
  }

  onHeroCtaClick(): void {
    const route = String(this.activeHero?.route || '').trim();
    if (route) {
      this.router.navigateByUrl(route);
      return;
    }
    this.scrollToProducts();
  }

  onHeroScroll(): void {
    const el = document.getElementById('sale-hero-slider');
    if (!el) return;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    this.activeHeroIndex = Math.min(Math.max(idx, 0), Math.max(0, this.heroBanners.length - 1));
  }

  scrollHeroTo(index: number): void {
    const el = document.getElementById('sale-hero-slider');
    if (!el) return;
    const max = Math.max(0, this.heroBanners.length - 1);
    const target = Math.min(Math.max(index, 0), max);
    const w = el.clientWidth || 1;
    el.scrollTo({ left: target * w, behavior: 'smooth' });
    this.activeHeroIndex = target;
  }

  prevHero(): void {
    this.scrollHeroTo(this.activeHeroIndex - 1);
  }

  nextHero(): void {
    this.scrollHeroTo(this.activeHeroIndex + 1);
  }

  async copyVoucher(code: string): Promise<void> {
    const c = String(code || '').trim();
    if (!c) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(c);
      } else {
        const input = document.createElement('input');
        input.value = c;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      this.copiedVoucherCodes.add(c);
    } catch {
      // ignore
    }
  }

  isVoucherCopied(code: string): boolean {
    return this.copiedVoucherCodes.has(String(code || '').trim());
  }

  private loadVouchers(): void {
    const url = `${environment.apiBaseUrl}/api/home-sections`;
    this.http.get<ApiResponse<HomeSectionResponse[]>>(url).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const vouchersSec = rows.find(
          (x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_VOUCHERS'
        );

        this.vouchersEnabled = vouchersSec ? vouchersSec.enabled !== false : true;
        this.vouchersTitle = String(vouchersSec?.title || this.vouchersTitle);

        if (!this.vouchersEnabled) {
          this.vouchers = [];
          return;
        }

        const items = Array.isArray(vouchersSec?.items) ? vouchersSec!.items! : [];
        const out: Array<{ title: string; code: string; note: string; buttonText: string }> = [];

        for (const it of items) {
          if (!it || it.enabled === false) continue;
          if (String(it.itemType || '').toUpperCase() !== 'COUPON') continue;

          const c = it.coupon || null;
          const code = String((c?.code || it.code || '')).trim();
          if (!code) continue;

          out.push({
            title: String(it.title || c?.description || `Mã: ${code}`),
            code,
            note: String(it.note || it.description || c?.description || ''),
            buttonText: String(it.buttonText || 'Sao chép mã')
          });
        }

        this.vouchers = out;
      },
      error: () => {
        this.vouchersEnabled = true;
        this.vouchers = [];
      }
    });
  }

  private loadSaleHero(): void {
    const url = `${environment.apiBaseUrl}/api/home-sections`;
    this.http.get<ApiResponse<HomeSectionResponse[]>>(url).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const sec = rows.find(
          (x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_HERO'
        );

        this.heroEnabled = sec ? sec.enabled !== false : true;
        this.heroLabel = String(sec?.title || this.heroLabel);

        const items = Array.isArray(sec?.items) ? sec!.items! : [];
        const out: Array<{ imageUrl: string; alt: string; title: string; titleColor?: string | null; note?: string; noteColor?: string | null; description?: string; buttonText?: string; route?: string | null }> = [];

        for (const it of items) {
          if (!it || it.enabled === false) continue;
          if (String(it.itemType || '').toUpperCase() !== 'LINK') continue;
          const img = this.normalizeImageUrl(String(it.imageUrl || '').trim());
          if (!img) continue;
          out.push({
            imageUrl: img,
            alt: String(it.title || 'Sale banner'),
            title: String(it.title || 'Trang Sale'),
            titleColor: (it as any)?.titleColor ?? null,
            note: (it as any)?.note ? String((it as any).note) : undefined,
            noteColor: (it as any)?.noteColor ?? null,
            description: it.description ? String(it.description) : undefined,
            buttonText: it.buttonText ? String(it.buttonText) : undefined,
            route: it.route ? String(it.route) : null
          });
        }

        if (out.length > 0) {
          this.heroBanners = out;
          this.activeHeroIndex = 0;
          this.scrollHeroTo(0);
        }
      },
      error: () => {
        this.heroEnabled = true;
        // ignore
      }
    });
  }

  private loadSaleCategoriesConfig(): void {
    const url = `${environment.apiBaseUrl}/api/home-sections`;
    this.http.get<ApiResponse<HomeSectionResponse[]>>(url).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const sec = rows.find(
          (x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_CATEGORIES'
        );

        this.categoriesEnabled = sec ? sec.enabled !== false : true;
        this.categoriesTitle = String(sec?.title || this.categoriesTitle);
      },
      error: () => {
        this.categoriesEnabled = true;
      }
    });
  }

  private loadCategories(): void {
    const url = `${environment.apiBaseUrl}/api/categories/tree`;
    this.http.get<ApiResponse<CategoryResponse[]>>(url).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];

        const all = this.flattenCategories(rows);
        const uniq = new Map<string, CategoryResponse>();
        for (const c of all) {
          const slug = String(c?.slug || '').trim();
          if (!slug) continue;
          if (!uniq.has(slug)) uniq.set(slug, c);
        }
        const allUnique = Array.from(uniq.values());

        const rootButtons = rows
          .filter((x) => !!x?.slug && !!x?.name)
          .map((x) => ({ slug: String(x.slug), label: String(x.name) }))
          .slice(0, 18);

        this.categories = rootButtons;

        this.categoryTiles = allUnique
          .filter((x) => !!x?.slug && !!x?.name)
          .map((x) => {
            const slug = String(x.slug);
            const label = String(x.name);
            const apiImage = x.imageUrl ? String(x.imageUrl) : '';
            const normalizedApiImage = this.normalizeImageUrl(apiImage);
            const imageUrl = normalizedApiImage || this.resolveCategoryImage(slug, label);
            return { slug, label, imageUrl };
          });
      },
      error: () => {
        this.categories = [];
        this.categoryTiles = [];
      }
    });
  }

  private flattenCategories(rows: CategoryResponse[]): CategoryResponse[] {
    const out: CategoryResponse[] = [];
    const visit = (node: CategoryResponse | null | undefined) => {
      if (!node) return;
      out.push(node);

      const anyNode = node as any;
      const childrenCandidates = [
        anyNode.children,
        anyNode.childrens,
        anyNode.subCategories,
        anyNode.subcategories,
        anyNode.items
      ];

      for (const candidate of childrenCandidates) {
        if (!Array.isArray(candidate)) continue;
        for (const ch of candidate) visit(ch as CategoryResponse);
      }
    };
    for (const r of rows) visit(r);
    return out;
  }

  private normalizeImageUrl(raw: string): string {
    const v = String(raw || '').trim();
    if (!v) return '';
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    if (v.startsWith('//')) return `https:${v}`;
    if (v.startsWith('/')) return `${environment.apiBaseUrl}${v}`;
    return v;
  }

  private resolveCategoryImage(slug: string, label: string): string {
    const s = (slug || '').toLowerCase();
    if (s.includes('ao')) return 'https://images.unsplash.com/photo-1520975958225-8c8a552aa9c7?auto=format&fit=crop&w=600&q=80';
    if (s.includes('quan')) return 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80';
    if (s.includes('giay') || s.includes('shoe')) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80';
    if (s.includes('tui') || s.includes('bag')) return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80';
    const q = encodeURIComponent((label || slug || 'fashion').trim());
    return `https://source.unsplash.com/600x600/?${q}`;
  }

  scrollCategory(dir: 'left' | 'right'): void {
    const el = document.getElementById('sale-category-scroll');
    if (!el) return;
    const step = Math.max(240, Math.round(el.clientWidth * 0.85));
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  }

  onCategoryTileImageError(tile: { label: string; slug: string; imageUrl: string }): void {
    if (!tile) return;
    const fallback = this.resolveCategoryImage(tile.slug, tile.label);
    if (tile.imageUrl !== fallback) {
      tile.imageUrl = fallback;
      return;
    }
    tile.imageUrl = 'https://via.placeholder.com/600x600?text=Category';
  }

  private loadSaleSectionsNav(): void {
    const url = `${environment.apiBaseUrl}/api/home-sections`;
    this.http.get<ApiResponse<HomeSectionResponse[]>>(url).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const sec = rows.find((x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_SECTIONS');

        this.sectionsNavEnabled = sec ? sec.enabled !== false : true;
        this.sectionsNavTitle = String(sec?.title || this.sectionsNavTitle);

        const items = Array.isArray(sec?.items) ? sec!.items! : [];
        const out: Array<{ key: string; title: string; enabled: boolean }> = [];
        for (const it of items) {
          if (!it) continue;
          if (String(it.itemType || '').toUpperCase() !== 'LINK') continue;
          const key = String((it as any)?.code || '').trim().toUpperCase();
          if (!key) continue;
          out.push({
            key,
            title: String(it.title || key),
            enabled: it.enabled !== false
          });
        }
        if (out.length > 0) {
          this.sectionsNavItems = out;
        } else {
          this.sectionsNavItems = this.sectionDefaults.map((x) => ({ key: x.key, title: x.title, enabled: true }));
        }
      },
      error: () => {
        this.sectionsNavEnabled = true;
        this.sectionsNavItems = this.sectionDefaults.map((x) => ({ key: x.key, title: x.title, enabled: true }));
      }
    });
  }

  private loadCuratedSections(): void {
    const url = `${environment.apiBaseUrl}/api/home-sections`;
    this.http.get<ApiResponse<HomeSectionResponse[]>>(url).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const byKey = new Map<string, HomeSectionResponse>();
        for (const s of rows) {
          const k = String(s?.sectionKey || '').toUpperCase();
          if (!k) continue;
          byKey.set(k, s);
        }

        const mapProduct = (p: any): SaleProduct | null => {
          if (!p) return null;
          const id = Number(p?.id || 0);
          const slug = String(p?.slug || '').trim();
          if (!id || !slug) return null;
          return {
            id,
            name: String(p?.name || 'Sản phẩm'),
            slug,
            price: Number(p?.price || 0),
            oldPrice: p?.oldPrice !== undefined ? Number(p.oldPrice) : undefined,
            imageUrl: p?.imageUrl ? String(p.imageUrl) : undefined,
            badge: p?.badge ? String(p.badge) : undefined,
            discountPercent: p?.discountPercent !== undefined ? Number(p.discountPercent) : undefined,
            rating: p?.rating !== undefined ? Number(p.rating) : undefined,
            soldCount: p?.soldCount !== undefined ? Number(p.soldCount) : undefined,
            brand: p?.brand ? String(p.brand) : undefined
          };
        };

        const mapProductItems = (sec?: HomeSectionResponse | null): SaleProduct[] => {
          const items = Array.isArray(sec?.items) ? sec!.items! : [];
          const out: SaleProduct[] = [];
          for (const it of items) {
            if (!it || it.enabled === false) continue;
            if (String(it.itemType || '').toUpperCase() !== 'PRODUCT') continue;
            const prod = mapProduct((it as any)?.product);
            if (prod) out.push(prod);
          }
          return out;
        };

        this.featuredProducts = mapProductItems(byKey.get('FEATURED')).slice(0, 8);
        this.hotProducts = mapProductItems(byKey.get('HOT')).slice(0, 8);
        this.exclusiveProducts = mapProductItems(byKey.get('EXCLUSIVE')).slice(0, 8);

        const cartSaving = byKey.get('CART_SAVING');
        const cartItems = Array.isArray(cartSaving?.items) ? cartSaving!.items! : [];
        const links: Array<{ title: string; description?: string; imageUrl?: string; route: string; buttonText?: string }> = [];
        const prods: SaleProduct[] = [];
        for (const it of cartItems) {
          if (!it || it.enabled === false) continue;
          const t = String(it.itemType || '').toUpperCase();
          if (t === 'LINK') {
            const route = String(it.route || '').trim();
            const title = String(it.title || '').trim();
            if (!route || !title) continue;
            links.push({
              title,
              description: it.description ? String(it.description) : undefined,
              imageUrl: it.imageUrl ? this.normalizeImageUrl(String(it.imageUrl)) : undefined,
              route,
              buttonText: it.buttonText ? String(it.buttonText) : undefined
            });
          }
          if (t === 'PRODUCT') {
            const prod = mapProduct((it as any)?.product);
            if (prod) prods.push(prod);
          }
        }
        this.cartSavingLinks = links;
        this.cartSavingProducts = prods.slice(0, 8);
      },
      error: () => {
        this.featuredProducts = [];
        this.hotProducts = [];
        this.exclusiveProducts = [];
        this.cartSavingLinks = [];
        this.cartSavingProducts = [];
      }
    });
  }

  private sectionAnchorId(key: string): string {
    return `sale-sec-${String(key || '').trim().toUpperCase()}`;
  }

  private isSectionEnabledByConfig(key: string): boolean {
    const k = String(key || '').trim().toUpperCase();
    if (!k) return false;
    const it = (this.sectionsNavItems || []).find((x) => String(x?.key || '').trim().toUpperCase() === k);
    return it ? it.enabled !== false : true;
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.products = [];

    const url = `${environment.apiBaseUrl}/api/products/search?sort=newest&page=0&limit=80`;
    this.http.get<ApiResponse<ProductSearchResponse>>(url).subscribe({
      next: (res) => {
        const rows = res?.data?.data;
        const items = Array.isArray(rows) ? rows : [];

        this.products = items
          .map((x) => ({
            id: Number(x.id),
            name: String(x.name || 'Sản phẩm'),
            slug: String(x.slug || ''),
            price: Number(x.price || 0),
            oldPrice: x.oldPrice !== undefined ? Number(x.oldPrice) : undefined,
            imageUrl: x.imageUrl ? String(x.imageUrl) : undefined,
            badge: x.badge ? String(x.badge) : undefined,
            discountPercent: x.discountPercent !== undefined ? Number(x.discountPercent) : undefined,
            rating: x.rating !== undefined ? Number(x.rating) : undefined,
            soldCount: x.soldCount !== undefined ? Number(x.soldCount) : undefined,
            brand: x.brand ? String(x.brand) : undefined
          }))
          .filter((p) => !!p.slug)
          .filter((p) => this.isOnSale(p));

        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        if (err?.status === 0) {
          this.error = 'Không thể kết nối backend để tải danh sách Sale.';
          return;
        }
        this.error = err?.error?.message || err?.message || 'Không thể tải danh sách Sale.';
      }
    });
  }

  isOnSale(p: SaleProduct): boolean {
    if (p.discountPercent && p.discountPercent > 0) return true;
    if (p.oldPrice && p.oldPrice > p.price) return true;
    return false;
  }

  getDiscountLabel(p: SaleProduct): string {
    if (p.discountPercent && p.discountPercent > 0) return `-${p.discountPercent}%`;
    if (p.oldPrice && p.oldPrice > p.price && p.oldPrice > 0) {
      const pct = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
      return pct > 0 ? `-${pct}%` : '';
    }
    return '';
  }

  formatMoney(v: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(v));
  }

  addToCart(p: SaleProduct): void {
    const item: CartItem = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      imageUrl: p.imageUrl,
      price: Number(p.price || 0),
      quantity: 1
    };

    const cart = this.readCart();
    const idx = cart.findIndex((x) => x.id === item.id && (x.size || '') === '' && (x.color || '') === '');

    if (idx >= 0) {
      cart[idx] = { ...cart[idx], quantity: Math.min(99, (cart[idx].quantity || 1) + 1) };
    } else {
      cart.push(item);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
  }

  buyNow(p: SaleProduct): void {
    this.addToCart(p);
    this.router.navigateByUrl('/checkout');
  }

  goToProduct(p: SaleProduct): void {
    this.router.navigate(['/product', p.slug]);
  }

  private readCart(): CartItem[] {
    try {
      const raw = localStorage.getItem('cart');
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      if (!Array.isArray(arr)) return [];
      return arr
        .map((x) => x as Partial<CartItem>)
        .filter((x) => typeof x.id === 'number' && typeof x.price === 'number')
        .map((x) => ({
          id: x.id!,
          name: x.name || 'Sản phẩm',
          slug: x.slug || '',
          imageUrl: x.imageUrl,
          price: x.price!,
          quantity: typeof x.quantity === 'number' && x.quantity > 0 ? x.quantity : 1,
          size: x.size,
          color: x.color
        }));
    } catch {
      return [];
    }
  }
}
