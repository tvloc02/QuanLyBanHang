import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminCouponResponse, AdminDataService } from '../../../core/services/admin-data.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-coupons.component.html',
  styleUrls: ['./admin-coupons.component.scss']
})
export class AdminCouponsComponent {
  loading = false;
  error = '';
  rows: AdminCouponResponse[] = [];

  activeTab: 'customer' | 'order' = 'customer';

  // Danh sách phân khúc khách hàng
  segments = [
    { value: 'TIEM_NANG', label: 'Tiềm năng' },
    { value: 'THAN_THIET', label: 'Thân thiết' },
    { value: 'BAC', label: 'Bạc' },
    { value: 'VANG', label: 'Vàng' },
    { value: 'KIM_CUONG', label: 'Kim cương' }
  ];

  // Danh sách đối tượng áp dụng
  audiences = [
    { value: 'TIEM_NANG', label: 'Tiềm năng' },
    { value: 'THAN_THIET', label: 'Thân thiết' },
    { value: 'BAC', label: 'Bạc' },
    { value: 'VANG', label: 'Vàng' },
    { value: 'KIM_CUONG', label: 'Kim cương' }
  ];

  createOpen = false;
  createLoading = false;
  form: {
    code: string;
    description?: string;
    type?: 'customer_segment' | 'customer_shipping' | 'order_amount' | null;
    discountAmount?: number | null;
    discountPercent?: number | null;
    minOrderAmount?: number | null;
    maxDiscountAmount?: number | null;
    shippingDiscountAmount?: number | null;
    allowedSegments?: string[] | null;
    targetAudience?: string[] | null;
    usageLimit?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    active?: boolean | null;
  } = {
    code: '',
    description: '',
    type: 'customer_segment',
    discountAmount: null,
    discountPercent: null,
    minOrderAmount: null,
    maxDiscountAmount: null,
    shippingDiscountAmount: null,
    allowedSegments: [],
    targetAudience: [],
    usageLimit: null,
    startsAt: null,
    endsAt: null,
    active: true
  };

  importOpen = false;
  importLoading = false;
  importFile: File | null = null;
  importFileName = '';

  editOpen = false;
  editLoading = false;
  editForm: {
    id?: number;
    code: string;
    description?: string;
    type?: 'customer_segment' | 'customer_shipping' | 'order_amount' | null;
    discountAmount?: number | null;
    discountPercent?: number | null;
    minOrderAmount?: number | null;
    maxDiscountAmount?: number | null;
    shippingDiscountAmount?: number | null;
    allowedSegments?: string[] | null;
    targetAudience?: string[] | null;
    usageLimit?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    active?: boolean | null;
  } = {
    id: undefined,
    code: '',
    description: '',
    type: 'customer_segment',
    discountAmount: null,
    discountPercent: null,
    minOrderAmount: null,
    maxDiscountAmount: null,
    shippingDiscountAmount: null,
    allowedSegments: [],
    targetAudience: [],
    usageLimit: null,
    startsAt: null,
    endsAt: null,
    active: true
  };

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private extractHttpErrorMessage(e: any, fallback: string): string {
    const err = e as any;
    const body = err?.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body?.message) return String(body.message);
    if (err?.message) return String(err.message);
    return fallback;
  }

  openImport(): void {
    this.importOpen = true;
    this.importLoading = false;
    this.importFile = null;
    this.importFileName = '';
  }

  cancelImport(): void {
    this.importOpen = false;
  }

  onImportFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input?.files?.[0] || null;
    this.importFile = f;
    this.importFileName = f?.name || '';
  }

  async downloadTemplate(): Promise<void> {
    this.error = '';
    try {
      const blob = await firstValueFrom(this.adminData.downloadCouponsImportTemplateExcel());
      this.downloadBlob(blob, 'coupons_template.xlsx');
    } catch (e) {
      this.error = this.extractHttpErrorMessage(e, 'Không thể tải file mẫu.');
    }
  }

  async submitImport(): Promise<void> {
    if (!this.importFile) {
      this.error = 'Vui lòng chọn file Excel (.xlsx).';
      return;
    }

    this.importLoading = true;
    this.error = '';
    try {
      const res = await firstValueFrom(this.adminData.importCouponsExcel(this.importFile));
      console.log('Import result:', res); // Log kết quả để kiểm tra
      if (!res?.success) {
        this.error = res?.message || 'Import thất bại.';
        return;
      }
      
      const data = res.data;
      console.log('Import data:', data); // Log dữ liệu để kiểm tra
      if (data && data.errorCount > 0) {
        let msg = `Import hoàn tất: Thành công ${data.successCount}, Thất bại ${data.errorCount}.`;
        if (data.errors && data.errors.length > 0) {
          msg += '\nChi tiết lỗi: ' + data.errors.map((e: any) => `Dòng ${e.rowNumber}: ${e.message}`).join('; ');
        }
        this.error = msg;
      } else {
        alert(`Import thành công ${data?.successCount || 0} mã giảm giá!`);
        this.importOpen = false;
        this.load();
      }
    } catch (e) {
      this.error = this.extractHttpErrorMessage(e, 'Không thể import mã giảm giá.');
    } finally {
      this.importLoading = false;
    }
  }

  get totalCoupons(): number {
    return (this.rows || []).length;
  }

  get activeCoupons(): number {
    return (this.rows || []).filter((r) => r && (r as any).active !== false).length;
  }

  get inactiveCoupons(): number {
    return (this.rows || []).filter((r) => r && (r as any).active === false).length;
  }

  selectTab(tab: 'customer' | 'order'): void {
    this.activeTab = tab;
  }

  getTabCount(tab: string): number {
    let types: string[] = [];
    if (tab === 'customer') {
      types = ['customer_segment', 'customer_shipping'];
    } else if (tab === 'order') {
      types = ['order_amount'];
    }
    // Nếu r.type không có, mặc định cho vào tab 'customer' để tránh bị ẩn
    return this.rows.filter(r => {
      if (!r.type) return tab === 'customer';
      return types.includes(r.type);
    }).length;
  }

  getFilteredRows(): AdminCouponResponse[] {
    let types: string[] = [];
    if (this.activeTab === 'customer') {
      types = ['customer_segment', 'customer_shipping'];
    } else {
      types = ['order_amount'];
    }
    // Nếu r.type không có, mặc định cho vào tab 'customer'
    return this.rows.filter(r => {
      const type = r.type || 'customer_segment';
      return types.includes(type);
    });
  }



  formatVnd(v?: number | null): string {
    const n = typeof v === 'number' && isFinite(v) ? v : 0;
    return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
  }

  displayDiscount(r: AdminCouponResponse): string {
    if (r.type === 'customer_shipping') {
      return r.discountPercent != null ? `${r.discountPercent}% phí ship` : this.formatVnd(r.shippingDiscountAmount);
    }
    if (r.discountPercent != null) return `${r.discountPercent}%`;
    if (r.discountAmount != null) return this.formatVnd(r.discountAmount);
    return '0';
  }

  displaySegments(csv?: string | null): string {
    const s = (csv || '').trim();
    if (!s) return '-';
    return s
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .join(', ');
  }

  toggleSegment(value: string, event: any): void {
    const checked = event.target.checked;
    if (!this.form.allowedSegments) this.form.allowedSegments = [];
    if (checked) {
      if (!this.form.allowedSegments.includes(value)) {
        this.form.allowedSegments.push(value);
      }
    } else {
      this.form.allowedSegments = this.form.allowedSegments.filter(s => s !== value);
    }
  }

  toggleAudience(value: string, event: any): void {
    const checked = event.target.checked;
    if (!this.form.targetAudience) this.form.targetAudience = [];
    if (checked) {
      if (!this.form.targetAudience.includes(value)) {
        this.form.targetAudience.push(value);
      }
    } else {
      this.form.targetAudience = this.form.targetAudience.filter(a => a !== value);
    }
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
    this.form = {
      code: '',
      description: '',
      discountAmount: null,
      discountPercent: null,
      minOrderAmount: null,
      maxDiscountAmount: null,
      shippingDiscountAmount: null,
      allowedSegments: null,
      usageLimit: null,
      startsAt: null,
      endsAt: null,
      active: true
    };
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

    const hasDiscount =
      (this.form.discountAmount != null && this.form.discountAmount > 0) ||
      (this.form.discountPercent != null && this.form.discountPercent > 0) ||
      (this.form.shippingDiscountAmount != null && this.form.shippingDiscountAmount > 0);
    if (!hasDiscount) {
      this.error = 'Vui lòng nhập giảm % / giảm tiền / giảm phí ship.';
      return;
    }

    this.createLoading = true;
    this.error = '';

    // Convert local datetime-local string to ISO Instant format for Backend
    const startsAtIso = this.form.startsAt ? new Date(this.form.startsAt).toISOString() : null;
    const endsAtIso = this.form.endsAt ? new Date(this.form.endsAt).toISOString() : null;

    this.adminData.createCoupon({
      code: this.form.code.trim(),
      description: this.form.description?.trim() || undefined,
      discountAmount: this.form.discountAmount ?? null,
      discountPercent: this.form.discountPercent ?? null,
      minOrderAmount: this.form.minOrderAmount ?? null,
      maxDiscountAmount: this.form.maxDiscountAmount ?? null,
      shippingDiscountAmount: this.form.shippingDiscountAmount ?? null,
      allowedSegments: this.form.allowedSegments?.length ? this.form.allowedSegments.join(',') : null,
      usageLimit: this.form.usageLimit ?? null,
      startsAt: startsAtIso,
      endsAt: endsAtIso,
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
      minOrderAmount: row.minOrderAmount ?? null,
      maxDiscountAmount: row.maxDiscountAmount ?? null,
      shippingDiscountAmount: row.shippingDiscountAmount ?? null,
      allowedSegments: row.allowedSegments ? row.allowedSegments.split(',').map(s => s.trim()) : null,
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

    const hasDiscount =
      (this.editForm.discountAmount != null && this.editForm.discountAmount > 0) ||
      (this.editForm.discountPercent != null && this.editForm.discountPercent > 0) ||
      (this.editForm.shippingDiscountAmount != null && this.editForm.shippingDiscountAmount > 0);
    if (!hasDiscount) {
      this.error = 'Vui lòng nhập giảm % / giảm tiền / giảm phí ship.';
      return;
    }

    this.editLoading = true;
    this.error = '';

    // Convert local datetime-local string to ISO Instant format for Backend
    const startsAtIso = this.editForm.startsAt ? new Date(this.editForm.startsAt).toISOString() : null;
    const endsAtIso = this.editForm.endsAt ? new Date(this.editForm.endsAt).toISOString() : null;

    this.adminData.updateCoupon(this.editForm.id, {
      code: this.editForm.code.trim(),
      description: this.editForm.description?.trim() || undefined,
      discountAmount: this.editForm.discountAmount ?? null,
      discountPercent: this.editForm.discountPercent ?? null,
      minOrderAmount: this.editForm.minOrderAmount ?? null,
      maxDiscountAmount: this.editForm.maxDiscountAmount ?? null,
      shippingDiscountAmount: this.editForm.shippingDiscountAmount ?? null,
      allowedSegments: this.editForm.allowedSegments?.length ? this.editForm.allowedSegments.join(',') : null,
      usageLimit: this.editForm.usageLimit ?? null,
      startsAt: startsAtIso,
      endsAt: endsAtIso,
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
