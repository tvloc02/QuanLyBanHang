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

  segmentLabel(seg?: string | null): string {
    const s = (seg || '').toUpperCase();
    switch (s) {
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

  formatVnd(v?: number | null): string {
    const n = typeof v === 'number' && isFinite(v) ? v : 0;
    return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
  }

  load(): void {
    this.error = '';
    this.loading = true;
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
}
