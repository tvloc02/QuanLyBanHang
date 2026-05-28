import { CommonModule } from '@angular/common';
import { Component, OnInit, DestroyRef } from '@angular/core';
import { HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HOME_CONFIG, HomeSectionId } from '../home/home.config';
import { FooterComponent } from '../../shared/footer/footer.component';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  priceText: string;
  imageUrl: string;
  badge?: string;
  discount?: number;
  rating?: number;
  soldCount?: number;
  category?: string;
  subCategory?: string;
  target?: 'Nữ' | 'Nam' | 'Khác';
  brand?: string;
  sizes?: string[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  parentId?: number | null;
  children?: CategoryNode[];
}

interface HomeSectionItemResponse {
  enabled?: boolean | null;
  itemType?: 'PRODUCT' | 'COUPON' | 'NEWS' | 'LINK' | null;
  refId?: number | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  route?: string | null;
  code?: string | null;
  note?: string | null;
  buttonText?: string | null;
  coupon?: any;
}

interface HomeSectionResponse {
  sectionKey?: string | null;
  title?: string | null;
  enabled?: boolean | null;
  items?: HomeSectionItemResponse[] | null;
}

interface ProductSearchData {
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
    category?: string;
    brand?: string;
    sizes?: string[];
    colors?: string[];
  }>;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface Filter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  sizes?: string[];
  subCategories?: string[];
  targets?: Array<'Nữ' | 'Nam' | 'Khác'>;
  sort?: 'price-asc' | 'price-desc' | 'newest' | 'bestselling';
  page?: number;
  limit?: number;
}

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FooterComponent],
  templateUrl: './category-detail.component.html',
  styleUrls: ['./category-detail.component.scss']
})
export class CategoryDetailComponent implements OnInit {
  readonly Math = Math;
  readonly cfg = HOME_CONFIG;
  readonly productFallbackImage =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 760'>" +
        "<rect width='600' height='760' fill='#f3f4f6'/>" +
        "<rect x='110' y='120' width='380' height='360' rx='24' fill='#e5e7eb'/>" +
        "<circle cx='300' cy='250' r='64' fill='#cbd5e1'/>" +
        "<path d='M185 540h230' stroke='#d1d5db' stroke-width='28' stroke-linecap='round'/>" +
        "<path d='M220 605h160' stroke='#e5e7eb' stroke-width='22' stroke-linecap='round'/>" +
      "</svg>"
    );
  accountOpen = false;

  wishlistCount = 0;
  cartCount = 0;

  showScrollTop = false;

  searchQuery = '';
  showSearchSuggest = false;
  searchSuggest: Array<{ label: string; route: string }> = [];
  activeSuggestIndex = -1;

  products: Product[] = [];
  loading = true;
  error = '';
  categorySlug = '';
  categoryName = '';
  categoryRootId: number | null = null;
  categoryLevel = 0;

  categoryHeroEnabled = false;
  categoryHeroBanners: Array<{ imageUrl: string; alt: string }> = [];
  categoryVouchersEnabled = false;
  categoryVouchersTitle = 'Voucher danh mục';
  categoryVouchers: Array<{ title: string; code: string; note: string; minOrderAmount: number }> = [];
  categoryRoundCategoriesEnabled = false;
  categoryRoundCategoriesTitle = 'Danh mục nổi bật';
  categoryProductsEnabled = false;
  configuredProductsTitle = '';
  rootRoundCategories: Array<{ id: number; name: string; slug: string; imageUrl: string; initial: string }> = [];

  get isRootCategoryPage(): boolean {
    return this.categoryLevel === 0;
  }

  private categoryNameCache = new Map<string, string>();

  // Filters
  filters: Filter = { page: 1, limit: 20 };
  minPrice = 0;
  maxPrice = 3000000;
  readonly priceMax = 3000000;
  selectedSizes: string[] = [];
  selectedSubCategories: string[] = [];
  selectedTargets: Array<'Nữ' | 'Nam' | 'Khác'> = [];
  selectedColors: string[] = [];
  sortBy: Filter['sort'] = 'newest';

  // Pagination
  total = 0;
  totalPages = 0;
  currentPage = 1;

  // Mock data for sizes/colors
  allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  allColors = ['#000000', '#2e7d32', '#f9a8d4', '#7c3aed', '#6b7280', '#f59e0b', '#fef9c3', '#2563eb'];

  priceSteps = Array.from({ length: 7 }, (_, i) => i * 500000);

  allSubCategories = ['Dép đế cao', 'Sandals đế bệt', 'Bốt', 'Sandals đế cao'];

  allTargets: Array<'Nữ' | 'Nam' | 'Khác'> = ['Nữ', 'Nam', 'Khác'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.hydrateBadges();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.categorySlug = params.get('slug') || '';
      this.filters.category = this.categorySlug;
      this.loadCategoryInfo();
      this.loadProducts();
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showScrollTop = window.scrollY > 500;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.accountOpen = false;
    this.showSearchSuggest = false;
  }

  private hydrateBadges(): void {
    // Demo counts: try to derive from localStorage if available
    try {
      const wishlistRaw = localStorage.getItem('wishlist');
      const cartRaw = localStorage.getItem('cart');
      const wishlist = wishlistRaw ? JSON.parse(wishlistRaw) : [];
      const cart = cartRaw ? JSON.parse(cartRaw) : [];
      this.wishlistCount = Array.isArray(wishlist) ? wishlist.length : 0;
      this.cartCount = Array.isArray(cart) ? cart.length : 0;
    } catch {
      this.wishlistCount = 0;
      this.cartCount = 0;
    }
  }

  toggleAccount(): void {
    this.accountOpen = !this.accountOpen;
  }

  closeAccount(): void {
    this.accountOpen = false;
  }

  go(route: string): void {
    this.closeAccount();
    this.router.navigateByUrl(route);
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.activeSuggestIndex = -1;
    const q = value.trim().toLowerCase();
    if (!q) {
      this.searchSuggest = [];
      return;
    }
    const items = this.getSearchIndex();
    const seen = new Set<string>();
    this.searchSuggest = items
      .filter((x) => x.label.toLowerCase().includes(q))
      .filter((x) => {
        const k = x.route;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 8);
  }

  onSearchFocus(): void {
    this.showSearchSuggest = true;
    if (this.searchQuery) {
      this.onSearchInput(this.searchQuery);
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (!this.showSearchSuggest || this.searchSuggest.length === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.submitSearch();
      }
      return;
    }

    const max = this.searchSuggest.length - 1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeSuggestIndex = Math.min(max, this.activeSuggestIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeSuggestIndex = Math.max(0, this.activeSuggestIndex - 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.activeSuggestIndex >= 0) {
        this.selectSuggestion(this.searchSuggest[this.activeSuggestIndex].route);
      } else {
        this.submitSearch();
      }
      return;
    }
    if (event.key === 'Tab') {
      if (this.activeSuggestIndex >= 0) {
        event.preventDefault();
        this.selectSuggestion(this.searchSuggest[this.activeSuggestIndex].route);
      }
    }
  }

  selectSuggestion(route: string): void {
    this.showSearchSuggest = false;
    this.activeSuggestIndex = -1;
    this.router.navigateByUrl(route);
  }

  submitSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) return;
    const slug = q
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    this.showSearchSuggest = false;
    this.router.navigateByUrl(`/category/${slug}`);
  }

  private getSearchIndex(): Array<{ label: string; route: string }> {
    const fromQuick = (this.cfg.quickTiles || []).map((x) => ({ label: x.label, route: x.route }));
    const fromGroups = this.cfg.categoryGroups.flatMap((g) => g.items).map((x) => ({ label: x.label, route: x.route }));
    return [...fromQuick, ...fromGroups];
  }

  onNavClick(item: { sectionId?: HomeSectionId; route?: string }): void {
    if (item.route) {
      this.router.navigateByUrl(item.route);
      return;
    }

    if (!item.sectionId) return;

    // Navigate back to Sale and scroll to target section
    this.router.navigateByUrl('/sale').then(() => {
      // Allow Home to render first
      window.setTimeout(() => {
        const el = document.getElementById(item.sectionId as string);
        if (!el) return;
        const header = document.querySelector('.header') as HTMLElement | null;
        const headerOffset = (header?.offsetHeight ?? 0) + 10;
        const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }, 50);
    });
  }

  private loadCategoryInfo(): void {
    const slug = String(this.categorySlug || '').trim();
    if (!slug) {
      this.categoryName = '';
      return;
    }

    const cached = this.categoryNameCache.get(slug);
    if (cached) {
      this.categoryName = cached;
    }

    const pretty = slug
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    this.categoryName = pretty;

    const url = `${environment.apiBaseUrl}/api/categories/tree`;
    this.http
      .get<ApiResponse<CategoryNode[]>>(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          const context = this.findCategoryContextBySlug(rows, slug);
          this.categoryLevel = Number(context.level || 0);
          if (context.name) {
            this.categoryNameCache.set(slug, context.name);
            this.categoryName = context.name;
          }
          if (context.rootId) {
            this.categoryRootId = context.rootId;
            this.rootRoundCategories = this.categoryLevel === 0
              ? []
              : this.buildRootRoundCategories(rows, context.rootId, false);
            this.loadCategorySections(context.rootId);
          }
        },
        error: () => {
          // keep fallback pretty name
          this.categoryLevel = 0;
          this.rootRoundCategories = [];
        }
      });
  }

  private findCategoryContextBySlug(nodes: CategoryNode[], slug: string): { name: string; rootId: number | null; level: number } {
    const all = this.flattenCategories(nodes);
    const byId = new Map<number, CategoryNode>();
    for (const node of all) {
      if (node?.id) byId.set(node.id, node);
    }

    const target = all.find((node) => String(node?.slug || '').trim() === String(slug || '').trim()) || null;
    if (!target) {
      return { name: '', rootId: null, level: 0 };
    }

    let current: CategoryNode | null = target;
    let level = 0;
    while (current && current.parentId != null && byId.has(Number(current.parentId))) {
      current = byId.get(Number(current.parentId)) || current;
      level += 1;
      if (current.parentId == null) break;
    }

    return {
      name: String(target.name || '').trim(),
      rootId: current?.id ?? target.id ?? null,
      level
    };
  }

  private findCategoryNameBySlug(nodes: CategoryNode[], slug: string): string {
    const target = String(slug || '').trim();
    if (!target) return '';

    const stack: CategoryNode[] = Array.isArray(nodes) ? [...nodes] : [];
    while (stack.length) {
      const n = stack.shift();
      if (!n) continue;
      if (String(n.slug || '').trim() === target) return String(n.name || '').trim();
      const kids = Array.isArray(n.children) ? n.children : [];
      stack.unshift(...kids);
    }
    return '';
  }

  private flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
    const out: CategoryNode[] = [];
    const walk = (node: CategoryNode) => {
      if (!node) return;
      out.push(node);
      (node.children || []).forEach(walk);
    };
    (nodes || []).forEach(walk);
    return out;
  }

  private buildRootRoundCategories(
    nodes: CategoryNode[],
    rootId: number,
    isRootPage: boolean
  ): Array<{ id: number; name: string; slug: string; imageUrl: string; initial: string }> {
    if (!isRootPage || !rootId) return [];

    const root = this.flattenCategories(nodes).find((node) => Number(node?.id) === Number(rootId));
    const children = Array.isArray(root?.children) ? root!.children! : [];

    return children
      .filter((child) => !!child?.id && !!String(child?.slug || '').trim())
      .map((child) => ({
        id: Number(child.id),
        name: String(child.name || '').trim(),
        slug: String(child.slug || '').trim(),
        imageUrl: this.normalizeImageUrl(String(child.imageUrl || '').trim()),
        initial: String(child.name || '?').trim().charAt(0).toUpperCase()
      }));
  }

  private loadCategorySections(rootId: number): void {
    const url = `${environment.apiBaseUrl}/api/home-sections`;
    this.http
      .get<ApiResponse<HomeSectionResponse[]>>(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          const hero = rows.find((x) => String(x?.sectionKey || '').toUpperCase() === `CATEGORY_${rootId}_HERO`);
          const vouchers = rows.find((x) => String(x?.sectionKey || '').toUpperCase() === `CATEGORY_${rootId}_VOUCHERS`);
          const categories = rows.find((x) => String(x?.sectionKey || '').toUpperCase() === `CATEGORY_${rootId}_CATEGORIES`);
          const products = rows.find((x) => String(x?.sectionKey || '').toUpperCase() === `CATEGORY_${rootId}_PRODUCTS`);

          this.categoryHeroEnabled = this.isRootCategoryPage && !!hero && hero.enabled !== false;
          const heroItems = Array.isArray(hero?.items) ? hero!.items! : [];
          this.categoryHeroBanners = heroItems
            .filter((item) => item?.enabled !== false && String(item?.itemType || '').toUpperCase() === 'LINK')
            .map((item) => ({
              imageUrl: this.normalizeImageUrl(String(item?.imageUrl || '').trim()),
              alt: String(item?.title || this.categoryName || 'Category banner')
            }))
            .filter((item) => !!item.imageUrl);

          this.categoryVouchersEnabled = this.isRootCategoryPage && !!vouchers && vouchers.enabled !== false;
          this.categoryVouchersTitle = String(vouchers?.title || 'Voucher danh mục');
          const voucherItems = Array.isArray(vouchers?.items) ? vouchers!.items! : [];
          this.categoryVouchers = voucherItems
            .filter((item) => item?.enabled !== false && String(item?.itemType || '').toUpperCase() === 'COUPON')
            .map((item) => ({
              title: String(item?.title || item?.coupon?.description || 'Voucher'),
              code: String(item?.coupon?.code || item?.code || ''),
              note: String(item?.note || item?.description || ''),
              minOrderAmount: Number(item?.coupon?.minOrderAmount || item?.coupon?.minimumOrder || 0)
            }))
            .filter((item) => !!item.code);

          this.categoryRoundCategoriesEnabled = this.isRootCategoryPage && !!categories && categories.enabled !== false;
          this.categoryRoundCategoriesTitle = String(categories?.title || 'Danh mục nổi bật');
          const categoryItems = Array.isArray(categories?.items) ? categories!.items! : [];
          this.rootRoundCategories = this.categoryRoundCategoriesEnabled
            ? categoryItems
                .filter((item) => item?.enabled !== false && String(item?.itemType || '').toUpperCase() === 'LINK')
                .map((item) => {
                  const slug = String(item?.code || item?.route || '')
                    .replace(/^\/category\//i, '')
                    .trim();
                  const label = String(item?.title || '').trim();
                  return {
                    id: Number(item?.refId || 0),
                    name: label,
                    slug,
                    imageUrl: this.normalizeImageUrl(String(item?.imageUrl || '').trim()),
                    initial: (label || '?').charAt(0).toUpperCase()
                  };
                })
                .filter((item) => !!item.slug && !!item.name)
            : [];

          this.categoryProductsEnabled = this.isRootCategoryPage && !!products && products.enabled !== false;
          this.configuredProductsTitle = this.isRootCategoryPage ? String(products?.title || '').trim() : '';
        },
        error: () => {
          this.categoryHeroEnabled = false;
          this.categoryHeroBanners = [];
          this.categoryVouchersEnabled = false;
          this.categoryVouchers = [];
          this.categoryRoundCategoriesEnabled = false;
          this.categoryRoundCategoriesTitle = 'Danh mục nổi bật';
          this.rootRoundCategories = [];
          this.categoryProductsEnabled = false;
          this.configuredProductsTitle = '';
        }
      });
  }

  copyVoucher(code: string): void {
    const value = String(code || '').trim();
    if (!value) return;
    navigator.clipboard.writeText(value).catch(() => undefined);
  }

  scrollTrack(el: HTMLElement | null | undefined, dx: number): void {
    if (!el) return;
    el.scrollBy({ left: Number(dx || 0), behavior: 'smooth' });
  }

  private normalizeImageUrl(raw: string): string {
    const url = String(raw || '').trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
    return `${environment.apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private loadProducts(): void {
    this.loading = true;
    this.error = '';

    // Build query string from filters
    const params = new URLSearchParams();
    if (this.filters.category) params.set('category', this.filters.category);
    if (this.filters.minPrice !== undefined) params.set('minPrice', String(this.filters.minPrice));
    if (this.filters.maxPrice !== undefined) params.set('maxPrice', String(this.filters.maxPrice));
    if (this.filters.colors?.length) params.set('colors', this.filters.colors.join(','));
    if (this.filters.sizes?.length) params.set('sizes', this.filters.sizes.join(','));
    if (this.filters.subCategories?.length) params.set('subCategories', this.filters.subCategories.join(','));
    if (this.filters.targets?.length) params.set('targets', this.filters.targets.join(','));
    if (this.filters.sort) params.set('sort', this.filters.sort);
    params.set('page', String((this.filters.page || 1) - 1));
    params.set('limit', String(this.filters.limit || 20));

    const url = `${environment.apiBaseUrl}/api/products/search?${params.toString()}`;
    this.http.get<ApiResponse<ProductSearchData>>(url).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải sản phẩm.';
          this.loading = false;
          return;
        }

        const payload = res.data;
        const items = payload?.data || [];

        this.products = items.map((p) => {
          const discount = p.discountPercent ?? undefined;
          // Use placeholder image if no imageUrl - use a better looking placeholder
          const imageUrl = this.normalizeImageUrl(p.imageUrl || '') || this.productFallbackImage;

          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            oldPrice: p.oldPrice || (discount ? Math.round(p.price / (1 - discount / 100)) : undefined),
            priceText: `${new Intl.NumberFormat('vi-VN').format(p.price)}đ`,
            imageUrl,
            badge: p.badge || undefined,
            discount,
            rating: (p.rating as unknown as number) || undefined,
            soldCount: p.soldCount || undefined,
            category: p.category || undefined,
            brand: p.brand || undefined,
            sizes: p.sizes || undefined,
            colors: p.colors || undefined
          };
        });

        this.total = payload?.total || 0;
        this.totalPages = payload?.totalPages || 0;
        this.currentPage = (payload?.page ?? 0) + 1;
        this.loading = false;
      },
      error: () => {
        // Fallback mock data if backend not ready
        this.loadMockData();
        this.loading = false;
      }
    });
  }

  private loadMockData(): void {
    const mockProducts: Product[] = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Sản phẩm ${this.categoryName} ${i + 1}`,
      slug: `san-pham-${i + 1}`,
      price: Math.floor(Math.random() * 900000) + 100000,
      oldPrice: Math.floor(Math.random() * 900000) + 300000,
      priceText: `${new Intl.NumberFormat('vi-VN').format(Math.floor(Math.random() * 900000) + 100000)}đ`,
      imageUrl: `https://picsum.photos/seed/product${i + 1}/300/400.jpg`,
      badge: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'Hot' : 'New') : undefined,
      discount: Math.random() > 0.6 ? Math.floor(Math.random() * 30) + 5 : undefined,
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
      soldCount: Math.floor(Math.random() * 1000) + 10,
      category: this.categoryName,
      subCategory: this.allSubCategories[Math.floor(Math.random() * this.allSubCategories.length)],
      target: this.allTargets[Math.floor(Math.random() * this.allTargets.length)],
      brand: ['FashionHub', 'Urban', 'Classic', 'Trendy'][Math.floor(Math.random() * 4)],
      sizes: this.allSizes.slice(0, Math.floor(Math.random() * 4) + 2)
    }));
    this.products = mockProducts;
    this.total = mockProducts.length;
    this.totalPages = 1;
    this.currentPage = 1;
  }

  onPriceRangeChange(): void {
    if (this.minPrice > this.maxPrice) {
      const tmp = this.minPrice;
      this.minPrice = this.maxPrice;
      this.maxPrice = tmp;
    }
    this.filters.minPrice = this.minPrice;
    this.filters.maxPrice = this.maxPrice;
    this.applyFilters();
  }

  resetPrice(): void {
    this.minPrice = 0;
    this.maxPrice = this.priceMax;
    this.onPriceRangeChange();
  }

  onColorChange(color: string, checked: boolean): void {
    if (checked) {
      this.selectedColors = [...this.selectedColors, color];
    } else {
      this.selectedColors = this.selectedColors.filter(c => c !== color);
    }
    this.filters.colors = this.selectedColors.length ? this.selectedColors : undefined;
    this.applyFilters();
  }

  onSizeChange(size: string, checked: boolean): void {
    if (checked) {
      this.selectedSizes = [...this.selectedSizes, size];
    } else {
      this.selectedSizes = this.selectedSizes.filter(s => s !== size);
    }
    this.filters.sizes = this.selectedSizes.length ? this.selectedSizes : undefined;
    this.applyFilters();
  }

  onSubCategoryChange(subCategory: string, checked: boolean): void {
    if (checked) {
      this.selectedSubCategories = [...this.selectedSubCategories, subCategory];
    } else {
      this.selectedSubCategories = this.selectedSubCategories.filter(c => c !== subCategory);
    }
    this.filters.subCategories = this.selectedSubCategories.length ? this.selectedSubCategories : undefined;
    this.applyFilters();
  }

  onTargetChange(target: 'Nữ' | 'Nam' | 'Khác', checked: boolean): void {
    if (checked) {
      this.selectedTargets = [...this.selectedTargets, target];
    } else {
      this.selectedTargets = this.selectedTargets.filter(t => t !== target);
    }
    this.filters.targets = this.selectedTargets.length ? this.selectedTargets : undefined;
    this.applyFilters();
  }

  formatPriceOption(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  onSortChange(sort: Filter['sort']): void {
    this.sortBy = sort;
    this.filters.sort = sort;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filters.page = 1;
    this.currentPage = 1;
    this.loadProducts();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.filters.page = page;
    this.currentPage = page;
    this.loadProducts();
  }

  goToProduct(slug: string): void {
    this.router.navigate(['/product', slug]);
  }

  onProductImageError(product: Product): void {
    if (!product) return;
    product.imageUrl = this.productFallbackImage;
  }

  // Helper for pagination UI
  getVisiblePages(): number[] {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: number[] = [];
    let l: number | undefined;

    for (let i = 1; i <= this.totalPages; i++) {
      if (i === 1 || i === this.totalPages || (i >= this.currentPage - delta && i <= this.currentPage + delta)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          // placeholder for dots - skip for simplicity
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  }
}




