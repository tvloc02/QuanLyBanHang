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

interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  children?: CategoryNode[];
}

interface AdminProductImportRowError {
  rowNumber: number;
  productCode?: string | null;
  message: string;
}

interface AdminProductImportResult {
  total: number;
  successCount: number;
  errorCount: number;
  errorFileUrl?: string | null;
  errors?: AdminProductImportRowError[];
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
  soldCount?: number;
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

  page = 1;
  pageSize = 20;
  readonly pageSizeOptions = [20, 50, 100, 500];

  deletingId: number | null = null;
  error = '';
  success = '';

  importOpen = false;
  importing = false;
  importError = '';
  importSuccess = '';
  importMode: 'CREATE' | 'UPDATE' = 'CREATE';
  private importFile: File | null = null;
  importFileName = '';
  importResult: AdminProductImportResult | null = null;

  private readonly apiBaseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  importCategoryFilter = '';
  importCategoryTree: CategoryNode[] = [];
  importLeafCategories: CategoryNode[] = [];
  importSelectedCategoryIds = new Set<number>();
  importSelectedCategoryLeafs: CategoryNode[] = [];
  private importCategoriesLoaded = false;

  constructor(private http: HttpClient) {
    this.load();
  }

  resolveApiUrl(input?: string | null): string {
    const url = (input || '').toString().trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (url.startsWith('/')) return `${this.apiBaseUrl}${url}`;
    return `${this.apiBaseUrl}/${url}`;
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    this.page = 1;

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
      const hay = `${p.sku || ''} ${p.id} ${p.name} ${p.slug} ${p.category} ${p.brand}`.toLowerCase();
      return hay.includes(q);
    });
  }

  onQueryChange(): void {
    this.page = 1;
  }

  onPageSizeChange(): void {
    this.page = 1;
  }

  get totalRecords(): number {
    return this.filteredProducts.length;
  }

  get pageCount(): number {
    const total = this.totalRecords;
    const size = Number(this.pageSize);
    if (!Number.isFinite(size) || size <= 0) return 1;
    return Math.max(1, Math.ceil(total / size));
  }

  get pagedProducts(): ProductResponse[] {
    const totalPages = this.pageCount;
    if (this.page < 1) this.page = 1;
    if (this.page > totalPages) this.page = totalPages;

    const start = (this.page - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  rowNumber(indexInPage: number): number {
    return (this.page - 1) * this.pageSize + indexInPage + 1;
  }

  pagesToShow(): number[] {
    const total = this.pageCount;
    const current = this.page;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  goToPage(p: number): void {
    const total = this.pageCount;
    const next = Math.min(Math.max(1, Math.floor(p)), total);
    this.page = next;
  }

  prevPage(): void {
    this.goToPage(this.page - 1);
  }

  nextPage(): void {
    this.goToPage(this.page + 1);
  }

  formatInt(input: any): string {
    const n = Number(input);
    if (!Number.isFinite(n)) return '0';
    return new Intl.NumberFormat('vi-VN').format(Math.floor(n));
  }

  exportCsv(): void {
    const rows = this.filteredProducts;
    const header = [
      'STT',
      'Mã sản phẩm',
      'Tên Sản phẩm',
      'Danh mục',
      'Màu sắc',
      'Kích cỡ',
      'Số lượng',
      'Đã bán',
      'Còn lại'
    ];

    const esc = (v: any): string => {
      const s = String(v ?? '');
      const needs = /[",\n\r]/.test(s);
      const out = s.replace(/"/g, '""');
      return needs ? `"${out}"` : out;
    };

    const lines: string[] = [];
    lines.push(header.map(esc).join(','));
    rows.forEach((p, idx) => {
      const sold = this.soldCount(p);
      const remain = this.remainingCount(p);
      lines.push(
        [
          idx + 1,
          this.productCode(p),
          p.name,
          p.category,
          (p.colors || []).join(', '),
          (p.sizes || []).join(', '),
          p.stock ?? 0,
          sold,
          remain
        ]
          .map(esc)
          .join(',')
      );
    });

    const csv = '\ufeff' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportZip(): void {
    this.error = '';
    const url = `${environment.apiBaseUrl}/api/admin/products/export`;
    this.http
      .get(url, {
        observe: 'response',
        responseType: 'blob'
      })
      .subscribe({
        next: (res) => {
          const blob = res.body;
          if (!blob) return;

          const cd = res.headers.get('content-disposition') || '';
          const m = /filename="?([^";]+)"?/i.exec(cd);
          const filename = m?.[1] || `products_${new Date().toISOString().slice(0, 10)}.zip`;

          const dlUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = dlUrl;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(dlUrl);
        },
        error: (err) => {
          this.error = err?.error?.message || 'Không thể xuất Excel + ảnh.';
        }
      });
  }

  openImport(): void {
    this.importOpen = true;
    this.importing = false;
    this.importError = '';
    this.importSuccess = '';
    this.importMode = 'CREATE';
    this.importFile = null;
    this.importFileName = '';
    this.importResult = null;
    this.importSelectedCategoryIds.clear();
    this.importSelectedCategoryLeafs = [];
    this.importCategoryFilter = '';

    if (!this.importCategoriesLoaded) {
      this.loadImportCategories();
    }
  }

  closeImport(): void {
    if (this.importing) return;
    this.importOpen = false;
  }

  onImportFileChange(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input?.files?.[0] || null;
    this.importFile = f;
    this.importFileName = f?.name || '';
    this.importError = '';
    this.importSuccess = '';
    this.importResult = null;

    if (input) input.value = '';
  }

  private loadImportCategories(): void {
    const url = `${environment.apiBaseUrl}/api/categories/tree`;
    this.http.get<ApiResponse<CategoryNode[]>>(url).subscribe({
      next: (res) => {
        if (!res?.success) return;
        this.importCategoryTree = Array.isArray(res.data) ? res.data : [];
        this.importLeafCategories = this.flattenLeafCategories(this.importCategoryTree);
        this.refreshImportSelectedCategoryLeafs();
        this.importCategoriesLoaded = true;
      },
      error: () => {
        this.importCategoriesLoaded = false;
      }
    });
  }

  private flattenLeafCategories(nodes: CategoryNode[]): CategoryNode[] {
    const out: CategoryNode[] = [];
    const walk = (n: CategoryNode) => {
      const children = Array.isArray(n.children) ? n.children : [];
      if (children.length === 0) {
        out.push(n);
        return;
      }
      children.forEach(walk);
    };
    (nodes || []).forEach(walk);
    return out;
  }

  get filteredImportLeafCategories(): CategoryNode[] {
    const q = (this.importCategoryFilter || '').trim().toLowerCase();
    const list = this.importLeafCategories || [];
    if (!q) return list;
    return list.filter((x) => `${x.name} ${x.slug}`.toLowerCase().includes(q));
  }

  toggleImportCategory(cat: CategoryNode): void {
    if (!cat?.id) return;
    if (this.importSelectedCategoryIds.has(cat.id)) {
      this.importSelectedCategoryIds.delete(cat.id);
    } else {
      this.importSelectedCategoryIds.add(cat.id);
    }
    this.refreshImportSelectedCategoryLeafs();
  }

  clearImportCategories(): void {
    this.importSelectedCategoryIds.clear();
    this.refreshImportSelectedCategoryLeafs();
  }

  private refreshImportSelectedCategoryLeafs(): void {
    this.importSelectedCategoryLeafs = (this.importLeafCategories || []).filter((x) => this.importSelectedCategoryIds.has(x.id));
  }

  submitImport(): void {
    this.importError = '';
    this.importSuccess = '';
    this.importResult = null;

    if (!this.importFile) {
      this.importError = 'Vui lòng chọn file .zip hoặc .xlsx.';
      return;
    }

    const categoryIds = Array.from(this.importSelectedCategoryIds);
    if (categoryIds.length === 0) {
      this.importError = 'Vui lòng chọn ít nhất 1 danh mục.';
      return;
    }

    const form = new FormData();
    form.append('file', this.importFile);
    form.append('mode', this.importMode);
    categoryIds.forEach((id) => form.append('categoryIds', String(id)));

    const url = `${environment.apiBaseUrl}/api/admin/products/import`;
    this.importing = true;
    this.http.post<ApiResponse<AdminProductImportResult>>(url, form).subscribe({
      next: (res) => {
        this.importing = false;
        if (!res?.success) {
          this.importError = res?.message || 'Import thất bại.';
          return;
        }
        this.importResult = res.data;
        const ok = Number(this.importResult?.successCount || 0);
        const err = Number(this.importResult?.errorCount || 0);
        this.importSuccess = `Import hoàn tất. Thành công: ${ok}, lỗi: ${err}.`;
        this.load();
      },
      error: (err) => {
        this.importing = false;
        this.importError = err?.error?.message || 'Gọi API import thất bại.';
      }
    });
  }

  productCode(p: ProductResponse): string {
    const sku = (p?.sku || '').trim();
    if (sku) return sku;
    if (typeof p?.id === 'number' && isFinite(p.id)) return `SP${p.id}`;
    return '-';
  }

  soldCount(p: ProductResponse): number {
    const anyP = p as any;
    const candidates = [anyP?.soldCount, anyP?.sold, anyP?.soldQuantity, anyP?.soldQty];
    for (const v of candidates) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) return Math.floor(n);
    }
    return 0;
  }

  remainingCount(p: ProductResponse): number {
    const stock = Number((p as any)?.stock);
    const sold = this.soldCount(p);
    const total = Number.isFinite(stock) ? Math.floor(stock) : 0;
    return Math.max(0, total - sold);
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
