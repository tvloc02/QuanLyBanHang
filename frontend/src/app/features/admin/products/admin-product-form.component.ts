import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-product-form.component.html',
  styleUrls: ['./admin-product-form.component.scss']
})
export class AdminProductFormComponent {
  loading = false;
  saving = false;
  error = '';
  success = '';

  categoryTree: CategoryNode[] = [];
  leafCategories: CategoryNode[] = [];
  categoryFilter = '';
  selectedCategoryIds = new Set<number>();
  selectedCategoryLeafs: CategoryNode[] = [];

  private id: number | null = null;

  form = this.fb.group({
    name: ['', [Validators.required]],
    slug: ['', [Validators.required]],
    category: ['', [Validators.required]],
    brand: ['FashionHub', [Validators.required]],
    price: [199000, [Validators.required]],
    oldPrice: [null as number | null],
    stock: [0, [Validators.required]],
    images: this.fb.array<string>([]),
    badge: [''],
    discountPercent: [null as number | null],
    rating: [null as number | null],
    soldCount: [null as number | null],
    sizesCsv: ['S,M,L'],
    colorsCsv: ['Đen,Trắng'],
    variants: this.fb.array([]),
    description: [''],
    active: [true]
  });

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.loadCategories();

    const rawId = this.route.snapshot.paramMap.get('id');
    this.id = rawId ? Number(rawId) : null;
    if (this.id && Number.isFinite(this.id)) {
      this.loadProduct(this.id);
    } else {
      this.images.clear();
      this.addImage();
    }
  }

  get isEdit(): boolean {
    return this.id != null && Number.isFinite(this.id);
  }

  get images(): FormArray {
    return this.form.get('images') as FormArray;
  }

  get variants(): FormArray {
    return this.form.get('variants') as FormArray;
  }

  back(): void {
    this.router.navigateByUrl('/admin/products');
  }

  autoSlug(): void {
    const name = (this.form.value.name || '').toString();
    const slug = this.slugify(name);
    this.form.patchValue({ slug });
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
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
        this.refreshSelectedCategoryLeafs();
      },
      error: () => {
        // ignore
      }
    });
  }

  private refreshSelectedCategoryLeafs(): void {
    this.selectedCategoryLeafs = (this.leafCategories || []).filter((x) => this.selectedCategoryIds.has(x.id));
    const firstSlug = this.selectedCategoryLeafs[0]?.slug || this.form.value.category || '';
    this.form.patchValue({ category: firstSlug });
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
    this.refreshSelectedCategoryLeafs();
  }

  clearSelectedCategories(): void {
    this.selectedCategoryIds.clear();
    this.selectedCategoryLeafs = [];
    this.form.patchValue({ category: '' });
  }

  private parseCsv(value: unknown): string[] {
    return (value || '')
      .toString()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  generateVariantsFromCsv(): void {
    const sizes = this.parseCsv(this.form.value.sizesCsv);
    const colors = this.parseCsv(this.form.value.colorsCsv);

    if (sizes.length === 0 || colors.length === 0) {
      this.error = 'Vui lòng nhập sizes và colors trước khi tạo biến thể.';
      return;
    }

    const basePrice = Number(this.form.value.price || 0);
    const baseOld = this.form.value.oldPrice != null ? Number(this.form.value.oldPrice) : null;

    this.variants.clear();
    colors.forEach((color) => {
      const stocks = this.fb.array(
        sizes.map((size) =>
          this.fb.group({
            size: [size, [Validators.required]],
            stock: [0, [Validators.required]]
          })
        )
      );

      const images = this.fb.array<string>([]);
      images.push(this.fb.control(''));

      this.variants.push(
        this.fb.group({
          color: [color, [Validators.required]],
          price: [basePrice, [Validators.required]],
          oldPrice: [baseOld],
          images,
          stocks,
          active: [true]
        })
      );
    });

    this.recalculateTotalStock();
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
    for (let i = 1; i < this.variants.length; i++) {
      const v = this.variants.at(i);
      v.get('price')?.setValue(price);
      v.get('oldPrice')?.setValue(oldPrice);
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

  private loadProduct(id: number): void {
    this.loading = true;
    this.error = '';
    const url = `${environment.apiBaseUrl}/api/products/${id}`;
    this.http.get<ApiResponse<ProductResponse>>(url).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải sản phẩm.';
          return;
        }
        this.applyProductToForm(res.data);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Không thể kết nối backend để tải sản phẩm.';
      }
    });
  }

  private applyProductToForm(p: ProductResponse): void {
    this.form.patchValue({
      name: p?.name || '',
      slug: p?.slug || '',
      category: p?.category || '',
      brand: p?.brand || 'FashionHub',
      price: Number(p?.price || 0),
      oldPrice: p?.oldPrice != null ? Number(p.oldPrice) : null,
      stock: Number(p?.stock || 0),
      badge: p?.badge || '',
      discountPercent: (p as any)?.discountPercent ?? null,
      rating: (p as any)?.rating ?? null,
      soldCount: (p as any)?.soldCount ?? null,
      sizesCsv: Array.isArray(p?.sizes) ? p.sizes.join(',') : 'S,M,L',
      colorsCsv: Array.isArray(p?.colors) ? p.colors.join(',') : 'Đen,Trắng',
      description: p?.description || '',
      active: p?.active !== false
    });

    this.images.clear();
    const imgs = (Array.isArray(p?.images) && p.images.length > 0) ? p.images : (p?.imageUrl ? [p.imageUrl] : []);
    if (imgs.length === 0) {
      this.addImage();
    } else {
      imgs.forEach((x) => this.addImage(x));
    }

    this.selectedCategoryIds.clear();
    (p?.categoryIds || []).forEach((x) => {
      if (x != null) this.selectedCategoryIds.add(x);
    });
    this.refreshSelectedCategoryLeafs();

    this.variants.clear();
    if (Array.isArray(p?.variants) && p.variants.length > 0) {
      p.variants.forEach((v) => {
        const stocks = this.fb.array(
          (v.stocks || []).map((s) =>
            this.fb.group({
              size: [s.size, [Validators.required]],
              stock: [s.stock, [Validators.required]]
            })
          )
        );

        const images = this.fb.array<string>([]);
        const vImgs = (v.images || []).filter(Boolean);
        if (vImgs.length === 0) images.push(this.fb.control(''));
        else vImgs.forEach((x) => images.push(this.fb.control(x)));

        this.variants.push(
          this.fb.group({
            color: [v.color, [Validators.required]],
            price: [Number(v.price || 0), [Validators.required]],
            oldPrice: [v.oldPrice != null ? Number(v.oldPrice) : null],
            images,
            stocks,
            active: [v.active !== false]
          })
        );
      });
    }

    this.recalculateTotalStock();
  }

  submit(): void {
    this.error = '';
    this.success = '';

    if (this.form.invalid) {
      this.error = 'Vui lòng nhập đủ các trường bắt buộc.';
      return;
    }

    const categoryIds = Array.from(this.selectedCategoryIds);
    if (categoryIds.length === 0) {
      this.error = 'Vui lòng chọn ít nhất 1 danh mục cấp 3.';
      return;
    }

    const sizes = this.parseCsv(this.form.value.sizesCsv);
    const colors = this.parseCsv(this.form.value.colorsCsv);

    const images = this.images.controls
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);

    const variants = this.variants.controls.map((vg) => {
      const imgs = ((vg.get('images') as FormArray)?.controls || [])
        .map((c) => (c.value || '').toString().trim())
        .filter(Boolean);
      const stocks = ((vg.get('stocks') as FormArray)?.controls || [])
        .map((c) => ({
          size: (c.get('size')?.value || '').toString(),
          stock: Number(c.get('stock')?.value || 0)
        }));

      return {
        color: (vg.get('color')?.value || '').toString(),
        price: Number(vg.get('price')?.value || 0),
        oldPrice: vg.get('oldPrice')?.value != null ? Number(vg.get('oldPrice')?.value) : null,
        images: imgs,
        stocks,
        active: vg.get('active')?.value
      };
    });

    this.recalculateTotalStock();

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
      sizes,
      colors,
      images,
      variants,
      description: this.form.value.description || null,
      active: this.form.value.active
    };

    this.saving = true;

    if (this.isEdit && this.id != null) {
      const url = `${environment.apiBaseUrl}/api/products/${this.id}`;
      this.http.put<ApiResponse<ProductResponse>>(url, payload).subscribe({
        next: (res) => {
          this.saving = false;
          if (!res?.success) {
            this.error = res?.message || 'Cập nhật sản phẩm thất bại.';
            return;
          }
          this.success = `Đã cập nhật sản phẩm #${res.data?.id} (${res.data?.name}).`;
          this.router.navigate(['/admin/products', res.data.id]);
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Gọi API thất bại.';
        }
      });
      return;
    }

    const url = `${environment.apiBaseUrl}/api/products`;
    this.http.post<ApiResponse<ProductResponse>>(url, payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (!res?.success) {
          this.error = res?.message || 'Tạo sản phẩm thất bại.';
          return;
        }
        this.success = `Đã tạo sản phẩm #${res.data?.id} (${res.data?.name}).`;
        this.router.navigate(['/admin/products', res.data.id]);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Gọi API thất bại.';
      }
    });
  }
}
