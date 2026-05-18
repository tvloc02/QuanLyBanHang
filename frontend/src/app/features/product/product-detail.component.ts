import { CommonModule, DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { HOME_CONFIG } from '../home/home.config';
import { FooterComponent } from '../../shared/footer/footer.component';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ProductDetailResponse {
  id: number;
  sku?: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  oldPrice?: number;
  stock?: number;
  category?: string;
  brand?: string;
  productTypeId?: number | null;
  productTypeFieldsJson?: string | null;
  gender?: string | null;
  imageUrl?: string;
  images?: string[];
  badge?: string;
  discountPercent?: number;
  rating?: number;
  soldCount?: number;
  sizes?: string[];
  colors?: string[];
  variants?: ProductVariantResponse[];
  promotionTitle?: string;
  promotionText?: string;
}

interface ProductVariantSizeStockResponse {
  size?: string | null;
  stock?: number | null;
}

interface ProductVariantResponse {
  id?: number | null;
  color?: string | null;
  price?: number | null;
  oldPrice?: number | null;
  images?: string[];
  stocks?: ProductVariantSizeStockResponse[];
  active?: boolean | null;
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
  branchId?: number;
  branchName?: string;
}

interface RelatedProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string;
  badge?: string;
  discountPercent?: number;
  rating?: number;
}

interface BranchOption {
  id: number;
  name: string;
  address?: string | null;
  province?: string | null;
  ward?: string | null;
  stock?: number | null;
}

interface ReviewResponse {
  id?: number | null;
  productId?: number | null;
  userId?: number | null;
  rating?: number | null;
  comment?: string | null;
  reviewText?: string | null;
  customerName?: string | null;
  images?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface CouponListItem {
  id?: number | null;
  code: string;
  description?: string | null;
  discountAmount?: number | null;
  discountPercent?: number | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean | null;
}

interface ProductTypeResponse {
  id: number;
  code: string;
  name: string;
  active?: boolean | null;
  fieldsJson?: string | null;
}

type SizeGuideGroup = {
  key: string;
  label: string;
};

type SizeGuideRow = {
  size: string;
  heightMin?: number | null;
  heightMax?: number | null;
  weightMin?: number | null;
  weightMax?: number | null;
};

type ProductDescriptionBlockType = 'heading-lg' | 'heading-sm' | 'divider' | 'paragraph' | 'image';

interface ProductDescriptionBlock {
  id: string;
  type: ProductDescriptionBlockType;
  text?: string;
  imageUrl?: string;
  alt?: string;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FooterComponent],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  readonly cfg = HOME_CONFIG;
  readonly stars = [1, 2, 3, 4, 5];
  loading = true;
  error = '';

  productPlaceholderImage = 'https://via.placeholder.com/900x1100?text=Product';

  productSlug = '';
  product: ProductDetailResponse | null = null;

  images: string[] = [];
  activeImage = '';

  selectedColor = '';
  selectedSize = '';
  quantity = 1;

  activeTab: 'desc' | 'reviews' = 'desc';

  related: RelatedProduct[] = [];
  reviews: ReviewResponse[] = [];
  reviewsLoading = false;
  reviewFilter: 0 | 1 | 2 | 3 | 4 | 5 = 0;
  vouchers: CouponListItem[] = [];
  voucherCopiedCode = '';

  buySheetOpen = false;
  branchOptions: BranchOption[] = [];
  branchLoading = false;
  branchError = '';
  selectedBranchId: number | null = null;
  productDescriptionBlocks: ProductDescriptionBlock[] = [];
  productDescriptionFallback = '';
  sizeGuideOpen = false;
  sizeGuideLoading = false;
  sizeGuideError = '';
  sizeGuideProductType: ProductTypeResponse | null = null;
  sizeGuideGroups: SizeGuideGroup[] = [];
  sizeGuideRowsByGroup: Record<string, SizeGuideRow[]> = {};
  activeSizeGuideGroupKey = '';
  private sizeGuideCacheId: number | null = null;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.productSlug = params.get('slug') || '';
      this.fetchProduct();
    });
  }

  private fetchProduct(): void {
    this.loading = true;
    this.error = '';
    this.product = null;
    this.related = [];
    this.productDescriptionBlocks = [];
    this.productDescriptionFallback = '';
    this.sizeGuideOpen = false;
    this.sizeGuideLoading = false;
    this.sizeGuideError = '';
    this.sizeGuideProductType = null;
    this.sizeGuideGroups = [];
    this.sizeGuideRowsByGroup = {};
    this.activeSizeGuideGroupKey = '';
    this.sizeGuideCacheId = null;

    const url = `${environment.apiBaseUrl}/api/products/slug/${encodeURIComponent(this.productSlug)}`;
    this.http.get<ApiResponse<ProductDetailResponse>>(url).subscribe({
      next: (res) => {
        if (!res?.success || !res.data) {
          this.error = res?.message || 'Không thể tải sản phẩm.';
          this.loading = false;

          this.loadBranchOptions();
          return;
        }

        const p = res.data;
        this.product = {
          ...p,
          productTypeId: p.productTypeId != null ? Number(p.productTypeId) : null,
          productTypeFieldsJson: p.productTypeFieldsJson != null ? String(p.productTypeFieldsJson) : null,
          gender: p.gender != null ? String(p.gender) : null,
          price: Number(p.price || 0),
          oldPrice: p.oldPrice !== undefined ? Number(p.oldPrice) : undefined,
          rating: p.rating !== undefined ? Number(p.rating) : undefined,
          discountPercent: p.discountPercent !== undefined ? Number(p.discountPercent) : undefined,
          soldCount: p.soldCount !== undefined ? Number(p.soldCount) : undefined,
          imageUrl: p.imageUrl ? this.normalizeImageUrl(String(p.imageUrl)) : undefined,
          images: Array.isArray(p.images) ? p.images.map((x) => this.normalizeImageUrl(String(x))) : undefined,
          variants: Array.isArray(p.variants)
            ? p.variants.map((variant) => ({
                id: variant?.id != null ? Number(variant.id) : null,
                color: variant?.color != null ? String(variant.color) : null,
                price: variant?.price != null ? Number(variant.price) : null,
                oldPrice: variant?.oldPrice != null ? Number(variant.oldPrice) : null,
                images: Array.isArray(variant?.images)
                  ? variant.images.map((image) => this.normalizeImageUrl(String(image)))
                  : [],
                stocks: Array.isArray(variant?.stocks)
                  ? variant.stocks.map((stock) => ({
                      size: stock?.size != null ? String(stock.size) : null,
                      stock: stock?.stock != null ? Number(stock.stock) : null
                    }))
                  : [],
                active: variant?.active !== false
              }))
            : undefined
        };
        this.hydrateDescriptionBlocks(p.description);

        const sizes = p.sizes || [];
        const colors = p.colors || [];
        this.selectedSize = sizes.length ? sizes[0] : '';
        this.selectedColor = colors.length ? colors[0] : '';
        this.quantity = 1;
        this.syncGalleryWithSelection();

        this.loading = false;
        this.loadCoupons();
        this.loadBranchOptions();
        this.fetchReviews();

        if (p.category) {
          this.fetchRelated(p.category);
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể tải sản phẩm. Vui lòng thử lại.';
        this.loadBranchOptions();
      }
    });
  }

  private fetchRelated(category: string): void {
    const params = new URLSearchParams();
    params.set('category', category);
    params.set('page', '0');
    params.set('limit', '8');
    const url = `${environment.apiBaseUrl}/api/products/search?${params.toString()}`;

    this.http.get<ApiResponse<any>>(url).subscribe({
      next: (res) => {
        const items = res?.data?.data;
        if (!Array.isArray(items)) return;

        this.related = items
          .map((x: any) => ({
            id: Number(x.id),
            name: String(x.name || 'Sản phẩm'),
            slug: String(x.slug || ''),
            price: Number(x.price || 0),
            imageUrl: x.imageUrl ? this.normalizeImageUrl(String(x.imageUrl)) : undefined,
            badge: x.badge ? String(x.badge) : undefined,
            discountPercent: x.discountPercent !== undefined ? Number(x.discountPercent) : undefined,
            rating: x.rating !== undefined ? Number(x.rating) : undefined
          }))
          .filter((x: RelatedProduct) => !!x.slug && (!this.product || x.slug !== this.product.slug))
          .slice(0, 4);
      },
      error: () => {
        this.related = [];
      }
    });
  }

  private loadCoupons(): void {
    const url = `${environment.apiBaseUrl}/api/coupons`;
    this.http.get<ApiResponse<CouponListItem[]>>(url).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const now = Date.now();
        this.vouchers = rows
          .map((item) => ({
            ...item,
            code: String(item?.code || '').trim(),
            description: String(item?.description || '').trim(),
            discountAmount: item?.discountAmount != null ? Number(item.discountAmount) : null,
            discountPercent: item?.discountPercent != null ? Number(item.discountPercent) : null,
            minOrderAmount: item?.minOrderAmount != null ? Number(item.minOrderAmount) : null,
            maxDiscountAmount: item?.maxDiscountAmount != null ? Number(item.maxDiscountAmount) : null,
            active: item?.active !== false
          }))
          .filter((item) => {
            if (!item.code || item.active === false) return false;
            const startsAt = item.startsAt ? new Date(item.startsAt).getTime() : null;
            const endsAt = item.endsAt ? new Date(item.endsAt).getTime() : null;
            if (startsAt && Number.isFinite(startsAt) && startsAt > now) return false;
            if (endsAt && Number.isFinite(endsAt) && endsAt < now) return false;
            return true;
          })
          .sort((a, b) => this.voucherPriority(b) - this.voucherPriority(a))
          .slice(0, 4);
      },
      error: () => {
        this.vouchers = [];
      }
    });
  }

  private fetchReviews(): void {
    const productId = Number(this.product?.id || 0);
    if (!Number.isFinite(productId) || productId <= 0) {
      this.reviews = [];
      return;
    }

    this.reviewsLoading = true;
    const url = `${environment.apiBaseUrl}/api/reviews/product/${productId}`;
    this.http.get<ApiResponse<ReviewResponse[]>>(url).subscribe({
      next: (res) => {
        this.reviewsLoading = false;
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.reviews = rows
          .map((row: any) => ({
            id: row.id ?? null,
            productId: row.productId ?? null,
            userId: row.userId ?? null,
            rating: row.rating != null ? Number(row.rating) : null,
            comment: row.comment || '',
            reviewText: row.reviewText || row.comment || '',
            customerName: row.customerName || row.userName || (row.userId ? `Khách hàng #${row.userId}` : 'Khách hàng'),
            images: Array.isArray(row.images) ? row.images.map((img: string) => this.normalizeImageUrl(img)) : [],
            createdAt: row.createdAt || null,
            updatedAt: row.updatedAt || null
          }))
          .sort((a, b) => {
            const at = new Date(a.createdAt || 0).getTime();
            const bt = new Date(b.createdAt || 0).getTime();
            return bt - at;
          });
      },
      error: () => {
        this.reviewsLoading = false;
        this.reviews = [];
      }
    });
  }

  selectImage(img: string): void {
    this.activeImage = img;
  }

  onHeroImageError(): void {
    this.activeImage = this.productPlaceholderImage;
  }

  onThumbImageError(index: number): void {
    if (!Array.isArray(this.images)) return;
    if (index < 0 || index >= this.images.length) return;
    if (this.images[index] === this.productPlaceholderImage) return;
    const old = this.images[index];
    this.images[index] = this.productPlaceholderImage;
    if (this.activeImage === old) {
      this.activeImage = this.productPlaceholderImage;
    }
  }

  onRelatedImageError(p: RelatedProduct): void {
    if (!p) return;
    if (p.imageUrl === this.productPlaceholderImage) return;
    p.imageUrl = this.productPlaceholderImage;
  }

  selectColor(c: string): void {
    this.selectedColor = c;
    this.syncGalleryWithSelection();
    this.loadBranchOptions();
  }

  selectSize(s: string): void {
    this.selectedSize = s;
    this.syncGalleryWithSelection();
    this.loadBranchOptions();
  }

  decQty(): void {
    this.quantity = Math.max(1, this.quantity - 1);
    this.loadBranchOptions();
  }

  incQty(): void {
    this.quantity = Math.min(99, this.quantity + 1);
    this.loadBranchOptions();
  }

  onQuantityInputChange(): void {
    const q = Number(this.quantity);
    this.quantity = Number.isFinite(q) ? Math.min(99, Math.max(1, Math.floor(q))) : 1;
    this.loadBranchOptions();
  }

  setTab(tab: 'desc' | 'reviews'): void {
    this.activeTab = tab;
  }

  openSizeGuide(): void {
    this.sizeGuideOpen = true;
    this.loadSizeGuide();
  }

  closeSizeGuide(): void {
    this.sizeGuideOpen = false;
  }

  addToCart(trigger?: HTMLElement | ElementRef<HTMLElement> | null): void {
    if (!this.product) return;

    if (!this.selectedBranchId) {
      this.branchError = 'Vui lòng chọn chi nhánh để mua.';
      return;
    }
    const selectedBranchName =
      this.selectedBranchId != null
        ? this.branchOptions.find((x) => x.id === this.selectedBranchId)?.name || ''
        : '';

    const item: CartItem = {
      id: this.product.id,
      name: this.product.name,
      slug: this.product.slug,
      imageUrl: this.product.imageUrl || this.activeImage,
      price: Number(this.product.price || 0),
      quantity: this.quantity,
      size: this.selectedSize || undefined,
      color: this.selectedColor || undefined,
      branchId: this.selectedBranchId || undefined,
      branchName: selectedBranchName || undefined
    };

    const cart = this.readCart();
    const idx = cart.findIndex(
      (x) =>
        x.id === item.id &&
        (x.size || '') === (item.size || '') &&
        (x.color || '') === (item.color || '') &&
        Number(x.branchId || 0) === Number(item.branchId || 0)
    );

    if (idx >= 0) {
      cart[idx] = { ...cart[idx], quantity: Math.min(99, (cart[idx].quantity || 1) + item.quantity) };
    } else {
      cart.push(item);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    this.runAddToCartAnimation(trigger);
    window.dispatchEvent(new Event('cart-updated'));
  }

  buyNow(): void {
    if (!this.product) return;
    this.openBuySheet();
  }

  private openBuySheet(): void {
    if (!this.product) return;
    this.buySheetOpen = true;
    this.branchError = '';
    this.branchOptions = [];
    this.selectedBranchId = null;
    this.loadBranchOptions();
  }

  closeBuySheet(): void {
    this.buySheetOpen = false;
  }

  private loadBranchOptions(): void {
    if (!this.product) return;
    if (this.branchLoading) return;
    this.branchLoading = true;
    this.branchError = '';

    const pid = Number(this.product.id);
    const qty = Number(this.quantity || 1);

    if (!Number.isFinite(pid) || pid <= 0) {
      this.branchLoading = false;
      this.branchOptions = [];
      this.selectedBranchId = null;
      this.branchError = 'Không xác định được sản phẩm để tải kho/chi nhánh.';
      return;
    }

    const params = new URLSearchParams();
    params.set('productId', String(pid));
    params.set('quantity', String(Math.max(1, qty)));
    if (this.selectedColor?.trim()) params.set('color', this.selectedColor.trim());
    if (this.selectedSize?.trim()) params.set('size', this.selectedSize.trim());
    const url = `${environment.apiBaseUrl}/api/branches/options?${params.toString()}`;
    this.http.get<ApiResponse<BranchOption[]>>(url).subscribe({
      next: (res) => {
        this.branchLoading = false;
        const list = Array.isArray(res?.data) ? res.data : [];
        this.branchOptions = list
          .map((x: any) => ({
            id: Number(x?.id),
            name: String(x?.name || ''),
            address: x?.address != null ? String(x.address) : null,
            province: x?.province != null ? String(x.province) : null,
            ward: x?.ward != null ? String(x.ward) : null,
            stock: x?.stock != null ? Number(x.stock) : null
          }))
          .filter((x: BranchOption) => Number.isFinite(x.id) && !!x.name);

        if (this.branchOptions.length === 0) {
          this.selectedBranchId = null;
          this.branchError = 'Không có kho/chi nhánh nào đủ tồn kho.';
          return;
        }

        // If current selection is not available for the new quantity => force user to re-select.
        if (this.selectedBranchId != null) {
          const ok = this.branchOptions.some((x) => x.id === this.selectedBranchId);
          if (!ok) this.selectedBranchId = null;
        }
      },
      error: (err) => {
        this.branchLoading = false;
        this.branchOptions = [];
        this.selectedBranchId = null;
        const status = (err as any)?.status;
        const msg = (err as any)?.error?.message || (err as any)?.message;
        const statusLabel = typeof status === 'number' ? ` (HTTP ${status})` : '';
        this.branchError = `Không tải được danh sách kho/chi nhánh.${statusLabel}${msg ? `: ${String(msg)}` : ''}`;
      }
    });
  }

  confirmBuyNow(): void {
    if (!this.product) return;
    if (!this.selectedBranchId) {
      this.branchError = 'Vui lòng chọn chi nhánh để mua.';
      return;
    }

    localStorage.setItem('checkout_branchId', String(this.selectedBranchId));
    this.addToCart();
    this.buySheetOpen = false;
    this.router.navigateByUrl('/checkout');
  }

  goToProduct(slug: string): void {
    this.router.navigate(['/product', slug]);
  }

  formatMoney(v: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(v));
  }

  get savingsAmount(): number {
    const oldPrice = Number(this.product?.oldPrice || 0);
    const price = Number(this.product?.price || 0);
    if (!Number.isFinite(oldPrice) || !Number.isFinite(price) || oldPrice <= price) return 0;
    return Math.max(0, Math.round(oldPrice - price));
  }

  get selectedColorLabel(): string {
    return String(this.selectedColor || '').trim();
  }

  private syncGalleryWithSelection(): void {
    const fallbackImages = (this.product?.images || []).filter(Boolean);
    const fallbackPrimary = this.product?.imageUrl ? [this.product.imageUrl] : [];
    const nextImages = [...fallbackImages, ...fallbackPrimary]
      .map((image) => this.normalizeImageUrl(String(image)))
      .filter((image, index, arr) => !!image && arr.indexOf(image) === index);

    this.images = nextImages.length ? nextImages : [this.productPlaceholderImage];
    const preferredImage = this.selectedVariantImages()[0] || this.images[0] || this.productPlaceholderImage;
    this.activeImage = preferredImage;
  }

  private selectedVariantImages(): string[] {
    const variant = this.findMatchingVariant();
    return Array.isArray(variant?.images) ? variant!.images.filter(Boolean) : [];
  }

  private findMatchingVariant(): ProductVariantResponse | null {
    const variants = (this.product?.variants || []).filter((variant) => variant && variant.active !== false);
    if (!variants.length) return null;

    const wantedColor = String(this.selectedColor || '').trim().toLowerCase();
    const wantedSize = String(this.selectedSize || '').trim().toLowerCase();

    const byColor = wantedColor
      ? variants.filter((variant) => String(variant?.color || '').trim().toLowerCase() === wantedColor)
      : variants;

    const byColorAndSize = wantedSize
      ? byColor.filter((variant) =>
          (variant?.stocks || []).some((stock) => String(stock?.size || '').trim().toLowerCase() === wantedSize)
        )
      : byColor;

    return byColorAndSize[0] || byColor[0] || variants[0] || null;
  }

  get activeSizeGuideGroupLabel(): string {
    const key = String(this.activeSizeGuideGroupKey || '').trim();
    if (!key) return '';
    return this.sizeGuideGroups.find((group) => String(group?.key || '') === key)?.label || key;
  }

  get activeSizeGuideRows(): SizeGuideRow[] {
    const key = String(this.activeSizeGuideGroupKey || '').trim();
    if (!key) return [];
    return this.sizeGuideRowsByGroup[key] || [];
  }

  get sizeGuideHasData(): boolean {
    return this.sizeGuideGroups.some((group) => (this.sizeGuideRowsByGroup[group.key] || []).length > 0);
  }

  selectSizeGuideGroup(groupKey: string): void {
    const key = String(groupKey || '').trim();
    if (!key) return;
    this.activeSizeGuideGroupKey = key;
  }

  voucherHeadline(item: CouponListItem): string {
    const amount = Number(item?.discountAmount || 0);
    const percent = Number(item?.discountPercent || 0);
    const maxDiscount = Number(item?.maxDiscountAmount || 0);
    if (amount > 0) return `Giảm ngay ${this.formatMoney(amount)}đ`;
    if (percent > 0 && maxDiscount > 0) return `Giảm đến ${this.formatMoney(maxDiscount)}đ`;
    if (percent > 0) return `Giảm ${percent}%`;
    return item?.description?.trim() || `Nhập mã ${item.code}`;
  }

  voucherCondition(item: CouponListItem): string {
    const minOrder = Number(item?.minOrderAmount || 0);
    if (minOrder > 0) return `cho đơn hàng từ ${this.formatMoney(minOrder)}đ`;
    return item?.description?.trim() || 'áp dụng toàn hệ thống';
  }

  async copyVoucher(code: string): Promise<void> {
    const value = String(code || '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.voucherCopiedCode = value;
      setTimeout(() => {
        if (this.voucherCopiedCode === value) this.voucherCopiedCode = '';
      }, 1800);
    } catch {
    }
  }

  isVoucherCopied(code: string): boolean {
    return this.voucherCopiedCode === String(code || '').trim();
  }

  get averageReviewRating(): number {
    if (this.reviews.length > 0) {
      const total = this.reviews.reduce((sum, review) => sum + Math.max(0, Number(review.rating || 0)), 0);
      return Number((total / this.reviews.length).toFixed(1));
    }
    return Number(this.product?.rating || 0);
  }

  get reviewCount(): number {
    return this.reviews.length;
  }

  get filteredReviews(): ReviewResponse[] {
    if (this.reviewFilter === 0) return this.reviews;
    return this.reviews.filter((review) => Number(review.rating || 0) === this.reviewFilter);
  }

  get averageRating(): number {
    return this.averageReviewRating;
  }

  getRatingPercentage(rating: number): number {
    return this.ratingPercent(rating);
  }

  getCountByRating(rating: number): number {
    return this.ratingCount(rating);
  }

  getReviewImages(): string[] {
    const allImages: string[] = [];
    this.reviews.forEach(r => {
      if (r.images && Array.isArray(r.images)) {
        allImages.push(...r.images);
      }
    });
    return allImages;
  }

  get selectedRatingFilter(): number | null {
    return this.reviewFilter === 0 ? null : this.reviewFilter;
  }

  set selectedRatingFilter(val: number | null) {
    this.reviewFilter = val === null ? 0 : (val as 0 | 1 | 2 | 3 | 4 | 5);
  }

  getFilteredReviews(): ReviewResponse[] {
    return this.filteredReviews;
  }

  ratingCount(star: number): number {
    const target = Number(star || 0);
    if (!Number.isFinite(target) || target < 1 || target > 5) return 0;
    return this.reviews.filter((review) => Number(review.rating || 0) === target).length;
  }

  ratingPercent(star: number): number {
    const total = this.reviewCount;
    if (total <= 0) return 0;
    return Math.round((this.ratingCount(star) / total) * 100);
  }

  setReviewFilter(star: number): void {
    const normalized = Number(star);
    if (!Number.isFinite(normalized) || normalized < 0 || normalized > 5) {
      this.reviewFilter = 0;
      return;
    }
    this.reviewFilter = normalized as 0 | 1 | 2 | 3 | 4 | 5;
  }

  reviewAuthorLabel(review: ReviewResponse): string {
    const userId = Number(review?.userId || 0);
    return userId > 0 ? `Khách hàng #${userId}` : 'Khách hàng';
  }

  reviewAuthorInitial(review: ReviewResponse): string {
    const label = this.reviewAuthorLabel(review).trim();
    return label ? label[0].toUpperCase() : 'K';
  }

  get discountLabel(): string {
    const p = this.product;
    if (!p) return '';

    if (p.discountPercent && p.discountPercent > 0) return `-${p.discountPercent}%`;
    if (p.oldPrice && p.oldPrice > p.price && p.price > 0) {
      const pct = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
      return pct > 0 ? `-${pct}%` : '';
    }
    return '';
  }

  get stockStatus(): { label: string; ok: boolean } {
    const stock = this.product?.stock;
    if (stock === undefined || stock === null) return { label: 'Còn hàng', ok: true };
    if (stock > 0) return { label: 'Còn hàng', ok: true };
    return { label: 'Hết hàng', ok: false };
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
          color: x.color,
          branchId: typeof x.branchId === 'number' ? x.branchId : undefined,
          branchName: x.branchName
        }));
    } catch {
      return [];
    }
  }

  private runAddToCartAnimation(trigger?: HTMLElement | ElementRef<HTMLElement> | null): void {
    if (typeof window === 'undefined') return;

    const source = this.resolveElement(trigger);
    const target = this.document.querySelector('[data-cart-icon]') as HTMLElement | null;
    if (!source || !target) return;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const imageUrl = this.activeImage || this.product?.imageUrl || this.productPlaceholderImage;
    const flyer = this.document.createElement('div');
    flyer.className = 'cart-flyer';
    flyer.style.position = 'fixed';
    flyer.style.zIndex = '9999';
    flyer.style.pointerEvents = 'none';
    flyer.style.overflow = 'hidden';
    flyer.style.borderRadius = '18px';
    flyer.style.border = '1px solid rgba(193, 18, 31, 0.16)';
    flyer.style.boxShadow = '0 18px 40px rgba(17, 24, 39, 0.18)';
    flyer.style.background = '#ffffff';

    const image = this.document.createElement('img');
    image.src = imageUrl;
    image.alt = this.product?.name || 'Sản phẩm';
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.objectFit = 'cover';
    image.style.display = 'block';
    flyer.appendChild(image);
    this.document.body.appendChild(flyer);

    const startSize = Math.max(56, Math.min(86, sourceRect.width * 0.38));
    const startX = sourceRect.left + (sourceRect.width - startSize) / 2;
    const startY = sourceRect.top + (sourceRect.height - startSize) / 2;
    const endSize = 24;
    const endX = targetRect.left + targetRect.width / 2 - endSize / 2;
    const endY = targetRect.top + targetRect.height / 2 - endSize / 2;
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    flyer.style.width = `${startSize}px`;
    flyer.style.height = `${startSize}px`;
    flyer.style.left = `${startX}px`;
    flyer.style.top = `${startY}px`;

    const animation = flyer.animate(
      [
        {
          transform: 'translate3d(0, 0, 0) scale(1)',
          opacity: 0.98,
          offset: 0
        },
        {
          transform: `translate3d(${deltaX * 0.35}px, ${deltaY * 0.2 - 42}px, 0) scale(1.06)`,
          opacity: 1,
          offset: 0.45
        },
        {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${endSize / startSize})`,
          opacity: 0.2,
          offset: 1
        }
      ],
      {
        duration: 760,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'forwards'
      }
    );

    animation.onfinish = () => flyer.remove();
    animation.oncancel = () => flyer.remove();
  }

  private resolveElement(trigger?: HTMLElement | ElementRef<HTMLElement> | null): HTMLElement | null {
    if (!trigger) return null;
    if (trigger instanceof ElementRef) return trigger.nativeElement;
    return trigger;
  }

  private hydrateDescriptionBlocks(raw?: string | null): void {
    const source = String(raw || '').trim();
    this.productDescriptionBlocks = [];
    this.productDescriptionFallback = '';

    if (!source) return;

    try {
      const parsed = JSON.parse(source);
      const blocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
      if (parsed?.kind === 'blocks' && blocks.length > 0) {
        this.productDescriptionBlocks = blocks
          .map((block: any, index: number) => ({
            id: String(block?.id || `product-desc-${index}`),
            type: (block?.type || 'paragraph') as ProductDescriptionBlockType,
            text: typeof block?.text === 'string' ? block.text.trim() : '',
            imageUrl: typeof block?.imageUrl === 'string' ? this.normalizeImageUrl(block.imageUrl) : '',
            alt: typeof block?.alt === 'string' ? block.alt.trim() : ''
          }))
          .filter((block: ProductDescriptionBlock) => {
            if (block.type === 'divider') return true;
            if (block.type === 'image') return !!block.imageUrl;
            return !!block.text;
          });
        return;
      }
    } catch {
    }

    this.productDescriptionFallback = source;
  }

  private voucherPriority(item: CouponListItem): number {
    const amount = Number(item?.discountAmount || 0);
    const percent = Number(item?.discountPercent || 0);
    const maxDiscount = Number(item?.maxDiscountAmount || 0);
    return Math.max(amount, maxDiscount, percent * 1000);
  }

  private loadSizeGuide(): void {
    const productTypeId = Number(this.product?.productTypeId || 0);
    const embeddedFieldsJson = String(this.product?.productTypeFieldsJson || '').trim();

    if (embeddedFieldsJson) {
      const parsed = this.parseProductTypeSizeMatrix(embeddedFieldsJson);
      this.sizeGuideLoading = false;
      this.sizeGuideError = '';
      this.sizeGuideProductType = productTypeId > 0
        ? {
            id: productTypeId,
            code: '',
            name: String(this.product?.name || ''),
            active: true,
            fieldsJson: embeddedFieldsJson
          }
        : null;
      this.sizeGuideGroups = parsed.groups;
      this.sizeGuideRowsByGroup = parsed.rowsByGroup;
      this.activeSizeGuideGroupKey = this.pickInitialSizeGuideGroupKey(parsed.groups, parsed.rowsByGroup);
      this.sizeGuideCacheId = productTypeId > 0 ? productTypeId : null;

      if (!this.sizeGuideHasData) {
        this.sizeGuideError = 'Loại sản phẩm này chưa cấu hình ma trận size.';
      }
      return;
    }

    if (!Number.isFinite(productTypeId) || productTypeId <= 0) {
      this.sizeGuideLoading = false;
      this.sizeGuideError = 'Sản phẩm này chưa có loại sản phẩm để hiển thị bảng size.';
      this.sizeGuideProductType = null;
      this.sizeGuideGroups = [];
      this.sizeGuideRowsByGroup = {};
      this.activeSizeGuideGroupKey = '';
      return;
    }

    if (this.sizeGuideCacheId === productTypeId && this.sizeGuideGroups.length > 0) {
      this.sizeGuideError = '';
      this.activeSizeGuideGroupKey = this.pickInitialSizeGuideGroupKey(this.sizeGuideGroups, this.sizeGuideRowsByGroup);
      return;
    }

    this.sizeGuideLoading = true;
    this.sizeGuideError = '';

    const url = `${environment.apiBaseUrl}/api/product-types/${productTypeId}`;
    this.http.get<ApiResponse<ProductTypeResponse>>(url).subscribe({
      next: (res) => {
        this.sizeGuideLoading = false;
        if (!res?.success || !res.data) {
          this.sizeGuideError = res?.message || 'Không tải được bảng hướng dẫn kích thước.';
          this.sizeGuideProductType = null;
          this.sizeGuideGroups = [];
          this.sizeGuideRowsByGroup = {};
          this.activeSizeGuideGroupKey = '';
          this.sizeGuideCacheId = null;
          return;
        }

        this.sizeGuideProductType = res.data;
        const parsed = this.parseProductTypeSizeMatrix(res.data.fieldsJson);
        this.sizeGuideGroups = parsed.groups;
        this.sizeGuideRowsByGroup = parsed.rowsByGroup;
        this.activeSizeGuideGroupKey = this.pickInitialSizeGuideGroupKey(parsed.groups, parsed.rowsByGroup);
        this.sizeGuideCacheId = productTypeId;

        if (!this.sizeGuideHasData) {
          this.sizeGuideError = 'Loại sản phẩm này chưa cấu hình ma trận size.';
        }
      },
      error: () => {
        this.sizeGuideLoading = false;
        this.sizeGuideError = 'Không tải được bảng hướng dẫn kích thước.';
        this.sizeGuideProductType = null;
        this.sizeGuideGroups = [];
        this.sizeGuideRowsByGroup = {};
        this.activeSizeGuideGroupKey = '';
        this.sizeGuideCacheId = null;
      }
    });
  }

  private parseProductTypeSizeMatrix(fieldsJson: string | null | undefined): {
    groups: SizeGuideGroup[];
    rowsByGroup: Record<string, SizeGuideRow[]>;
  } {
    try {
      const raw = String(fieldsJson || '').trim();
      if (!raw) return { groups: [], rowsByGroup: {} };

      const parsed = JSON.parse(raw);
      const sizeMatrix = parsed?.sizeMatrix;
      if (!sizeMatrix || typeof sizeMatrix !== 'object') return { groups: [], rowsByGroup: {} };

      const groups: SizeGuideGroup[] = Array.isArray(sizeMatrix.groups)
        ? sizeMatrix.groups
            .filter((group: any) => group && typeof group === 'object')
            .map((group: any) => ({
              key: String(group.key || '').trim(),
              label: String(group.label || '').trim()
            }))
            .filter((group: SizeGuideGroup) => !!group.key && !!group.label)
        : [];

      const rowsByGroup: Record<string, SizeGuideRow[]> = {};
      const sourceRowsByGroup = sizeMatrix.rowsByGroup;
      if (sourceRowsByGroup && typeof sourceRowsByGroup === 'object') {
        for (const key of Object.keys(sourceRowsByGroup)) {
          const rows = sourceRowsByGroup[key];
          if (!Array.isArray(rows)) continue;
          rowsByGroup[String(key)] = rows
            .filter((row: any) => row && typeof row === 'object')
            .map((row: any) => ({
              size: String(row.size || '').trim(),
              heightMin: row.heightMin != null ? Number(row.heightMin) : null,
              heightMax: row.heightMax != null ? Number(row.heightMax) : null,
              weightMin: row.weightMin != null ? Number(row.weightMin) : null,
              weightMax: row.weightMax != null ? Number(row.weightMax) : null
            }))
            .filter((row: SizeGuideRow) => !!row.size);
        }
      }

      return { groups, rowsByGroup };
    } catch {
      return { groups: [], rowsByGroup: {} };
    }
  }

  private pickInitialSizeGuideGroupKey(
    groups: SizeGuideGroup[],
    rowsByGroup: Record<string, SizeGuideRow[]>
  ): string {
    const productGenderTokens = String(this.product?.gender || '')
      .split(',')
      .map((token) => token.trim().toUpperCase())
      .filter((token) => token);

    for (const token of productGenderTokens) {
      const found = groups.find((group) => String(group?.key || '').trim().toUpperCase() === token);
      if (found && (rowsByGroup[found.key] || []).length > 0) return found.key;
    }

    const currentSize = String(this.selectedSize || '').trim().toUpperCase();
    if (currentSize) {
      for (const group of groups) {
        const rows = rowsByGroup[group.key] || [];
        if (rows.some((row) => String(row.size || '').trim().toUpperCase() === currentSize)) {
          return group.key;
        }
      }
    }

    for (const group of groups) {
      if ((rowsByGroup[group.key] || []).length > 0) return group.key;
    }

    return groups[0]?.key ? String(groups[0].key) : '';
  }

  private normalizeImageUrl(raw: string): string {
    const v = String(raw || '').trim().replace(/\\/g, '/');
    if (!v) return '';
    if (v.startsWith('data:')) return v;
    if (v.startsWith('blob:')) return v;
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    if (v.startsWith('//')) return `https:${v}`;
    if (v.startsWith('/')) return `${environment.apiBaseUrl}${v}`;
    if (v.startsWith('assets/')) return v;
    return `${environment.apiBaseUrl}/${v}`;
  }
}
