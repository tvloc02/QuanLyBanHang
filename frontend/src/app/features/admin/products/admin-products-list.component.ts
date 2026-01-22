import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
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
  sizes?: string[];
  colors?: string[];
  active?: boolean;
}

@Component({
  selector: 'app-admin-products-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-products-list.component.html',
  styleUrls: ['./admin-products-list.component.scss']
})
export class AdminProductsListComponent {
  loading = false;
  products: ProductResponse[] = [];
  q = '';

  deletingId: number | null = null;
  error = '';
  success = '';

  constructor(private http: HttpClient) {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.success = '';

    const url = `${environment.apiBaseUrl}/api/products`;
    this.http.get<ApiResponse<ProductResponse[]>>(url).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách sản phẩm.';
          return;
        }
        this.products = Array.isArray(res.data) ? res.data : [];
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Không thể kết nối backend để lấy danh sách sản phẩm.';
      }
    });
  }

  get filteredProducts(): ProductResponse[] {
    const q = (this.q || '').trim().toLowerCase();
    if (!q) return this.products;
    return this.products.filter((p) => {
      const hay = `${p.name} ${p.slug} ${p.category} ${p.brand}`.toLowerCase();
      return hay.includes(q);
    });
  }

  formatMoney(input: any): string {
    const n = Number(input);
    if (!Number.isFinite(n)) return '-';
    return new Intl.NumberFormat('vi-VN').format(n);
  }

  async remove(p: ProductResponse): Promise<void> {
    if (!p?.id) return;
    const ok = window.confirm(`Xóa sản phẩm #${p.id} (${p.name})?`);
    if (!ok) return;

    this.deletingId = p.id;
    this.error = '';
    this.success = '';

    const url = `${environment.apiBaseUrl}/api/products/${p.id}`;
    this.http.delete<ApiResponse<void>>(url).subscribe({
      next: (res) => {
        this.deletingId = null;
        if (!res?.success) {
          this.error = res?.message || 'Xóa sản phẩm thất bại.';
          return;
        }
        this.success = `Đã xóa sản phẩm #${p.id}.`;
        this.load();
      },
      error: (err) => {
        this.deletingId = null;
        this.error = err?.error?.message || 'Gọi API thất bại.';
      }
    });
  }
}
