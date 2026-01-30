import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ProductVariantSizeStockResponse {
  size: string;
  stock: number;
}

interface ProductVariantResponse {
  id?: number;
  color: string;
  price: number;
  oldPrice?: number;
  images?: string[];
  stocks?: ProductVariantSizeStockResponse[];
  active?: boolean;
}

interface ProductResponse {
  id: number;
  sku?: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  oldPrice?: number;
  stock: number;
  categoryId?: number;
  categoryIds?: number[];
  category: string;
  brand: string;
  imageUrl?: string;
  images?: string[];
  variants?: ProductVariantResponse[];
  badge?: string;
  discountPercent?: number;
  rating?: number;
  soldCount?: number;
  sizes?: string[];
  colors?: string[];
  active?: boolean;
}

@Component({
  selector: 'app-admin-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-product-detail.component.html',
  styleUrls: ['./admin-product-detail.component.scss']
})
export class AdminProductDetailComponent {
  loading = false;
  deleting = false;
  error = '';

  product: ProductResponse | null = null;

  private id: number;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    const raw = this.route.snapshot.paramMap.get('id');
    this.id = raw ? Number(raw) : NaN;
    this.load();
  }

  private resolveImageUrl(input?: string | null): string {
    const url = (input || '').toString().trim();
    if (!url) return '';
    if (/^data:/i.test(url)) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${environment.apiBaseUrl}${url}`;
    return `${environment.apiBaseUrl}/${url}`;
  }

  get images(): string[] {
    const p = this.product;
    if (!p) return [];
    const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (imgs.length > 0) return imgs.map((x) => this.resolveImageUrl(x)).filter(Boolean);
    return p.imageUrl ? [this.resolveImageUrl(p.imageUrl)].filter(Boolean) : [];
  }

  load(): void {
    if (!Number.isFinite(this.id)) {
      this.error = 'ID sản phẩm không hợp lệ.';
      return;
    }

    this.loading = true;
    this.error = '';

    const url = `${environment.apiBaseUrl}/api/products/${this.id}`;
    this.http.get<ApiResponse<ProductResponse>>(url).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải sản phẩm.';
          return;
        }
        this.product = res.data;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Không thể kết nối backend để tải sản phẩm.';
      }
    });
  }

  formatMoney(input: any): string {
    const n = Number(input);
    if (!Number.isFinite(n)) return '-';
    return new Intl.NumberFormat('vi-VN').format(n);
  }

  totalVariantStock(v: ProductVariantResponse): number {
    const st = (v?.stocks || []) as ProductVariantSizeStockResponse[];
    return st.reduce((sum, s) => sum + Number(s?.stock || 0), 0);
  }

  back(): void {
    this.router.navigateByUrl('/admin/products');
  }

  edit(): void {
    this.router.navigate(['/admin/products', this.id, 'edit']);
  }

  remove(): void {
    if (!this.product?.id) return;
    const ok = window.confirm(`Xóa sản phẩm #${this.product.id} (${this.product.name})?`);
    if (!ok) return;

    this.deleting = true;
    this.error = '';

    const url = `${environment.apiBaseUrl}/api/products/${this.product.id}`;
    this.http.delete<ApiResponse<void>>(url).subscribe({
      next: (res) => {
        this.deleting = false;
        if (!res?.success) {
          this.error = res?.message || 'Xóa sản phẩm thất bại.';
          return;
        }
        this.router.navigateByUrl('/admin/products');
      },
      error: (err) => {
        this.deleting = false;
        this.error = err?.error?.message || 'Gọi API thất bại.';
      }
    });
  }
}
