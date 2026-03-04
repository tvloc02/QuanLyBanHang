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

        if (p.category) {
          this.fetchRelated(p.category);
        }
      },
      error: () => {
        this.product = this.mockProduct(this.productSlug);
        if (this.product.imageUrl) this.product.imageUrl = this.normalizeImageUrl(String(this.product.imageUrl));
        if (Array.isArray(this.product.images)) this.product.images = this.product.images.map((x) => this.normalizeImageUrl(String(x)));

        this.images = this.product.images?.length ? this.product.images : [this.product.imageUrl || this.productPlaceholderImage];
        this.activeImage = this.images[0] || this.productPlaceholderImage;
        this.selectedSize = (this.product.sizes || [])[0] || '';
        this.selectedColor = (this.product.colors || [])[0] || '';
        this.loading = false;
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

  selectImage(url: string): void {
    this.activeImage = url;
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
  }

  selectSize(s: string): void {
    this.selectedSize = s;
  }

  decQty(): void {
    this.quantity = Math.max(1, this.quantity - 1);
  }

  incQty(): void {
    this.quantity = Math.min(99, this.quantity + 1);
  }

  setTab(tab: 'desc' | 'reviews'): void {
    this.activeTab = tab;
  }

  addToCart(): void {
    if (!this.product) return;

    const item: CartItem = {
      id: this.product.id,
      name: this.product.name,
      slug: this.product.slug,
      imageUrl: this.product.imageUrl || this.activeImage,
      price: Number(this.product.price || 0),
      quantity: this.quantity,
      size: this.selectedSize || undefined,
      color: this.selectedColor || undefined
    };

    const cart = this.readCart();
    const idx = cart.findIndex(
      (x) => x.id === item.id && (x.size || '') === (item.size || '') && (x.color || '') === (item.color || '')
    );

    if (idx >= 0) {
      cart[idx] = { ...cart[idx], quantity: Math.min(99, (cart[idx].quantity || 1) + item.quantity) };
    } else {
      cart.push(item);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
  }

  buyNow(): void {
    this.addToCart();
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

  private mockProduct(slug: string): ProductDetailResponse {
    return {
      id: Math.floor(Math.random() * 100000) + 1,
      name: `Sản phẩm ${slug}`,
      slug,
      description:
        'Đây là mô tả demo cho sản phẩm. Bạn có thể dùng nội dung này để trình bày chất liệu, form dáng, hướng dẫn bảo quản, và chính sách đổi trả.',
      price: 199000,
      oldPrice: 299000,
      stock: 18,
      category: 'demo',
      brand: 'FashionHub',
      imageUrl: 'https://via.placeholder.com/900x1100?text=Product',
      images: [
        'https://via.placeholder.com/900x1100?text=Product+1',
        'https://via.placeholder.com/900x1100?text=Product+2',
        'https://via.placeholder.com/900x1100?text=Product+3'
      ],
      badge: 'New',
      discountPercent: 20,
      rating: 4.6,
      soldCount: 128,
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Hồng', 'Đen', 'Trắng']
    };
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
