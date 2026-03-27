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

interface AdminBranchResponse {
  id: number;
  name: string;
  address?: string;
  ward?: string;
  province?: string;
  active?: boolean;
}

interface AdminProductBranchStockResponse {
  branchId: number;
  productId: number;
  stock: number;
}

interface AdminProductVariantBranchStockResponse {
  branchId: number;
  productId: number;
  color: string;
  size: string;
  stock: number;
  imageUrl?: string | null;
}

type VariantBranchMatrixRow = {
  color: string;
  size: string;
  branchStocks: Array<{ branchId: number; stock: number }>;
  total: number;
  imageUrl: string;
};

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

  branches: AdminBranchResponse[] = [];
  branchStocks: AdminProductBranchStockResponse[] = [];
  variantBranchStocks: AdminProductVariantBranchStockResponse[] = [];
  stockLoading = false;

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

  private loadBranches(): Promise<void> {
    const url = `${environment.apiBaseUrl}/api/admin/branches`;
    return new Promise((resolve) => {
      this.http.get<ApiResponse<AdminBranchResponse[]>>(url).subscribe({
        next: (res) => {
          const rows = res?.success && Array.isArray(res.data) ? res.data : [];
          this.branches = rows.filter((x) => x && typeof x.id === 'number');
          resolve();
        },
        error: () => {
          this.branches = [];
          resolve();
        }
      });
    });
  }

  private loadBranchStocks(): Promise<void> {
    const url = `${environment.apiBaseUrl}/api/admin/products/${this.id}/branch-stocks`;
    return new Promise((resolve) => {
      this.http.get<ApiResponse<AdminProductBranchStockResponse[]>>(url).subscribe({
        next: (res) => {
          this.branchStocks = res?.success && Array.isArray(res.data) ? res.data : [];
          resolve();
        },
        error: () => {
          this.branchStocks = [];
          resolve();
        }
      });
    });
  }

  private loadVariantBranchStocks(): Promise<void> {
    const url = `${environment.apiBaseUrl}/api/admin/products/${this.id}/variant-branch-stocks`;
    return new Promise((resolve) => {
      this.http.get<ApiResponse<AdminProductVariantBranchStockResponse[]>>(url).subscribe({
        next: (res) => {
          this.variantBranchStocks = res?.success && Array.isArray(res.data) ? res.data : [];
          resolve();
        },
        error: () => {
          this.variantBranchStocks = [];
          resolve();
        }
      });
    });
  }

  private async loadStocks(): Promise<void> {
    if (!Number.isFinite(this.id)) return;
    this.stockLoading = true;
    try {
      await this.loadBranches();
      await Promise.all([this.loadBranchStocks(), this.loadVariantBranchStocks()]);
    } finally {
      this.stockLoading = false;
    }
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
        this.loadStocks();
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

  branchLabelById(branchId: number): string {
    const bid = Number(branchId);
    const b = (this.branches || []).find((x) => x && x.id === bid);
    return b?.name ? String(b.name) : `#${bid}`;
  }

  get selectedBranches(): AdminBranchResponse[] {
    const ids = new Set<number>();
    for (const x of this.branchStocks || []) if (typeof x?.branchId === 'number') ids.add(x.branchId);
    for (const x of this.variantBranchStocks || []) if (typeof x?.branchId === 'number') ids.add(x.branchId);
    const rows = (this.branches || []).filter((b) => b && typeof b.id === 'number' && ids.has(b.id));
    if (rows.length > 0) return rows;
    return Array.from(ids)
      .map((id) => ({ id, name: `#${id}` } as AdminBranchResponse));
  }

  get hasVariantBranchStocks(): boolean {
    return (this.variantBranchStocks || []).length > 0;
  }

  get variantBranchMatrixRows(): VariantBranchMatrixRow[] {
    const branchIds = (this.selectedBranches || []).map((b) => b.id).filter((x) => typeof x === 'number');
    if (branchIds.length === 0) return [];

    const rowsByKey = new Map<string, VariantBranchMatrixRow>();
    for (const x of this.variantBranchStocks || []) {
      if (!x || typeof x.branchId !== 'number') continue;
      const color = (x.color || '').toString().trim();
      const size = (x.size || '').toString().trim();
      if (!color || !size) continue;
      const key = `${color.toLowerCase()}|${size.toLowerCase()}`;
      const existing = rowsByKey.get(key);
      if (!existing) {
        rowsByKey.set(key, {
          color,
          size,
          imageUrl: (x.imageUrl || '').toString().trim(),
          branchStocks: branchIds.map((bid) => ({ branchId: bid, stock: 0 })),
          total: 0
        });
      }
      const row = rowsByKey.get(key)!;
      const cell = row.branchStocks.find((s) => s.branchId === x.branchId);
      if (cell) cell.stock = Number(x.stock || 0);
      if (!row.imageUrl && x.imageUrl) row.imageUrl = (x.imageUrl || '').toString().trim();
    }

    const rows = Array.from(rowsByKey.values());
    for (const r of rows) {
      r.total = (r.branchStocks || []).reduce((sum, s) => sum + Math.max(0, Number(s?.stock || 0)), 0);
    }

    rows.sort((a, b) => {
      const c = a.color.localeCompare(b.color, 'vi', { sensitivity: 'base' });
      if (c !== 0) return c;
      return a.size.localeCompare(b.size, 'vi', { sensitivity: 'base' });
    });
    return rows;
  }

  variantBranchCellStock(row: VariantBranchMatrixRow, branchId: number): number {
    const bid = Number(branchId);
    const cell = (row?.branchStocks || []).find((x) => x && x.branchId === bid);
    const v = Number(cell?.stock ?? 0);
    return Number.isFinite(v) ? v : 0;
  }

  stockByBranchId(branchId: number): number {
    const bid = Number(branchId);
    const row = (this.branchStocks || []).find((x) => x && x.branchId === bid);
    const v = Number(row?.stock ?? 0);
    return Number.isFinite(v) ? v : 0;
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
