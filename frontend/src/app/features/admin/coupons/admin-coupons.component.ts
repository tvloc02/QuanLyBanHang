import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AdminCouponResponse, AdminDataService } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-coupons.component.html',
  styleUrls: ['./admin-coupons.component.scss']
})
export class AdminCouponsComponent {
  loading = false;
  error = '';
  rows: AdminCouponResponse[] = [];

  createOpen = false;
  createLoading = false;
  form: {
    code: string;
    description?: string;
    discountAmount?: number | null;
    discountPercent?: number | null;
    usageLimit?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    active?: boolean | null;
  } = { code: '', description: '', discountAmount: null, discountPercent: null, usageLimit: null, startsAt: null, endsAt: null, active: true };

  editOpen = false;
  editLoading = false;
  editForm: {
    id?: number;
    code: string;
    description?: string;
    discountAmount?: number | null;
    discountPercent?: number | null;
    usageLimit?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    active?: boolean | null;
  } = { id: undefined, code: '', description: '', discountAmount: null, discountPercent: null, usageLimit: null, startsAt: null, endsAt: null, active: true };

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  load(): void {
    this.error = '';
    this.loading = true;
    this.adminData.getCoupons().subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách mã giảm giá.';
          return;
        }
        this.rows = Array.isArray(res.data) ? res.data : [];
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy mã giảm giá.';
      }
    });
  }

  openCreate(): void {
    this.form = { code: '', description: '', discountAmount: null, discountPercent: null, usageLimit: null, startsAt: null, endsAt: null, active: true };
    this.createOpen = true;
  }

  cancelCreate(): void {
    this.createOpen = false;
  }

  submitCreate(): void {
    if (!this.form.code?.trim()) {
      this.error = 'Vui lòng nhập mã Code.';
      return;
    }
    this.createLoading = true;
    this.error = '';
    this.adminData.createCoupon({
      code: this.form.code.trim(),
      description: this.form.description?.trim() || undefined,
      discountAmount: this.form.discountAmount ?? null,
      discountPercent: this.form.discountPercent ?? null,
      usageLimit: this.form.usageLimit ?? null,
      startsAt: this.form.startsAt ?? null,
      endsAt: this.form.endsAt ?? null,
      active: this.form.active ?? true
    }).subscribe({
      next: (res) => {
        this.createLoading = false;
        if (!res?.success) {
          this.error = res?.message || 'Tạo mã giảm giá thất bại.';
          return;
        }
        this.createOpen = false;
        this.load();
      },
      error: () => {
        this.createLoading = false;
        this.error = 'Không thể tạo mã giảm giá. Vui lòng thử lại.';
      }
    });
  }

  onEdit(row: AdminCouponResponse): void {
    this.editForm = {
      id: row.id,
      code: row.code,
      description: row.description || '',
      discountAmount: row.discountAmount ?? null,
      discountPercent: row.discountPercent ?? null,
      usageLimit: row.usageLimit ?? null,
      startsAt: row.startsAt ?? null,
      endsAt: row.endsAt ?? null,
      active: row.active ?? true
    };
    this.editOpen = true;
  }

  cancelEdit(): void {
    this.editOpen = false;
  }

  submitEdit(): void {
    if (!this.editForm.id) return;
    if (!this.editForm.code?.trim()) {
      this.error = 'Vui lòng nhập mã Code.';
      return;
    }
    this.editLoading = true;
    this.error = '';
    this.adminData.updateCoupon(this.editForm.id, {
      code: this.editForm.code.trim(),
      description: this.editForm.description?.trim() || undefined,
      discountAmount: this.editForm.discountAmount ?? null,
      discountPercent: this.editForm.discountPercent ?? null,
      usageLimit: this.editForm.usageLimit ?? null,
      startsAt: this.editForm.startsAt ?? null,
      endsAt: this.editForm.endsAt ?? null,
      active: this.editForm.active ?? true
    }).subscribe({
      next: (res) => {
        this.editLoading = false;
        if (!res?.success) {
          this.error = res?.message || 'Cập nhật mã giảm giá thất bại.';
          return;
        }
        this.editOpen = false;
        this.load();
      },
      error: () => {
        this.editLoading = false;
        this.error = 'Không thể cập nhật mã giảm giá. Vui lòng thử lại.';
      }
    });
  }

  onDelete(row: AdminCouponResponse): void {
    const ok = confirm(`Xóa mã giảm giá "${row.code}"?`);
    if (!ok) return;
    this.loading = true;
    this.error = '';
    this.adminData.deleteCoupon(row.id).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể xóa mã giảm giá.';
          return;
        }
        this.load();
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể xóa mã giảm giá.';
      }
    });
  }
}
