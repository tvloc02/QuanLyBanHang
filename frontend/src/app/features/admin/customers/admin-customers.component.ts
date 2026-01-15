import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AdminDataService, AdminUserResponse } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-customers.component.html',
  styleUrls: ['./admin-customers.component.scss']
})
export class AdminCustomersComponent {
  loading = false;
  error = '';
  rows: AdminUserResponse[] = [];

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  private isCustomer(u: AdminUserResponse): boolean {
    const roles = (u.roles || []).map((r) => (r || '').toUpperCase());
    // Xem là khách hàng khi KHÔNG có role ADMIN/STAFF
    return !roles.includes('ADMIN') && !roles.includes('STAFF');
  }

  load(): void {
    this.error = '';
    this.loading = true;
    this.adminData.getUsers().subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách khách hàng.';
          return;
        }
        const all = Array.isArray(res.data) ? res.data : [];
        this.rows = all.filter((u) => this.isCustomer(u));
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy khách hàng.';
      }
    });
  }
}
