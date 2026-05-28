import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';
import {
  AdminCouponResponse,
  AdminDataService,
  AdminHomeSectionItemType,
  HomeSectionResponse
} from '../../../core/services/admin-data.service';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ProductOption {
  id: number;
  name: string;
  slug: string;
  price?: number;
}

interface ItemForm {
  enabled: boolean;
  itemType: AdminHomeSectionItemType;
  refId?: number | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  route?: string | null;
  code?: string | null;
  note?: string | null;
  buttonText?: string | null;
}

@Component({
  selector: 'app-admin-home-sections',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-home-sections.component.html',
  styleUrls: ['./admin-home-sections.component.scss']
})
export class AdminHomeSectionsComponent {
  loading = false;
  saving = false;
  error = '';

  sections: HomeSectionResponse[] = [];
  selectedKey = 'FEATURED';

  products: ProductOption[] = [];
  coupons: AdminCouponResponse[] = [];

  form = {
    title: '',
    enabled: true,
    items: [] as ItemForm[]
  };

  constructor(private adminData: AdminDataService, private http: HttpClient, private route: ActivatedRoute) {
    const k = this.route.snapshot.queryParamMap.get('key');
    if (k) {
      this.selectedKey = String(k).toUpperCase();
    }
    this.load();
    this.loadProducts();
    this.loadCoupons();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.adminData.getHomeSections().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải cấu hình Trang bán hàng.';
          return;
        }
        this.sections = Array.isArray(res?.data) ? res.data : [];

        const key = String(this.selectedKey || '').toUpperCase();
        const exists = this.sections.some((s) => String(s?.sectionKey || '').toUpperCase() === key);
        if (!exists && key) {
          this.sections = [
            ...this.sections,
            {
              sectionKey: key,
              title: this.defaultTitleForKey(key),
              enabled: true,
              items: []
            }
          ];
        }

        if (!key) {
          const first = this.sections[0]?.sectionKey;
          if (first) this.selectedKey = String(first).toUpperCase();
        }

        this.select(this.selectedKey);
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy cấu hình Trang bán hàng.';
      }
    });
  }

  private loadProducts(): void {
    const url = `${environment.apiBaseUrl}/api/products`;
    this.http.get<ApiResponse<any[]>>(url).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.products = rows.map((x) => ({
          id: Number(x?.id || 0),
          name: String(x?.name || ''),
          slug: String(x?.slug || ''),
          price: x?.price !== undefined ? Number(x.price) : undefined
        })).filter((x) => x.id > 0 && x.name);
      },
      error: () => {
        this.products = [];
      }
    });
  }

  private loadCoupons(): void {
    this.adminData.getCoupons().subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.coupons = rows;
      },
      error: () => {
        this.coupons = [];
      }
    });
  }

  select(key: string): void {
    this.selectedKey = String(key || '').toUpperCase();
    const s = this.sections.find((x) => String(x?.sectionKey || '').toUpperCase() === this.selectedKey);

    this.form.title = String(s?.title || this.defaultTitleForKey(this.selectedKey));
    this.form.enabled = s?.enabled !== false;

    const items = Array.isArray(s?.items) ? s!.items! : [];
    this.form.items = items.map((it) => ({
      enabled: it?.enabled !== false,
      itemType: (it?.itemType as AdminHomeSectionItemType) || 'LINK',
      refId: it?.refId ?? null,
      title: it?.title ?? null,
      description: it?.description ?? null,
      imageUrl: it?.imageUrl ?? null,
      route: it?.route ?? null,
      code: it?.code ?? null,
      note: it?.note ?? null,
      buttonText: it?.buttonText ?? null
    }));

    if (this.form.items.length === 0) {
      if (this.selectedKey === 'FEATURED' || this.selectedKey === 'HOT' || this.selectedKey === 'EXCLUSIVE') {
        this.addProduct();
      }
      if (this.selectedKey === 'VOUCHERS') {
        this.addCoupon();
      }
      if (this.selectedKey === 'NEWS') {
        this.addNews();
      }
      if (this.selectedKey === 'CART_SAVING') {
        this.addLink();
      }
    }
  }

  save(): void {
    this.saving = true;
    this.error = '';

    const payload = {
      title: this.form.title?.trim() || null,
      enabled: !!this.form.enabled,
      items: this.form.items.map((i) => ({
        enabled: !!i.enabled,
        itemType: i.itemType,
        refId: i.refId ?? null,
        title: i.title ?? null,
        description: i.description ?? null,
        imageUrl: i.imageUrl ?? null,
        route: i.route ?? null,
        code: i.code ?? null,
        note: i.note ?? null,
        buttonText: i.buttonText ?? null
      }))
    };

    this.adminData.updateHomeSection(this.selectedKey, payload as any).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (!res?.success) {
          this.error = res?.message || 'Lưu cấu hình thất bại.';
          return;
        }
        this.load();
      },
      error: () => {
        this.saving = false;
        this.error = 'Không thể lưu cấu hình.';
      }
    });
  }

  addProduct(): void {
    const first = this.products[0]?.id ?? null;
    this.form.items.push({ enabled: true, itemType: 'PRODUCT', refId: first });
  }

  addCoupon(): void {
    const first = this.coupons[0]?.id ?? null;
    this.form.items.push({ enabled: true, itemType: 'COUPON', refId: first, buttonText: 'Sao chép mã' });
  }

  addNews(): void {
    this.form.items.push({
      enabled: true,
      itemType: 'NEWS',
      title: 'Bài viết mới',
      description: 'Mô tả ngắn...',
      imageUrl: 'https://images.unsplash.com/photo-1520975958225-8c8a552aa9c7?auto=format&fit=crop&w=1200&q=80',
      route: '/news'
    });
  }

  addLink(): void {
    this.form.items.push({
      enabled: true,
      itemType: 'LINK',
      title: 'Xem ưu đãi',
      description: 'Ưu đãi độc quyền online',
      route: '/cart',
      buttonText: 'Xem ngay'
    });
  }

  remove(i: number): void {
    this.form.items.splice(i, 1);
  }

  up(i: number): void {
    if (i <= 0) return;
    const a = this.form.items[i - 1];
    this.form.items[i - 1] = this.form.items[i];
    this.form.items[i] = a;
  }

  down(i: number): void {
    if (i >= this.form.items.length - 1) return;
    const a = this.form.items[i + 1];
    this.form.items[i + 1] = this.form.items[i];
    this.form.items[i] = a;
  }

  productName(id?: number | null): string {
    const p = this.products.find((x) => x.id === Number(id || 0));
    return p ? p.name : '';
  }

  couponCode(id?: number | null): string {
    const c = this.coupons.find((x) => Number(x?.id || 0) === Number(id || 0));
    return c ? c.code : '';
  }

  private defaultTitleForKey(key: string): string {
    const k = String(key || '').toUpperCase();
    if (k === 'FEATURED') return 'Được yêu thích nhất';
    if (k === 'HOT') return 'Sản phẩm hot mỗi ngày';
    if (k === 'EXCLUSIVE') return 'Độc quyền online';
    if (k === 'CART_SAVING') return 'Giỏ hàng tiết kiệm';
    if (k === 'VOUCHERS') return 'Voucher độc quyền online';
    if (k === 'NEWS') return 'Tin tức';
    return k;
  }
}
