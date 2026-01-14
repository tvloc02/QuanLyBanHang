import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.scss']
})
export class AdminProductsComponent {
  saving = false;
  error = '';
  success = '';

  form = this.fb.group({
    name: ['', [Validators.required]],
    slug: ['', [Validators.required]],
    category: ['', [Validators.required]],
    brand: ['FashionHub', [Validators.required]],
    price: [199000, [Validators.required]],
    oldPrice: [null as number | null],
    stock: [10, [Validators.required]],
    imageUrl: [''],
    badge: [''],
    discountPercent: [null as number | null],
    rating: [null as number | null],
    soldCount: [null as number | null],
    sizesCsv: ['S,M,L'],
    colorsCsv: ['Đen,Trắng'],
    description: [''],
    active: [true]
  });

  constructor(private fb: FormBuilder, private http: HttpClient) {}

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

    const payload = {
      sku: null,
      name: this.form.value.name,
      slug: this.form.value.slug,
      category: this.form.value.category,
      brand: this.form.value.brand,
      price: this.form.value.price,
      oldPrice: this.form.value.oldPrice,
      stock: this.form.value.stock,
      imageUrl: this.form.value.imageUrl || null,
      badge: this.form.value.badge || null,
      discountPercent: this.form.value.discountPercent,
      rating: this.form.value.rating,
      soldCount: this.form.value.soldCount,
      sizes,
      colors,
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
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Gọi API thất bại. Hãy chắc chắn backend đang chạy.';
      }
    });
  }
}
