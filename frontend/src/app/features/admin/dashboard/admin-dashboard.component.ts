import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AdminStatsResponse, AdminStatsService } from '../../../core/services/admin-stats.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent {
  loading = false;
  error = '';
  stats: AdminStatsResponse | null = null;

  constructor(private adminStats: AdminStatsService) {
    this.load();
  }

  load(): void {
    this.error = '';
    this.loading = true;
    this.adminStats.getStats().subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải thống kê.';
          return;
        }
        this.stats = res?.data || null;
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy thống kê.';
      }
    });
  }
}
