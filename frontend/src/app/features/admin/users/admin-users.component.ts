import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataService, AdminUserResponse } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent {
  loading = false;
  error = '';
  rows: AdminUserResponse[] = [];

  q = '';
  roleFilter: 'ALL' | 'ADMIN' | 'STAFF' | 'CUSTOMER' = 'ALL';
  statusFilter: 'ALL' | 'ACTIVE' | 'LOCKED' = 'ALL';

  createOpen = false;
  createLoading = false;
  viewOpen = false;
  selectedUser: AdminUserResponse | null = null;
  form: { fullName?: string; email?: string; username?: string; phone?: string; role: 'ADMIN' | 'STAFF' | 'CUSTOMER'; enabled: boolean } = {
    fullName: '',
    email: '',
    username: '',
    phone: '',
    role: 'CUSTOMER',
    enabled: true
  };

  // Edit modal state
  editOpen = false;
  editLoading = false;
  editForm: { id?: number; fullName?: string; email?: string; username?: string; phone?: string; role: 'ADMIN' | 'STAFF' | 'CUSTOMER'; enabled: boolean } = {
    id: undefined,
    fullName: '',
    email: '',
    username: '',
    phone: '',
    role: 'CUSTOMER',
    enabled: true
  };

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  get totalCount(): number {
    return this.rows.length;
  }

  get activeCount(): number {
    return this.rows.filter((x) => x.enabled !== false).length;
  }

  get lockedCount(): number {
    return this.rows.filter((x) => x.enabled === false).length;
  }

  get filteredRows(): AdminUserResponse[] {
    const q = (this.q || '').trim().toLowerCase();
    return (this.rows || []).filter((r) => {
      if (!r) return false;

      if (this.roleFilter !== 'ALL') {
        const role = this.primaryRole(r);
        if (role !== this.roleFilter) return false;
      }

      if (this.statusFilter !== 'ALL') {
        const enabled = r.enabled !== false;
        if (this.statusFilter === 'ACTIVE' && !enabled) return false;
        if (this.statusFilter === 'LOCKED' && enabled) return false;
      }

      if (!q) return true;
      const hay = [
        r.id,
        r.fullName || '',
        r.email || '',
        r.username || '',
        r.phone || '',
        this.formatRoles(r.roles)
      ]
        .map((x) => (x ?? '').toString().toLowerCase())
        .join(' ');
      return hay.includes(q);
    });
  }

  exportCsv(): void {
    const headers = ['ID', 'Họ tên', 'Email', 'Username', 'SĐT', 'Vai trò', 'Trạng thái', 'Ngày tạo'];
    const escape = (v: unknown) => {
      const s = (v ?? '').toString();
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const lines = [headers.map(escape).join(',')];
    for (const r of this.filteredRows) {
      lines.push(
        [
          r.id,
          r.fullName || '',
          r.email || '',
          r.username || '',
          r.phone || '',
          this.formatRoles(r.roles),
          r.enabled === false ? 'Khóa' : 'Hoạt động',
          r.createdAt || ''
        ]
          .map(escape)
          .join(',')
      );
    }

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `users_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  formatRoles(roles?: string[]): string {
    if (!roles || roles.length === 0) return '-';
    return roles.map(r => this.roleLabel(r)).join(', ');
  }

  roleLabel(role?: string): string {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị';
      case 'STAFF':
        return 'Nhân viên';
      case 'CUSTOMER':
      case 'USER':
        return 'Khách hàng';
      default:
        return role || '-';
    }
  }

  primaryRole(row: AdminUserResponse): 'ADMIN' | 'STAFF' | 'CUSTOMER' {
    const roles = row?.roles || [];
    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('STAFF')) return 'STAFF';
    return 'CUSTOMER';
  }

  load(): void {
    this.error = '';
    this.loading = true;
    this.adminData.getUsers().subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách người dùng.';
          return;
        }
        this.rows = Array.isArray(res.data) ? res.data : [];
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy người dùng.';
      }
    });
  }

  openCreate(): void {
    this.form = { fullName: '', email: '', username: '', phone: '', role: 'CUSTOMER', enabled: true };
    this.createOpen = true;
  }

  cancelCreate(): void {
    this.createOpen = false;
  }

  submitCreate(): void {
    this.createLoading = true;
    this.error = '';
    this.adminData.createUser({
      fullName: this.form.fullName?.trim() || undefined,
      email: this.form.email?.trim() || undefined,
      username: this.form.username?.trim() || undefined,
      phone: this.form.phone?.trim() || undefined,
      roles: [this.form.role],
      enabled: !!this.form.enabled
    }).subscribe({
      next: (res) => {
        this.createLoading = false;
        if (!res?.success) {
          this.error = res?.message || 'Tạo người dùng thất bại.';
          return;
        }
        this.createOpen = false;
        this.load();
      },
      error: () => {
        this.createLoading = false;
        this.error = 'Không thể tạo người dùng. Vui lòng thử lại.';
      }
    });
  }

  onView(row: AdminUserResponse): void {
    this.selectedUser = row;
    this.viewOpen = true;
  }

  onEdit(row: AdminUserResponse): void {
    // Prefill edit form
    const role = (row.roles || []).includes('ADMIN')
      ? 'ADMIN'
      : (row.roles || []).includes('STAFF')
      ? 'STAFF'
      : 'CUSTOMER';
    this.editForm = {
      id: row.id,
      fullName: row.fullName || '',
      email: row.email || '',
      username: row.username || '',
      phone: row.phone || '',
      role,
      enabled: row.enabled !== false
    };
    this.editOpen = true;
  }

  onDelete(row: AdminUserResponse): void {
    if (!row?.id) return;
    const name = row.fullName || row.username || row.email || `#${row.id}`;
    const ok = confirm(`Xóa người dùng ${name}? Thao tác này không thể hoàn tác.`);
    if (!ok) return;

    this.error = '';
    this.adminData.deleteUser(row.id).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.error = res?.message || 'Xóa người dùng thất bại.';
          return;
        }
        this.load();
      },
      error: () => {
        this.error = 'Không thể xóa người dùng. Vui lòng thử lại.';
      }
    });
  }

  onResetPassword(row: AdminUserResponse): void {
    if (!row?.id) return;
    const ok = confirm(`Bạn có chắc muốn reset mật khẩu cho tài khoản #${row.id}?`);
    if (!ok) return;
    this.adminData.resetUserPassword(row.id).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.error = res?.message || 'Reset mật khẩu thất bại.';
          return;
        }
        alert('Đã reset mật khẩu. Mật khẩu được đặt về: 12345678');
      },
      error: () => {
        this.error = 'Không thể reset mật khẩu. Vui lòng thử lại.';
      }
    });
  }

  onToggleEnabled(row: AdminUserResponse): void {
    if (!row?.id) return;
    const target = !(row.enabled === false);
    const newEnabled = !target; // nếu đang hoạt động (true), sẽ khóa (false)
    const message = newEnabled ? `Mở khóa tài khoản #${row.id}?` : `Khóa tài khoản #${row.id}?`;
    const ok = confirm(message);
    if (!ok) return;
    this.adminData.setUserEnabled(row.id, newEnabled).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.error = res?.message || 'Cập nhật trạng thái tài khoản thất bại.';
          return;
        }
        this.load();
      },
      error: () => {
        this.error = 'Không thể cập nhật trạng thái tài khoản. Vui lòng thử lại.';
      }
    });
  }

  closeView(): void {
    this.viewOpen = false;
    this.selectedUser = null;
  }

  cancelEdit(): void {
    this.editOpen = false;
  }

  submitEdit(): void {
    if (!this.editForm.id) return;
    this.editLoading = true;
    this.error = '';
    this.adminData.updateUser(this.editForm.id, {
      fullName: this.editForm.fullName?.trim() || undefined,
      email: this.editForm.email?.trim() || undefined,
      username: this.editForm.username?.trim() || undefined,
      phone: this.editForm.phone?.trim() || undefined,
      roles: [this.editForm.role],
      enabled: !!this.editForm.enabled
    }).subscribe({
      next: (res) => {
        this.editLoading = false;
        if (!res?.success) {
          this.error = res?.message || 'Cập nhật người dùng thất bại.';
          return;
        }
        this.editOpen = false;
        this.load();
      },
      error: () => {
        this.editLoading = false;
        this.error = 'Không thể cập nhật người dùng. Vui lòng thử lại.';
      }
    });
  }
}
