import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

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
  category: string;
  brand: string;
  imageUrl?: string;
  images?: string[];
  badge?: string;
  discountPercent?: number;
  rating?: number;
  soldCount?: number;
  sizes?: string[];
  colors?: string[];
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
  loading = false;
  products: ProductResponse[] = [];
  q = '';

  saving = false;
  error = '';
  success = '';

  modalOpen = false;

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
    sizesCsv: ['S,M,L'],
    colorsCsv: ['Đen,Trắng'],
    description: [''],
    active: [true]
  });

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.load();
  }

  get images(): FormArray {
    return this.form.get('images') as FormArray;
  }

  openCreate(): void {
    this.error = '';
    this.success = '';
    this.modalOpen = true;
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
      sizesCsv: 'S,M,L',
      colorsCsv: 'Đen,Trắng',
      description: '',
      active: true
    });
    this.images.clear();
    this.addImage();
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

    const sizes = (this.form.value.sizesCsv || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const colors = (this.form.value.colorsCsv || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const images = this.images.controls
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);

    const payload = {
      sku: null,
      name: this.form.value.name,
      slug: this.form.value.slug,
      category: this.form.value.category,
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
      description: this.form.value.description || null,
      active: this.form.value.active
    };

    this.saving = true;
    const url = `${environment.apiBaseUrl}/api/products`;

    this.http.post<ApiResponse<ProductResponse>>(url, payload).subscribe({
      next: (res) => {
        this.saving = false;
        if (!res?.success) {
          this.error = res?.message || 'Tạo sản phẩm thất bại.';
          return;
        }
        this.success = `Đã tạo sản phẩm #${res.data?.id} (${res.data?.name}).`;
        this.closeModal();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Gọi API thất bại. Hãy chắc chắn backend đang chạy.';
      }
    });
  }
}
