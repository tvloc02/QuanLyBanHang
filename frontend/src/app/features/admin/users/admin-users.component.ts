import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
  roleFilter: 'ALL' | 'ADMIN' | 'MANAGER' | 'STAFF' = 'ALL';
  statusFilter: 'ALL' | 'ACTIVE' | 'LOCKED' = 'ALL';

  page = 1;
  pageSize = 10;
  pageSizeOptions: number[] = [10, 50, 100, 500];

  createOpen = false;
  createLoading = false;
  viewOpen = false;
  selectedUser: AdminUserResponse | null = null;
  branches: Array<{ id: number; name: string; code: string }> = [];
  createUsernameTouched = false;

  form: {
    fullName?: string;
    email?: string;
    username?: string;
    phone?: string;
    role: 'ADMIN' | 'MANAGER' | 'STAFF';
    enabled: boolean;
    branchId?: number | null;
  } = {
    fullName: '',
    email: '',
    username: '',
    phone: '',
    role: 'STAFF',
    enabled: true,
    branchId: null
  };

  editUsernameTouched = false;
  editOpen = false;
  editLoading = false;
  editForm: {
    id?: number;
    fullName?: string;
    email?: string;
    username?: string;
    phone?: string;
    role: 'ADMIN' | 'MANAGER' | 'STAFF';
    enabled: boolean;
    branchId?: number | null;
  } = {
    id: undefined,
    fullName: '',
    email: '',
    username: '',
    phone: '',
    role: 'STAFF',
    enabled: true,
    branchId: null
  };

  constructor(private adminData: AdminDataService) {
    this.loadBranches();
    this.load();
  }

  branchLabel(branchId?: number | null): string {
    if (!branchId) return '-';
    const b = (this.branches || []).find((x) => x.id === branchId);
    if (!b) return `#${branchId}`;
    const code = (b.code || '').trim();
    const name = (b.name || '').trim();
    return code ? `${code} - ${name}` : name || `#${branchId}`;
  }

  branchCode(branchId?: number | null): string {
    if (!branchId) return '-';
    const b = (this.branches || []).find((x) => x.id === branchId);
    if (!b) return `#${branchId}`;
    const code = (b.code || '').trim();
    return code || `#${branchId}`;
  }

  private pad4(n: number): string {
    const v = Math.max(0, Math.floor(Number(n) || 0));
    return String(v).padStart(4, '0');
  }

  private nextUserSeq(prefix: string, excludeUserId?: number): number {
    const p = String(prefix || '').toUpperCase();
    let max = 0;
    for (const r of this.rows || []) {
      if (!r) continue;
      if (excludeUserId != null && r.id === excludeUserId) continue;
      const u = String(r.username || '').trim().toUpperCase();
      if (!u.startsWith(p)) continue;
      const m = u.match(/_(\d{4})$/);
      if (!m) continue;
      const n = Number(m[1]);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
    return max + 1;
  }

  private suggestUsername(
    role: 'ADMIN' | 'MANAGER' | 'STAFF',
    branchId?: number | null,
    excludeUserId?: number
  ): string {
    if (role === 'ADMIN') return 'ADMIN01';
    const bc = String(this.branchCode(branchId) || '').trim().toUpperCase();
    if (!bc || bc === '-' || bc.startsWith('#')) return '';
    const prefix = role === 'MANAGER' ? `QL_${bc}` : `NV_${bc}`;
    const seq = this.nextUserSeq(prefix, excludeUserId);
    return `${prefix}_${this.pad4(seq)}`;
  }

  onCreateRoleOrBranchChanged(): void {
    if (this.createUsernameTouched) return;
    const next = this.suggestUsername(this.form.role, this.form.branchId);
    if (next) this.form = { ...this.form, username: next };
  }

  onEditRoleOrBranchChanged(): void {
    if (this.editUsernameTouched) return;
    const next = this.suggestUsername(this.editForm.role, this.editForm.branchId, this.editForm.id);
    if (next) this.editForm = { ...this.editForm, username: next };
  }

  private loadBranches(): void {
    this.adminData.getBranches().subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.branches = rows
          .filter((x) => !!x && typeof x.id === 'number')
          .map((x) => ({ id: x.id, name: String(x.name || ''), code: String(x.code || '') }));
      },
      error: () => {
        this.branches = [];
      }
    });
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
      const hay = [r.id, r.fullName || '', r.email || '', r.username || '', r.phone || '', this.formatRoles(r.roles)]
        .map((x) => (x ?? '').toString().toLowerCase())
        .join(' ');
      return hay.includes(q);
    });
  }

  get totalFiltered(): number {
    return this.filteredRows.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalFiltered / this.pageSize));
  }

  get pagedRows(): AdminUserResponse[] {
    const p = Math.min(Math.max(1, this.page), this.totalPages);
    const start = (p - 1) * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get rangeFrom(): number {
    if (this.totalFiltered === 0) return 0;
    return (Math.min(Math.max(1, this.page), this.totalPages) - 1) * this.pageSize + 1;
  }

  get rangeTo(): number {
    if (this.totalFiltered === 0) return 0;
    const p = Math.min(Math.max(1, this.page), this.totalPages);
    return Math.min(p * this.pageSize, this.totalFiltered);
  }

  get pageItems(): Array<number | string> {
    const total = this.totalPages;
    const current = Math.min(Math.max(1, this.page), total);

    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  onFiltersChanged(): void {
    this.page = 1;
  }

  setPageSize(next: number): void {
    const v = Number(next) || 10;
    this.pageSize = v;
    this.page = 1;
  }

  goToPage(p: number): void {
    this.page = Math.min(Math.max(1, p), this.totalPages);
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
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  formatRoles(roles?: string[]): string {
    if (!roles || roles.length === 0) return '-';
    return roles.map((r) => this.roleLabel(r)).join(', ');
  }

  roleLabel(role?: string): string {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị';
      case 'MANAGER':
        return 'Quản lý';
      case 'STAFF':
        return 'Nhân viên';
      case 'CUSTOMER':
      case 'USER':
        return 'Khách hàng';
      default:
        return role || '-';
    }
  }

  primaryRole(row: AdminUserResponse): 'ADMIN' | 'MANAGER' | 'STAFF' {
    const roles = row?.roles || [];
    if (roles.includes('ADMIN')) return 'ADMIN';
    if (roles.includes('MANAGER')) return 'MANAGER';
    if (roles.includes('STAFF')) return 'STAFF';
    return 'STAFF';
  }

  private isAdminListUser(row: AdminUserResponse): boolean {
    const roles = row?.roles || [];
    return roles.includes('ADMIN') || roles.includes('MANAGER') || roles.includes('STAFF');
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
        const rows = Array.isArray(res.data) ? res.data : [];
        this.rows = rows.filter((x) => this.isAdminListUser(x));
        if (this.page > this.totalPages) this.page = this.totalPages;
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy người dùng.';
      }
    });
  }

  openCreate(): void {
    this.createUsernameTouched = false;
    this.form = { fullName: '', email: '', username: '', phone: '', role: 'STAFF', enabled: true, branchId: null };
    this.onCreateRoleOrBranchChanged();
    this.createOpen = true;
  }

  cancelCreate(): void {
    this.createOpen = false;
  }

  submitCreate(): void {
    this.createLoading = true;
    this.error = '';

    const branchId = this.form.role === 'ADMIN' ? null : (this.form.branchId ?? null);
    if ((this.form.role === 'MANAGER' || this.form.role === 'STAFF') && !branchId) {
      this.createLoading = false;
      this.error = 'Vui lòng chọn chi nhánh.';
      return;
    }

    const username =
      (this.form.username || '').trim() ||
      (this.form.role === 'ADMIN' ? 'ADMIN01' : this.suggestUsername(this.form.role, branchId));

    if (!username) {
      this.createLoading = false;
      this.error = 'Không thể sinh mã nhân viên. Vui lòng kiểm tra mã chi nhánh.';
      return;
    }

    this.adminData
      .createUser({
        fullName: this.form.fullName?.trim() || undefined,
        email: this.form.email?.trim() || undefined,
        username: username || undefined,
        phone: this.form.phone?.trim() || undefined,
        roles: [this.form.role],
        enabled: !!this.form.enabled,
        branchId
      })
      .subscribe({
        next: (res) => {
          this.createLoading = false;
          if (!res?.success) {
            this.error = res?.message || 'Tạo người dùng thất bại.';
            return;
          }
          this.createOpen = false;
          this.load();
        },
        error: (err: unknown) => {
          this.createLoading = false;
          const e = err as HttpErrorResponse;
          this.error = e?.error?.message || e?.error?.error || e?.message || 'Không thể tạo người dùng. Vui lòng thử lại.';
        }
      });
  }

  onView(row: AdminUserResponse): void {
    this.selectedUser = row;
    this.viewOpen = true;
  }

  onEdit(row: AdminUserResponse): void {
    const role = (row.roles || []).includes('ADMIN')
      ? 'ADMIN'
      : (row.roles || []).includes('MANAGER')
        ? 'MANAGER'
        : 'STAFF';
    const branchId = role === 'ADMIN' ? null : (row.branchId ?? null);

    this.editForm = {
      id: row.id,
      fullName: row.fullName || '',
      email: row.email || '',
      username: row.username || '',
      phone: row.phone || '',
      role,
      enabled: row.enabled !== false,
      branchId
    };

    this.editUsernameTouched = false;
    this.onEditRoleOrBranchChanged();
    this.editOpen = true;
  }

  onDelete(row: AdminUserResponse): void {
    if (!row?.id) return;
    const name = row.fullName || row.username || row.email || `#${row.id}`;
    if (!confirm(`Xóa người dùng ${name}? Thao tác này không thể hoàn tác.`)) return;

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
    if (!confirm(`Bạn có chắc muốn reset mật khẩu cho tài khoản #${row.id}?`)) return;

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
    const newEnabled = !target;
    const message = newEnabled ? `Mở khóa tài khoản #${row.id}?` : `Khóa tài khoản #${row.id}?`;
    if (!confirm(message)) return;

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

    const branchId = this.editForm.role === 'ADMIN' ? null : (this.editForm.branchId ?? null);
    if ((this.editForm.role === 'MANAGER' || this.editForm.role === 'STAFF') && !branchId) {
      this.editLoading = false;
      this.error = 'Vui lòng chọn chi nhánh.';
      return;
    }

    const username =
      (this.editForm.username || '').trim() ||
      (this.editForm.role === 'ADMIN' ? 'ADMIN01' : this.suggestUsername(this.editForm.role, branchId, this.editForm.id));

    if (!username) {
      this.editLoading = false;
      this.error = 'Không thể sinh mã nhân viên. Vui lòng kiểm tra mã chi nhánh.';
      return;
    }

    this.adminData
      .updateUser(this.editForm.id, {
        fullName: this.editForm.fullName?.trim() || undefined,
        email: this.editForm.email?.trim() || undefined,
        username: username || undefined,
        phone: this.editForm.phone?.trim() || undefined,
        roles: [this.editForm.role],
        enabled: !!this.editForm.enabled,
        branchId
      })
      .subscribe({
        next: (res) => {
          this.editLoading = false;
          if (!res?.success) {
            this.error = res?.message || 'Cập nhật người dùng thất bại.';
            return;
          }
          this.editOpen = false;
          this.load();
        },
        error: (err: unknown) => {
          this.editLoading = false;
          const e = err as HttpErrorResponse;
          this.error = e?.error?.message || e?.error?.error || e?.message || 'Không thể cập nhật người dùng. Vui lòng thử lại.';
        }
      });
  }
}
