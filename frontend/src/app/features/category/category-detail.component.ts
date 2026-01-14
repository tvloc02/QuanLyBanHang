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

  // Filters
  filters: Filter = { page: 1, limit: 20 };
  minPrice = 0;
  maxPrice = 3000000;
  selectedSizes: string[] = [];
  selectedSubCategories: string[] = [];
  selectedTargets: Array<'Nữ' | 'Nam' | 'Khác'> = [];
  sortBy: Filter['sort'] = 'newest';

  // Pagination
  total = 0;
  totalPages = 0;
  currentPage = 1;

  // Mock data for sizes/colors
  allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

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

    // Navigate back to Home and scroll to target section
    this.router.navigateByUrl('/').then(() => {
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
    // Map slug to display name (demo)
    const nameMap: Record<string, string> = {
      'ao-khoac-gio': 'Áo khoác gió',
      'ao-thun': 'Áo thun',
      'quan-jeans': 'Quần jeans',
      'vay-dam': 'Váy/Đầm',
      'giay-sneaker': 'Giày sneaker',
      'phu-kien': 'Phụ kiện',
      'ao-khoac-phao-long-vu': 'Áo khoác phao & lông vũ',
      'ao-khoac-long-cuu': 'Áo khoác lông cừu',
      'ao-khoac-chong-nang': 'Áo khoác chống nắng',
      'ao-giu-nhiet': 'Áo giữ nhiệt',
      'ao-thu-dong': 'Áo thu đông',
      'ao-thun-polo': 'Áo thun & polo',
      'quan-jeans-dai': 'Quần jeans & dài',
      'quan-short-chan-vay': 'Quần short & chân váy',
      'ao-lot-bra': 'Áo lót & bra',
      'quan-lot': 'Quần lót',
      'giay-dep': 'Giày dép',
      'tui-sach': 'Túi sách'
    };

    const pretty = this.categorySlug
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    this.categoryName = nameMap[this.categorySlug] || pretty;
  }

  private loadProducts(): void {
    this.loading = true;
    this.error = '';

    // Build query string from filters
    const params = new URLSearchParams();
    if (this.filters.category) params.set('category', this.filters.category);
    if (this.filters.minPrice !== undefined) params.set('minPrice', String(this.filters.minPrice));
    if (this.filters.maxPrice !== undefined) params.set('maxPrice', String(this.filters.maxPrice));
    if (this.filters.sizes?.length) params.set('sizes', this.filters.sizes.join(','));
    if (this.filters.subCategories?.length) params.set('subCategories', this.filters.subCategories.join(','));
    if (this.filters.targets?.length) params.set('targets', this.filters.targets.join(','));
    if (this.filters.sort) params.set('sort', this.filters.sort);
    params.set('page', String(this.filters.page || 1));
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
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            priceText: `${p.price}đ`,
            imageUrl: p.imageUrl || 'https://via.placeholder.com/300x400?text=Product',
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
      priceText: `${Math.floor(Math.random() * 900000) + 100000}đ`,
      imageUrl: 'https://via.placeholder.com/300x400?text=Product',
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
    this.maxPrice = 3000000;
    this.onPriceRangeChange();
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
