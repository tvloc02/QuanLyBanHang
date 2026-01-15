import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AdminDataService, AdminOrderSummaryResponse } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.scss']
})
export class AdminOrdersComponent {
  loading = false;
  error = '';
  rows: AdminOrderSummaryResponse[] = [];

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  load(): void {
    this.error = '';
    this.loading = true;
    this.adminData.getOrders().subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách đơn hàng.';
          return;
        }
        this.rows = Array.isArray(res.data) ? res.data : [];
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy đơn hàng.';
      }
    });
  }

  formatDate(input?: string | null): string {
    if (!input) return '-';
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  }
}
