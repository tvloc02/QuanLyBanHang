import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import * as XLSX from 'xlsx';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
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

interface AdminProductTypeResponse {
  id: number;
  code: string;
  name: string;
  active?: boolean | null;
  fieldsJson?: string | null;
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
  productTypeId?: number;
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

interface SizeColorVariant {
  size: string;
  color: string;
  stock?: number;
  price?: number;
  weight?: number;
}

interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  children?: CategoryNode[];
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

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.scss']
})
export class AdminProductsComponent {
  modalOpen = false;
  saving = false;
  loading = false;
  products: ProductResponse[] = [];
  q = '';
  categoryFilter = '';
  error = '';
  success = '';
  categories: CategoryNode[] = [];
  productTypes: AdminProductTypeResponse[] = [];
  selectedProductType: AdminProductTypeResponse | null = null;
  selectedCategoryIds = new Set<number>();
  leafCategories: CategoryNode[] = [];
  selectedCategoryLeafs: CategoryNode[] = [];
  importOpen = false;
  importLoading = false;
  importMode: 'CREATE' | 'UPDATE' = 'CREATE';
  importFile: File | null = null;
  importResult: AdminProductImportResult | null = null;
  importProductTypeId: number | null = null;

  // Thêm biến thể size-color động
  sizeColorVariants: SizeColorVariant[] = [
    { size: '', color: '', stock: 0, price: 0, weight: 0.1 }
  ];

  productTypesLoading = false;
  categoryTree: CategoryNode[] = [];
  private readonly apiBaseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  form = this.fb.group({
    name: ['', [Validators.required]],
    slug: ['', [Validators.required]],
    category: ['', [Validators.required]],
    brand: ['FashionHub', [Validators.required]],
    price: [199000, [Validators.required]],
    oldPrice: [null as number | null],
    stock: [10, [Validators.required]],
    images: this.fb.array<string>([]),
    badge: [''],
    discountPercent: [null as number | null],
    rating: [null as number | null],
    soldCount: [null as number | null],
    variants: this.fb.array([]),
    description: [''],
    active: [true]
  });

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.load();
    this.loadCategories();
    this.loadProductTypes();
  }

  private loadProductTypes(): void {
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

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  downloadProductsTemplateZip(): void {
    this.error = '';
    const pt = this.importProductTypeId != null ? Number(this.importProductTypeId) : null;
    const url = `${environment.apiBaseUrl}/api/admin/products/template${pt ? `?productTypeId=${encodeURIComponent(String(pt))}` : ''}`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'products_template.zip');
      },
      error: () => {
        this.error = 'Không tải được file mẫu.';
      }
    });
  }

  exportProductsZip(): void {
    this.error = '';
    const url = `${environment.apiBaseUrl}/api/admin/products/export`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'products.zip');
      },
      error: () => {
        this.error = 'Không xuất được file sản phẩm.';
      }
    });
  }

  openImport(): void {
    this.error = '';
    this.success = '';
    this.importResult = null;
    this.importFile = null;
    this.importMode = 'CREATE';
    this.importProductTypeId = null;
    this.categoryFilter = '';
    this.selectedCategoryIds.clear();
    this.selectedCategoryLeafs = [];
    this.importOpen = true;
  }

  closeImport(): void {
    this.importOpen = false;
    this.importLoading = false;
    this.importFile = null;
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] || null;
    
    // Validate file type - chỉ chấp nhận .xlsx và .zip
    if (file) {
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.zip')) {
        this.error = 'Chỉ chấp nhận file .xlsx hoặc .zip. Vui lòng chọn file Excel.';
        this.importFile = null;
        (event.target as HTMLInputElement).value = '';
        return;
      }
    }
    
    this.importFile = file;
    this.error = ''; // Clear error khi file hợp lệ
    (event.target as HTMLInputElement).value = '';
  }

  submitImport(): void {
    this.error = '';
    this.success = '';
    this.importResult = null;

    if (!this.importFile) {
      this.error = 'Vui lòng chọn file .xlsx hoặc .zip.';
      return;
    }

    this.importLoading = true;
    const url = `${environment.apiBaseUrl}/api/admin/products/import`;
    const fd = new FormData();
    fd.append('file', this.importFile);
    fd.append('mode', this.importMode);
    
    // Gửi mảng trống nếu không chọn danh mục nào để backend xử lý mặc định
    const categoryIds = Array.from(this.selectedCategoryIds);
    if (categoryIds.length > 0) {
      for (const id of categoryIds) fd.append('categoryIds', String(id));
    } else {
      // Đảm bảo request vẫn hợp lệ bằng cách gửi mảng trống hoặc không gửi
      // Tùy thuộc vào yêu cầu của Backend AdminProductImportExportService
    }
    
    if (this.importProductTypeId != null) fd.append('productTypeId', String(this.importProductTypeId));

    this.http.post<ApiResponse<AdminProductImportResult>>(url, fd).subscribe({
      next: (res) => {
        this.importLoading = false;
        if (!res?.success) {
          this.error = res?.message || 'Import thất bại.';
          return;
        }
        this.importResult = res.data;
        this.success = `Import xong: ${res.data?.successCount || 0}/${res.data?.total || 0} dòng.`;
        this.load();
      },
      error: (err: any) => {
        this.importLoading = false;
        this.error = err?.error?.message || 'Không import được sản phẩm.';
      }
    });
  }

  resolveImageUrl(src?: string | null): string {
    const s = String(src || '').trim();
    if (!s) return '';
    if (s.startsWith('data:') || s.startsWith('blob:')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/')) return `${this.apiBaseUrl}${s}`;
    return `${this.apiBaseUrl}/${s}`;
  }

  get images(): FormArray {
    return this.form.get('images') as FormArray;
  }

  get variants(): FormArray {
    return this.form.get('variants') as FormArray;
  }

  openCreate(): void {
    this.error = '';
    this.success = '';
    this.modalOpen = true;
    this.sizeColorVariants = [
      { size: '', color: '', stock: 0, price: 0, weight: 0.1 }
    ];
    this.form.reset({
      name: '',
      slug: '',
      category: '',
      brand: 'FashionHub',
      price: 199000,
      oldPrice: null,
      stock: 10,
      badge: '',
      discountPercent: null,
      rating: null,
      soldCount: null,
      description: '',
      active: true
    });
    this.images.clear();
    this.addImage();

    this.variants.clear();
    this.categoryFilter = '';
    this.selectedCategoryIds.clear();
    this.selectedCategoryLeafs = [];
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  addImage(value = ''): void {
    this.images.push(this.fb.control(value));
  }

  removeImage(i: number): void {
    this.images.removeAt(i);
    if (this.images.length === 0) this.addImage();
  }

  async onFileSelect(index: number, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.error = '';
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = `${environment.apiBaseUrl}/api/admin/uploads`;
      const res = await this.http.post<ApiResponse<{ url: string }>>(url, formData).toPromise();
      const uploaded = res?.data?.url;
      if (!uploaded) {
        this.error = res?.message || 'Upload thất bại.';
        return;
      }
      this.images.at(index).setValue(uploaded);
    } catch (e: any) {
      this.error = e?.error?.message || 'Không upload được ảnh.';
    } finally {
      // reset input to allow re-select same file
      (event.target as HTMLInputElement).value = '';
    }
  }

  setMain(index: number): void {
    if (index <= 0) return;
    const val = this.images.at(index).value;
    const first = this.images.at(0).value;
    this.images.at(0).setValue(val);
    this.images.at(index).setValue(first);
  }

  loadCategories(): void {
    const url = `${environment.apiBaseUrl}/api/categories/tree`;
    this.http.get<ApiResponse<CategoryNode[]>>(url).subscribe({
      next: (res) => {
        if (!res?.success) return;
        this.categoryTree = Array.isArray(res.data) ? res.data : [];
        this.leafCategories = this.flattenLeafCategories(this.categoryTree);
      },
      error: () => {
        // ignore
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

  get filteredLeafCategories(): CategoryNode[] {
    const q = (this.categoryFilter || '').trim().toLowerCase();
    const list = this.leafCategories || [];
    if (!q) return list;
    return list.filter((x) => `${x.name} ${x.slug}`.toLowerCase().includes(q));
  }

  toggleCategory(cat: CategoryNode): void {
    if (!cat?.id) return;
    if (this.selectedCategoryIds.has(cat.id)) {
      this.selectedCategoryIds.delete(cat.id);
    } else {
      this.selectedCategoryIds.add(cat.id);
    }
    this.selectedCategoryLeafs = (this.leafCategories || []).filter((x) => this.selectedCategoryIds.has(x.id));
    const firstSlug = this.selectedCategoryLeafs[0]?.slug || '';
    this.form.patchValue({ category: firstSlug });
  }

  clearSelectedCategories(): void {
    this.selectedCategoryIds.clear();
    this.selectedCategoryLeafs = [];
    this.form.patchValue({ category: '' });
  }

  recalculateTotalStock(): void {
    let total = 0;
    for (const vg of this.variants.controls) {
      const stocks = vg.get('stocks') as FormArray | null;
      if (!stocks) continue;
      for (const s of stocks.controls) {
        const v = Number(s.get('stock')?.value || 0);
        total += Number.isFinite(v) ? v : 0;
      }
    }
    this.form.patchValue({ stock: total });
  }

  copyPriceFromFirstVariant(): void {
    const first = this.variants.at(0);
    if (!first) return;
    const price = first.get('price')?.value;
    const oldPrice = first.get('oldPrice')?.value;
    const weight = first.get('weight')?.value;
    for (let i = 1; i < this.variants.length; i++) {
      const v = this.variants.at(i);
      v.get('price')?.setValue(price);
      v.get('oldPrice')?.setValue(oldPrice);
      v.get('weight')?.setValue(weight);
    }
  }

  variantImages(variantIndex: number): FormArray {
    return this.variants.at(variantIndex).get('images') as FormArray;
  }

  variantStocks(variantIndex: number): FormArray {
    return this.variants.at(variantIndex).get('stocks') as FormArray;
  }

  addVariantImage(variantIndex: number, value = ''): void {
    this.variantImages(variantIndex).push(this.fb.control(value));
  }

  removeVariantImage(variantIndex: number, imageIndex: number): void {
    const arr = this.variantImages(variantIndex);
    arr.removeAt(imageIndex);
    if (arr.length === 0) arr.push(this.fb.control(''));
  }

  async onVariantFileSelect(variantIndex: number, imageIndex: number, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.error = '';
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = `${environment.apiBaseUrl}/api/admin/uploads`;
      const res = await this.http.post<ApiResponse<{ url: string }>>(url, formData).toPromise();
      const uploaded = res?.data?.url;
      if (!uploaded) {
        this.error = res?.message || 'Upload thất bại.';
        return;
      }
      this.variantImages(variantIndex).at(imageIndex).setValue(uploaded);
    } catch (e: any) {
      this.error = e?.error?.message || 'Không upload được ảnh.';
    } finally {
      (event.target as HTMLInputElement).value = '';
    }
  }

  load(): void {
    this.loading = true;
    this.error = '';
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

  autoSlug(): void {
    const name = (this.form.value.name || '').toString();
    const slug = this.slugify(name);
    this.form.patchValue({ slug });
  }

  // Methods cho size-color variants động
  addSizeColorVariant(): void {
    this.sizeColorVariants.push({
      size: '',
      color: '',
      stock: 0,
      price: 0,
      weight: 0
    });
  }

  removeSizeColorVariant(index: number): void {
    this.sizeColorVariants.splice(index, 1);
  }

  shouldDisableImportButton(): boolean {
    return this.sizeColorVariants.length === 0 || !this.sizeColorVariants.some(v => v.size && v.color);
  }

  generateVariantsFromSizeColor(): void {
    // Tạo variants từ sizeColorVariants
    this.variants.clear();
    
    const basePrice = Number(this.form.value.price || 0);
    const baseOldPrice = this.form.value.oldPrice != null ? Number(this.form.value.oldPrice) : null;
    
    this.sizeColorVariants.forEach(variant => {
      if (variant.size && variant.color) {
        this.variants.push(this.fb.group({
          color: [variant.color, [Validators.required]],
          price: [variant.price || basePrice, [Validators.required]],
          weight: [variant.weight || 0.1],
          oldPrice: [baseOldPrice],
          images: this.fb.array<string>([]),
          stocks: this.fb.array([
            this.fb.group({
              size: [variant.size, [Validators.required]],
              stock: [variant.stock || 0, [Validators.required]]
            })
          ])
        }));
      }
    });
    
    this.recalculateTotalStock();
  }

  getProductStatus(p: ProductResponse): string {
    const hasCategory = !!p.categoryId || (!!p.category && p.category !== 'Uncategorized');
    const hasProductType = !!p.productTypeId;
    const hasImage = !!p.imageUrl || (p.images && p.images.length > 0);

    if (!hasCategory || !hasProductType || !hasImage) {
      if (!hasCategory && !hasProductType && !hasImage) {
        return 'status-red';
      }
      if (!hasImage) {
        return 'status-yellow';
      }
    }
    return 'status-green';
  }

  getProductStatusText(p: ProductResponse): string {
    const status = this.getProductStatus(p);
    switch (status) {
      case 'status-red': return 'Thiếu thông tin';
      case 'status-yellow': return 'Thiếu ảnh';
      case 'status-green': return 'Hoàn thiện';
      default: return '';
    }
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  submit(): void {
    this.error = '';
    this.success = '';

    if (this.form.invalid) {
      this.error = 'Vui lòng nhập đủ các trường bắt buộc.';
      return;
    }

    const images = this.images.controls
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);

    const categoryIds = Array.from(this.selectedCategoryIds);

    const payload = {
      sku: null,
      name: this.form.value.name,
      slug: this.form.value.slug,
      category: this.form.value.category,
      categoryIds,
      brand: this.form.value.brand,
      price: this.form.value.price,
      oldPrice: this.form.value.oldPrice,
      stock: this.form.value.stock,
      imageUrl: images[0] || null,
      badge: this.form.value.badge || null,
      discountPercent: this.form.value.discountPercent,
      rating: this.form.value.rating,
      soldCount: this.form.value.soldCount,
      sizes: this.sizeColorVariants.map(v => v.size).filter(Boolean),
      colors: this.sizeColorVariants.map(v => v.color).filter(Boolean),
      images,
      variants: this.sizeColorVariants.map(variant => {
        if (variant.size && variant.color) {
          return this.fb.group({
            color: [variant.color, [Validators.required]],
            price: [variant.price || this.form.value.price, [Validators.required]],
            weight: [variant.weight || 0.1],
            oldPrice: [this.form.value.oldPrice],
            images: this.fb.array<string>([]),
            stocks: this.fb.array([
              this.fb.group({
                size: [variant.size, [Validators.required]],
                stock: [variant.stock || 0, [Validators.required]]
              })
            ])
          });
        }
        return null;
      }).filter(Boolean),
      description: this.form.value.description || null,
      active: this.form.value.active
    };

    this.saving = true;
    const url = `${environment.apiBaseUrl}/api/admin/products`;
    this.http.post<ApiResponse<ProductResponse>>(url, payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (!res?.success) {
          this.error = res?.message || 'Không tạo được sản phẩm.';
          return;
        }
        this.success = 'Tạo sản phẩm thành công.';
        this.load();
        
        // Nếu có ma trận size-color, tự động import file ngay
        if (this.sizeColorVariants.some(v => v.size && v.color)) {
          this.createAndImportMatrixFile();
        }
      },
      error: (err: any) => {
        this.saving = false;
        this.error = err?.error?.message || 'Không thể kết nối backend để tạo sản phẩm.';
      }
    });
  }

  // Tạo và import file ma trận ngay sau khi tạo sản phẩm
  createAndImportMatrixFile(): void {
    const productName = (this.form.value.name || '').trim();
    if (!productName) return;

    // Tạo file Excel với ma trận size-color
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    
    // Headers
    const headers: any[][] = [
      ['STT', 'Mã SP', 'Tên SP', 'Slug', 'Thương hiệu', 
       'Chi nhánh', 'Size', 'Màu sắc', 'Cân nặng (kg)', 
       'Giới tính', 'Tồn kho', 'Giá']
    ];
    XLSX.utils.sheet_add_aoa(worksheet, headers);
    
    // Thêm dữ liệu ma trận
    let stt = 1;
    this.sizeColorVariants.forEach(variant => {
      if (variant.size && variant.color) {
        const row: any[] = [
          stt,
          '', // Backend sẽ tự tạo SKU
          productName,
          this.form.value.slug || '',
          this.form.value.brand || '',
          '', // Backend sẽ xử lý
          variant.size,
          variant.color,
          variant.weight || 0.1, // Weight từ UI
          '', // Không chọn giới tính
          variant.stock || 0,
          variant.price || this.form.value.price || 0
        ];
        XLSX.utils.sheet_add_aoa(worksheet, row);
        stt++;
      }
    });

    // Tạo file và tự động import
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const file = new File([blob], `${productName}_matrix.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Gọi API import ngay
    this.importMatrixFile(file);
  }

  // Import file ma trận
  private importMatrixFile(file: File): void {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', 'UPDATE'); // Update mode để thêm variants
    
    // Gửi danh mục và product type nếu có
    const categoryIds = Array.from(this.selectedCategoryIds);
    if (categoryIds.length > 0) {
      categoryIds.forEach(id => formData.append('categoryIds', String(id)));
    }
    
    if (this.importProductTypeId != null) {
      formData.append('productTypeId', String(this.importProductTypeId));
    }

    const url = `${environment.apiBaseUrl}/api/admin/products/import`;
    this.http.post<ApiResponse<AdminProductImportResult>>(url, formData).subscribe({
      next: (res) => {
        if (!res?.success) {
          console.error('Import ma trận thất bại:', res?.message);
          return;
        }
        console.log('Import ma trận thành công:', res.data);
        this.success += ` Import ma trận: ${res.data?.successCount || 0}/${res.data?.total || 0} dòng.`;
        this.load(); // Reload lại danh sách
      },
      error: (err: any) => {
        console.error('Lỗi import ma trận:', err?.error?.message || err?.message);
      }
    });
  }
}
