import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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

interface AdminProductTypeResponse {
  id: number;
  code: string;
  name: string;
  active?: boolean | null;
  fieldsJson?: string | null;
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
  variants?: Array<{
    stocks?: Array<{
      size?: string;
      stock?: number;
    }>;
  }>;
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
}

interface AdminProductStockSummaryResponse {
  productId: number;
  totalStock: number;
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

  productTypesLoading = false;
  productTypes: AdminProductTypeResponse[] = [];
  importProductTypeId: number | null = null;

  private readonly apiBaseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  importCategoryFilter = '';
  importCategoryTree: CategoryNode[] = [];
  importLeafCategories: CategoryNode[] = [];
  importSelectedCategoryIds = new Set<number>();
  importSelectedCategoryLeafs: CategoryNode[] = [];
  private importCategoriesLoaded = false;
  private aggregatedStockByProductId = new Map<number, number>();

  get filteredImportCategoryTree(): CategoryNode[] {
    const q = (this.importCategoryFilter || '').trim().toLowerCase();
    const tree = this.trimCategoryTreeToLevel(this.importCategoryTree || [], 2);
    if (!q) return tree;
    return this.filterCategoryTree(tree, q);
  }

  constructor(private http: HttpClient) {
    this.load();
  }

  private loadProductTypes(): void {
    if (this.productTypesLoading) return;
    this.productTypesLoading = true;
    const url = `${environment.apiBaseUrl}/api/admin/product-types`;
    this.http.get<ApiResponse<AdminProductTypeResponse[]>>(url).subscribe({
      next: (res) => {
        this.productTypesLoading = false;
        this.productTypes = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {
        this.productTypesLoading = false;
        this.productTypes = [];
      }
    });
  }

  get importTemplateHref(): string {
    const pt = this.importProductTypeId != null ? Number(this.importProductTypeId) : null;
    const path = `/api/admin/products/template${pt ? `?productTypeId=${encodeURIComponent(String(pt))}` : ''}`;
    return this.resolveApiUrl(path);
  }

  get totalProducts(): number {
    return (this.products || []).length;
  }

  get totalQuantity(): number {
    return (this.products || []).reduce((sum, p) => sum + this.totalStock(p), 0);
  }

  get totalSoldQuantity(): number {
    return (this.products || []).reduce((sum, p) => sum + this.soldCount(p), 0);
  }

  get totalRemainingQuantity(): number {
    return (this.products || []).reduce((sum, p) => sum + this.remainingCount(p), 0);
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
        this.loadAdminStockSnapshots();
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
      'Tên sản phẩm',
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
          this.totalStock(p),
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
          this.error = err?.error?.message || 'Không thể xuất Excel và ảnh.';
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
    this.importProductTypeId = null;
    this.importSelectedCategoryIds.clear();
    this.importSelectedCategoryLeafs = [];
    this.importCategoryFilter = '';

    this.loadProductTypes();

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
        this.importLeafCategories = this.flattenCategoriesAtLevel(this.importCategoryTree, 2);
        this.refreshImportSelectedCategoryLeafs();
        this.importCategoriesLoaded = true;
      },
      error: () => {
        this.importCategoriesLoaded = false;
      }
    });
  }

  private flattenCategoriesAtLevel(nodes: CategoryNode[], targetLevel: number, level = 0): CategoryNode[] {
    const out: CategoryNode[] = [];
    const walk = (n: CategoryNode, lv: number) => {
      if (!n) return;
      if (lv === targetLevel) {
        out.push(n);
        return;
      }
      const children = Array.isArray(n.children) ? n.children : [];
      children.forEach((c) => walk(c, lv + 1));
    };
    (nodes || []).forEach((n) => walk(n, level));
    return out;
  }

  private trimCategoryTreeToLevel(nodes: CategoryNode[], maxLevel: number, level = 0): CategoryNode[] {
    const out: CategoryNode[] = [];
    for (const n of nodes || []) {
      if (!n) continue;
      if (level >= maxLevel) {
        out.push({ ...n, children: [] });
        continue;
      }
      const children = Array.isArray(n.children) ? n.children : [];
      out.push({
        ...n,
        children: this.trimCategoryTreeToLevel(children, maxLevel, level + 1)
      });
    }
    return out;
  }

  isLevel3Category(level: number): boolean {
    return Number(level) === 2;
  }

  categoryIndent(level: number): string {
    const lv = Number(level);
    const px = Number.isFinite(lv) && lv > 0 ? lv * 14 : 0;
    return `${px}px`;
  }

  onImportCategoryRowClick(ev: Event, level: number): void {
    if (this.isLevel3Category(level)) return;
    ev.preventDefault();
    ev.stopPropagation();
  }

  private filterCategoryTree(nodes: CategoryNode[], q: string): CategoryNode[] {
    const out: CategoryNode[] = [];
    for (const n of nodes || []) {
      if (!n) continue;
      const name = (n.name || '').toLowerCase();
      const slug = (n.slug || '').toLowerCase();
      const selfMatch = name.includes(q) || slug.includes(q);
      const children = Array.isArray(n.children) ? n.children : [];
      const matchedChildren = children.length > 0 ? this.filterCategoryTree(children, q) : [];
      if (selfMatch || matchedChildren.length > 0) {
        out.push({
          ...n,
          children: matchedChildren
        });
      }
    }
    return out;
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

    const form = new FormData();
    form.append('file', this.importFile);
    form.append('mode', this.importMode);
    categoryIds.forEach((id) => form.append('categoryIds', String(id)));
    if (this.importProductTypeId != null) form.append('productTypeId', String(this.importProductTypeId));

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

  descriptionPreview(raw?: string | null): string {
    const text = String(raw || '').trim();
    if (!text) return '-';

    try {
      const parsed = JSON.parse(text);
      const blocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
      if (parsed?.kind === 'blocks' && blocks.length > 0) {
        const preview = blocks
          .map((block: any) => {
            const type = String(block?.type || '').trim();
            if (type === 'image') return '[Ảnh]';
            if (type === 'divider') return '•';
            return String(block?.text || '').trim();
          })
          .filter(Boolean)
          .join(' ');
        return preview || '-';
      }
    } catch {
    }

    return text;
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

  totalStock(p: ProductResponse): number {
    const productId = Number((p as any)?.id);
    if (Number.isFinite(productId) && productId > 0) {
      const aggregated = this.aggregatedStockByProductId.get(productId);
      if (aggregated != null) return aggregated;
    }

    const variants = Array.isArray((p as any)?.variants) ? ((p as any).variants as any[]) : [];
    if (variants.length > 0) {
      let total = 0;
      for (const variant of variants) {
        const stocks = Array.isArray(variant?.stocks) ? variant.stocks : [];
        for (const stockRow of stocks) {
          const value = Number(stockRow?.stock || 0);
          total += Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
        }
      }
      return total;
    }

    const fallback = Number((p as any)?.stock);
    return Number.isFinite(fallback) ? Math.max(0, Math.floor(fallback)) : 0;
  }

  private async loadAdminStockSnapshots(): Promise<void> {
    this.aggregatedStockByProductId.clear();
    try {
      const url = `${environment.apiBaseUrl}/api/admin/products/stock-summary`;
      const res = await firstValueFrom(
        this.http.get<ApiResponse<AdminProductStockSummaryResponse[]>>(url)
      );
      const rows = Array.isArray(res?.data) ? res.data : [];
      for (const row of rows) {
        const productId = Number(row?.productId);
        const totalStock = Math.max(0, Number(row?.totalStock || 0));
        if (!Number.isFinite(productId) || productId <= 0) continue;
        this.aggregatedStockByProductId.set(productId, totalStock);
      }
    } catch {
    }
  }

  remainingCount(p: ProductResponse): number {
    const stock = this.totalStock(p);
    const sold = this.soldCount(p);
    return Math.max(0, stock - sold);
  }

  formatMoney(input: any): string {
    const n = Number(input);
    if (!Number.isFinite(n)) return '-';
    return new Intl.NumberFormat('vi-VN').format(n);
  }

  getProductStatus(p: ProductResponse): 'green' | 'yellow' | 'red' {
    const hasName = !!p.name && p.name.trim().length > 0;
    const hasPrice = typeof p.price === 'number' && p.price > 0;
    const hasImage = !!p.imageUrl || (Array.isArray(p.images) && p.images.length > 0);
    const hasCategory = !!p.category && p.category !== 'Uncategorized';
    const hasVariants = (Array.isArray(p.colors) && p.colors.length > 0) || (Array.isArray(p.sizes) && p.sizes.length > 0);

    const criteria = [hasName, hasPrice, hasImage, hasCategory, hasVariants];
    const metCount = criteria.filter((c) => c).length;

    if (metCount === criteria.length) return 'green';
    if (metCount >= 3) return 'yellow';
    return 'red';
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
