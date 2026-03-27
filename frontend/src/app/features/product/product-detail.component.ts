import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit } from '@angular/core';
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
  imageUrl?: string;
  images?: string[];
  badge?: string;
  discountPercent?: number;
  rating?: number;
  soldCount?: number;
  sizes?: string[];
  colors?: string[];
  promotionTitle?: string;
  promotionText?: string;
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

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FooterComponent],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  readonly cfg = HOME_CONFIG;
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

  buySheetOpen = false;
  branchOptions: BranchOption[] = [];
  branchLoading = false;
  branchError = '';
  selectedBranchId: number | null = null;

  constructor(
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
          price: Number(p.price || 0),
          oldPrice: p.oldPrice !== undefined ? Number(p.oldPrice) : undefined,
          rating: p.rating !== undefined ? Number(p.rating) : undefined,
          discountPercent: p.discountPercent !== undefined ? Number(p.discountPercent) : undefined,
          soldCount: p.soldCount !== undefined ? Number(p.soldCount) : undefined,
          imageUrl: p.imageUrl ? this.normalizeImageUrl(String(p.imageUrl)) : undefined,
          images: Array.isArray(p.images) ? p.images.map((x) => this.normalizeImageUrl(String(x))) : undefined
        };

        const imgs = (this.product.images && this.product.images.length
          ? this.product.images
          : this.product.imageUrl
            ? [this.product.imageUrl]
            : []
        ).filter(Boolean) as string[];
        this.images = imgs.length ? imgs : [this.productPlaceholderImage];
        this.activeImage = this.images[0] || this.productPlaceholderImage;

        const sizes = p.sizes || [];
        const colors = p.colors || [];
        this.selectedSize = sizes.length ? sizes[0] : '';
        this.selectedColor = colors.length ? colors[0] : '';
        this.quantity = 1;

        this.loading = false;

        this.loadBranchOptions();

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
    this.loadBranchOptions();
  }

  selectSize(s: string): void {
    this.selectedSize = s;
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

  addToCart(): void {
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
          color: x.color
        }));
    } catch {
      return [];
    }
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
