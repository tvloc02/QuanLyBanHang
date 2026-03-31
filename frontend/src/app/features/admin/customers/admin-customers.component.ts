import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataService, AdminUserResponse } from '../../../core/services/admin-data.service';

type ConvertRole = 'STAFF' | 'MANAGER';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-customers.component.html',
  styleUrls: ['./admin-customers.component.scss']
})
export class AdminCustomersComponent {
  loading = false;
  error = '';
  rows: AdminUserResponse[] = [];
  branches: Array<{ id: number; name: string; code: string }> = [];

  editOpen = false;
  editLoading = false;
  editForm: {
    id?: number;
    fullName?: string;
    email?: string;
    username?: string;
    phone?: string;
    enabled: boolean;
  } = {
    id: undefined,
    fullName: '',
    email: '',
    username: '',
    phone: '',
    enabled: true
  };

  convertOpen = false;
  convertLoading = false;
  convertTarget: AdminUserResponse | null = null;
  convertForm: {
    role: ConvertRole;
    branchId: number | null;
    username: string;
  } = {
    role: 'STAFF',
    branchId: null,
    username: ''
  };

  constructor(private adminData: AdminDataService) {
    this.loadBranches();
    this.load();
  }

  get totalCustomers(): number {
    return (this.rows || []).length;
  }

  get activeCustomers(): number {
    return (this.rows || []).filter((row) => row && row.enabled !== false).length;
  }

  get lockedCustomers(): number {
    return (this.rows || []).filter((row) => row && row.enabled === false).length;
  }

  get pendingDeleteRequests(): number {
    return 0;
  }

  segmentLabel(segment?: string | null): string {
    const normalized = (segment || '').toUpperCase();
    switch (normalized) {
      case 'KIM_CUONG':
        return 'Kim cương';
      case 'VANG':
        return 'Vàng';
      case 'BAC':
        return 'Bạc';
      case 'THAN_THIET':
        return 'Thân thiết';
      case 'TIEM_NANG':
        return 'Tiềm năng';
      default:
        return '-';
    }
  }

  formatVnd(value?: number | null): string {
    const normalized = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return `${new Intl.NumberFormat('vi-VN').format(normalized)}đ`;
  }

  accountAgeLabel(months?: number | null): string {
    if (months == null || !Number.isFinite(months)) return '-';
    if (months < 1) return 'Mới';
    return `${months} tháng`;
  }

  private loadBranches(): void {
    this.adminData.getBranches().subscribe({
      next: (res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.branches = list
          .filter((item) => !!item && typeof item.id === 'number')
          .map((item) => ({
            id: item.id,
            name: String(item.name || ''),
            code: String(item.code || '')
          }));
      },
      error: () => {
        this.branches = [];
      }
    });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.adminData.getCustomers().subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách khách hàng.';
          return;
        }
        this.rows = Array.isArray(res.data) ? res.data : [];
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy khách hàng.';
      }
    });
  }

  openEdit(row: AdminUserResponse): void {
    this.editForm = {
      id: row.id,
      fullName: row.fullName || '',
      email: row.email || '',
      username: row.username || '',
      phone: row.phone || '',
      enabled: row.enabled !== false
    };
    this.editOpen = true;
  }

  closeEdit(): void {
    this.editOpen = false;
    this.editLoading = false;
  }

  submitEdit(): void {
    if (!this.editForm.id) return;
    this.editLoading = true;
    this.error = '';

    this.adminData
      .updateUser(this.editForm.id, {
        fullName: this.editForm.fullName?.trim() || undefined,
        email: this.editForm.email?.trim() || undefined,
        username: this.editForm.username?.trim() || undefined,
        phone: this.editForm.phone?.trim() || undefined,
        enabled: !!this.editForm.enabled,
        roles: ['CUSTOMER']
      })
      .subscribe({
        next: (res) => {
          this.editLoading = false;
          if (!res?.success) {
            this.error = res?.message || 'Cập nhật khách hàng thất bại.';
            return;
          }
          this.closeEdit();
          this.load();
        },
        error: (err: unknown) => {
          this.editLoading = false;
          const error = err as HttpErrorResponse;
          this.error = error?.error?.message || error?.message || 'Không thể cập nhật khách hàng.';
        }
      });
  }

  onResetPassword(row: AdminUserResponse): void {
    if (!row?.id) return;
    if (!confirm(`Reset mật khẩu cho khách hàng #${row.id}?`)) return;
    this.error = '';

    this.adminData.resetUserPassword(row.id).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.error = res?.message || 'Reset mật khẩu thất bại.';
          return;
        }
        alert('Đã reset mật khẩu. Mật khẩu mặc định mới là 12345678.');
      },
      error: () => {
        this.error = 'Không thể reset mật khẩu.';
      }
    });
  }

  onToggleEnabled(row: AdminUserResponse): void {
    if (!row?.id) return;
    const nextEnabled = row.enabled === false;
    const message = nextEnabled ? `Mở khóa khách hàng #${row.id}?` : `Khóa khách hàng #${row.id}?`;
    if (!confirm(message)) return;

    this.error = '';
    this.adminData.setUserEnabled(row.id, nextEnabled).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.error = res?.message || 'Cập nhật trạng thái thất bại.';
          return;
        }
        this.load();
      },
      error: () => {
        this.error = 'Không thể cập nhật trạng thái khách hàng.';
      }
    });
  }

  onDelete(row: AdminUserResponse): void {
    if (!row?.id) return;
    if (!confirm(`Xóa khách hàng ${row.fullName || row.email || '#' + row.id}?`)) return;

    this.error = '';
    this.adminData.deleteUser(row.id).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.error = res?.message || 'Xóa khách hàng thất bại.';
          return;
        }
        this.load();
      },
      error: () => {
        this.error = 'Không thể xóa khách hàng.';
      }
    });
  }

  openConvert(row: AdminUserResponse): void {
    this.convertTarget = row;
    this.convertForm = {
      role: 'STAFF',
      branchId: this.branches[0]?.id ?? null,
      username: ''
    };
    this.suggestConvertUsername();
    this.convertOpen = true;
  }

  closeConvert(): void {
    this.convertOpen = false;
    this.convertLoading = false;
    this.convertTarget = null;
  }

  suggestConvertUsername(): void {
    const rolePrefix = this.convertForm.role === 'MANAGER' ? 'QL' : 'NV';
    const branch = this.branches.find((item) => item.id === this.convertForm.branchId);
    const branchCode = (branch?.code || 'CN').toUpperCase();
    const seed = this.convertTarget?.id ? String(this.convertTarget.id).padStart(4, '0') : '0001';
    this.convertForm.username = `${rolePrefix}_${branchCode}_${seed}`;
  }

  submitConvert(): void {
    if (!this.convertTarget?.id) return;
    if (!this.convertForm.branchId) {
      this.error = 'Vui lòng chọn chi nhánh cho tài khoản hệ thống.';
      return;
    }

    this.convertLoading = true;
    this.error = '';

    this.adminData
      .updateUser(this.convertTarget.id, {
        fullName: this.convertTarget.fullName || undefined,
        email: this.convertTarget.email || undefined,
        username: this.convertForm.username?.trim() || undefined,
        phone: this.convertTarget.phone || undefined,
        roles: [this.convertForm.role],
        enabled: this.convertTarget.enabled !== false,
        branchId: this.convertForm.branchId
      })
      .subscribe({
        next: (res) => {
          this.convertLoading = false;
          if (!res?.success) {
            this.error = res?.message || 'Chuyển tài khoản thất bại.';
            return;
          }
          this.closeConvert();
          this.load();
        },
        error: (err: unknown) => {
          this.convertLoading = false;
          const error = err as HttpErrorResponse;
          this.error = error?.error?.message || error?.message || 'Không thể chuyển tài khoản khách hàng.';
        }
      });
  }

  approveDeleteRequest(row: AdminUserResponse): void {
    alert(`Luồng duyệt xóa tài khoản cho khách hàng #${row.id} cần backend riêng. Mình đã để sẵn nút để nối tiếp khi có API.`);
  }
}
