import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { HOME_CONFIG, HomeCardProduct, HomeSectionId, HomeNewsItem, HomeVoucherConfig } from './home.config';
import { environment } from '../../../environments/environment';
import { FooterComponent } from '../../shared/footer/footer.component';
import { Observable, map } from 'rxjs';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
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
  }>;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
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

interface CartSavingLink {
  title: string;
  description?: string;
  imageUrl?: string;
  route: string;
  buttonText?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit, OnInit {
  readonly cfg = HOME_CONFIG;

  private readonly apiBaseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  featuredProducts: HomeCardProduct[] = [];
  hotProducts: HomeCardProduct[] = [];
  exclusiveProducts: HomeCardProduct[] = [];

  vouchersTitle = this.cfg.vouchersTitle;
  vouchers: HomeVoucherConfig[] = this.cfg.vouchers;

  newsTitle = this.cfg.newsTitle;
  newsItems: HomeNewsItem[] = this.cfg.news;

  cartSavingTitle = 'Giỏ hàng tiết kiệm';
  cartSavingLinks: CartSavingLink[] = [];
  cartSavingProducts: HomeCardProduct[] = [];

  loadingProducts = false;

  private readonly claimedVoucherCodes = new Set<string>();

  activeSection: HomeSectionId = 'hero';

  accountOpen = false;
  cartCount = 0;
  wishlistCount = 0;

  showScrollTop = false;

  searchQuery = '';
  showSearchSuggest = false;
  searchSuggest: Array<{ label: string; route: string }> = [];
  activeSuggestIndex = -1;

  @ViewChild('categoryScroll') categoryScroll!: ElementRef;

  quickTilesPageCount = 1;
  quickTilesActivePage = 0;
  quickTilesPages: number[] = [0];

  constructor(private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.applyTheme();
    this.loadClaimedVouchers();
  }

  ngOnInit(): void {
    this.loadHomeSections();
    this.loadHomeProducts();
  }

  private loadHomeSections(): void {
    const url = `${environment.apiBaseUrl}/api/home-sections`;
    this.http.get<ApiResponse<HomeSectionResponse[]>>(url).subscribe({
      next: (res) => {
        if (!res?.success) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.applyHomeSections(rows);
      },
      error: () => {
        // fallback to HOME_CONFIG
      }
    });
  }

  private applyHomeSections(rows: HomeSectionResponse[]): void {
    const byKey = new Map<string, HomeSectionResponse>();
    for (const s of rows) {
      const key = String(s?.sectionKey || '').toUpperCase();
      if (!key) continue;
      if (s?.enabled === false) continue;
      byKey.set(key, s);
    }

    const featured = byKey.get('FEATURED');
    const hot = byKey.get('HOT');
    const exclusive = byKey.get('EXCLUSIVE');
    const vouchers = byKey.get('VOUCHERS');
    const news = byKey.get('NEWS');
    const cartSaving = byKey.get('CART_SAVING');

    const mapProducts = (sec?: HomeSectionResponse | null): HomeCardProduct[] => {
      const items = Array.isArray(sec?.items) ? sec!.items! : [];
      const out: HomeCardProduct[] = [];
      for (const it of items) {
        if (!it || it.enabled === false) continue;
        if (String(it.itemType || '').toUpperCase() !== 'PRODUCT') continue;
        if (!it.product) continue;
        out.push(this.toCard(it.product));
      }
      return out;
    };

    const f = mapProducts(featured);
    if (f.length) this.featuredProducts = f.slice(0, 8);

    const h = mapProducts(hot);
    if (h.length) this.hotProducts = h.slice(0, 8);

    const ex = mapProducts(exclusive);
    if (ex.length) this.exclusiveProducts = ex.slice(0, 8);

    if (vouchers) {
      this.vouchersTitle = String(vouchers.title || this.cfg.vouchersTitle);
      const items = Array.isArray(vouchers.items) ? vouchers.items : [];
      const out: HomeVoucherConfig[] = [];
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
      if (out.length) this.vouchers = out;
    }

    if (news) {
      this.newsTitle = String(news.title || this.cfg.newsTitle);
      const items = Array.isArray(news.items) ? news.items : [];
      const out: HomeNewsItem[] = [];
      for (const it of items) {
        if (!it || it.enabled === false) continue;
        if (String(it.itemType || '').toUpperCase() !== 'NEWS') continue;
        const title = String(it.title || '').trim();
        const route = String(it.route || '').trim();
        if (!title || !route) continue;
        out.push({
          title,
          description: String(it.description || ''),
          imageUrl: this.resolveImageUrl(String(it.imageUrl || 'https://images.unsplash.com/photo-1520975958225-8c8a552aa9c7?auto=format&fit=crop&w=1200&q=80')),
          route
        });
      }
      if (out.length) this.newsItems = out;
    }

    if (cartSaving) {
      this.cartSavingTitle = String(cartSaving.title || 'Giỏ hàng tiết kiệm');
      const items = Array.isArray(cartSaving.items) ? cartSaving.items : [];
      const links: CartSavingLink[] = [];
      const prods: HomeCardProduct[] = [];
      for (const it of items) {
        if (!it || it.enabled === false) continue;
        const t = String(it.itemType || '').toUpperCase();
        if (t === 'LINK') {
          const route = String(it.route || '').trim();
          const title = String(it.title || '').trim();
          if (!route || !title) continue;
          links.push({
            title,
            description: it.description ? String(it.description) : undefined,
            imageUrl: it.imageUrl ? this.resolveImageUrl(String(it.imageUrl)) : undefined,
            route,
            buttonText: it.buttonText ? String(it.buttonText) : undefined
          });
        }
        if (t === 'PRODUCT' && it.product) {
          prods.push(this.toCard(it.product));
        }
      }
      this.cartSavingLinks = links;
      this.cartSavingProducts = prods.slice(0, 8);
    }
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

  ngAfterViewInit(): void {
    this.updateQuickTilesPaging();
    this.cdr.detectChanges();
  }

  private loadHomeProducts(): void {
    const needFeatured = this.featuredProducts.length === 0;
    const needHot = this.hotProducts.length === 0;
    const needExclusive = this.exclusiveProducts.length === 0;

    const total = (needFeatured ? 1 : 0) + (needHot ? 1 : 0) + (needExclusive ? 1 : 0);
    if (total === 0) {
      this.loadingProducts = false;
      return;
    }

    this.loadingProducts = true;
    let done = 0;
    const finish = () => {
      done++;
      if (done >= total) {
        this.loadingProducts = false;
      }
    };

    if (needFeatured) {
      // Featured: best selling
      this.fetchProducts('bestselling', 12).subscribe({
        next: (items) => {
          this.featuredProducts = items.slice(0, 8);
          finish();
        },
        error: () => {
          this.featuredProducts = [];
          finish();
        }
      });
    }

    if (needHot) {
      // Hot: newest
      this.fetchProducts('newest', 12).subscribe({
        next: (items) => {
          this.hotProducts = items.slice(0, 8);
          finish();
        },
        error: () => {
          this.hotProducts = [];
          finish();
        }
      });
    }

    if (needExclusive) {
      // Exclusive: pick from on-sale products (fallback to newest)
      this.fetchProducts('newest', 80).subscribe({
        next: (items) => {
          const onSale = items.filter((x) => this.isOnSaleCard(x));
          this.exclusiveProducts = (onSale.length ? onSale : items).slice(0, 8);
          finish();
        },
        error: () => {
          this.exclusiveProducts = [];
          finish();
        }
      });
    }
  }

  private fetchProducts(sort: string, limit: number): Observable<HomeCardProduct[]> {
    const url = `${environment.apiBaseUrl}/api/products/search?sort=${encodeURIComponent(sort)}&page=0&limit=${encodeURIComponent(String(limit))}`;
    return this.http.get<ApiResponse<ProductSearchResponse>>(url).pipe(
      map((res) => {
        const rows = res?.data?.data;
        const items = Array.isArray(rows) ? rows : [];
        return items.map((x) => this.toCard(x));
      })
    );
  }

  private toCard(x: any): HomeCardProduct {
    const slug = String(x?.slug || '');
    const price = Number(x?.price || 0);
    const oldPrice = x?.oldPrice !== undefined ? Number(x.oldPrice) : undefined;
    const discountPercent = x?.discountPercent !== undefined ? Number(x.discountPercent) : undefined;
    const badge = x?.badge ? String(x.badge) : undefined;
    const imageUrl = this.resolveImageUrl(x?.imageUrl ? String(x.imageUrl) : 'https://via.placeholder.com/900x900?text=Product');

    const tag = badge || (this.isOnSaleRaw({ price, oldPrice, discountPercent }) ? 'SALE' : undefined);
    const priceText = `${this.formatMoney(price)}đ`;

    return {
      title: String(x?.name || 'Sản phẩm'),
      imageUrl,
      tag,
      priceText,
      route: slug ? `/product/${slug}` : '/'
    };
  }

  private resolveImageUrl(raw: string): string {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (s.startsWith('data:') || s.startsWith('blob:')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('//')) return `https:${s}`;
    if (s.startsWith('/')) return `${this.apiBaseUrl}${s}`;
    return `${this.apiBaseUrl}/${s}`;
  }

  private isOnSaleRaw(v: { price: number; oldPrice?: number; discountPercent?: number }): boolean {
    if (v.discountPercent && v.discountPercent > 0) return true;
    if (v.oldPrice && v.oldPrice > v.price) return true;
    return false;
  }

  private isOnSaleCard(p: HomeCardProduct): boolean {
    return String(p?.tag || '').toLowerCase() === 'sale' || String(p?.tag || '').toUpperCase() === 'SALE';
  }

  formatMoney(v: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(v));
  }

  private applyTheme(): void {
    const root = document.documentElement;
    root.style.setProperty('--fh-primary', this.cfg.theme.primary);
    root.style.setProperty('--fh-accent', this.cfg.theme.accent);
    root.style.setProperty('--fh-bg', this.cfg.theme.bg);
    root.style.setProperty('--fh-text', this.cfg.theme.text);
    root.style.setProperty('--fh-muted', this.cfg.theme.muted);
    root.style.setProperty('--fh-border', this.cfg.theme.border);
  }

  scrollTo(sectionId: HomeSectionId): void {
    const el = document.getElementById(sectionId);
    if (!el) return;

    const header = document.querySelector('.header') as HTMLElement | null;
    const headerOffset = (header?.offsetHeight ?? 0) + 10;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  onNavClick(item: { sectionId?: HomeSectionId; route?: string }): void {
    if (item.route) {
      this.router.navigateByUrl(item.route);
      return;
    }
    if (item.sectionId) {
      this.scrollTo(item.sectionId);
    }
  }

  toggleAccount(): void {
    this.accountOpen = !this.accountOpen;
  }

  closeAccount(): void {
    this.accountOpen = false;
  }

  go(url: string): void {
    this.accountOpen = false;
    this.router.navigateByUrl(url);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.accountOpen = false;
    this.showSearchSuggest = false;
  }

  copy(text: string): void {
    navigator.clipboard?.writeText(text);
  }

  private getUserId(): number | null {
    const raw = localStorage.getItem('fh_userId');
    const userId = raw ? Number(raw) : NaN;
    if (!Number.isFinite(userId) || userId <= 0) return null;
    return userId;
  }

  private claimedStorageKey(userId: number): string {
    return `fh_claimedVouchers_${userId}`;
  }

  private loadClaimedVouchers(): void {
    const userId = this.getUserId();
    if (!userId) return;
    const raw = localStorage.getItem(this.claimedStorageKey(userId));
    if (!raw) return;
    try {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr)) {
        arr.filter((x) => typeof x === 'string').forEach((code) => this.claimedVoucherCodes.add(code));
      }
    } catch {
      // ignore
    }
  }

  private persistClaimedVouchers(): void {
    const userId = this.getUserId();
    if (!userId) return;
    const arr = Array.from(this.claimedVoucherCodes);
    localStorage.setItem(this.claimedStorageKey(userId), JSON.stringify(arr));
  }

  isVoucherClaimed(code: string): boolean {
    return this.claimedVoucherCodes.has(code);
  }

  claimVoucher(code: string): void {
    const userId = this.getUserId();
    if (!userId) {
      this.go('/login');
      return;
    }

    if (this.isVoucherClaimed(code)) return;

    const url = `${environment.apiBaseUrl}/api/coupons/${encodeURIComponent(code)}/claim?userId=${encodeURIComponent(String(userId))}`;
    this.http.post(url, {}).subscribe({
      next: () => {
        this.claimedVoucherCodes.add(code);
        this.persistClaimedVouchers();
        this.copy(code);
      },
      error: () => {
        // errors are handled globally in the backend; keep UI simple for now
      }
    });
  }

  scrollGroups(dir: 'left' | 'right'): void {
    const el = this.categoryScroll?.nativeElement;
    if (!el) return;

    const step = this.getQuickTilesStep(el);
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  }

  onQuickTilesScroll(): void {
    this.updateQuickTilesPaging();
  }

  scrollQuickTilesToPage(pageIndex: number): void {
    const el = this.categoryScroll?.nativeElement;
    if (!el) return;
    const maxPage = Math.max(0, this.quickTilesPageCount - 1);
    const target = Math.min(Math.max(pageIndex, 0), maxPage);
    const step = this.getQuickTilesStep(el);
    el.scrollTo({ left: target * step, behavior: 'smooth' });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateQuickTilesPaging();
  }

  private updateQuickTilesPaging(): void {
    const el = this.categoryScroll?.nativeElement;
    if (!el) return;

    const tiles = el.querySelectorAll('.quick-tile');
    const totalCols = tiles.length;
    if (totalCols <= 0) {
      this.quickTilesPageCount = 1;
      this.quickTilesPages = [0];
      this.quickTilesActivePage = 0;
      return;
    }

    const step = this.getQuickTilesStep(el);
    const gap = Number.parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const visibleCols = Math.max(1, Math.floor((el.clientWidth + gap) / step));
    const maxShift = Math.max(0, totalCols - visibleCols);

    const pageCount = maxShift + 1;
    this.quickTilesPageCount = pageCount;
    this.quickTilesPages = Array.from({ length: pageCount }, (_, i) => i);

    const active = Math.round(el.scrollLeft / step);
    this.quickTilesActivePage = Math.min(Math.max(active, 0), pageCount - 1);
  }

  private getQuickTilesStep(el: HTMLElement): number {
    const gap = Number.parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const firstTile = el.querySelector('.quick-tile') as HTMLElement | null;
    const tileWidth = firstTile?.offsetWidth ?? 0;
    return Math.max(60, tileWidth + gap);
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.showScrollTop = window.scrollY > 500;
    const ids: HomeSectionId[] = ['hero', 'vouchers', 'quick-categories', 'featured', 'hot', 'exclusive', 'news', 'footer'];
    const best = ids
      .map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, top: Number.POSITIVE_INFINITY };
        const rect = el.getBoundingClientRect();
        return { id, top: Math.abs(rect.top - 120) };
      })
      .sort((a, b) => a.top - b.top)[0];

    if (best && best.id !== this.activeSection) {
      this.activeSection = best.id;
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
