import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AdminDataService, AdminReviewResponse } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-reviews.component.html',
  styleUrls: ['./admin-reviews.component.scss']
})
export class AdminReviewsComponent {
  loading = false;
  error = '';
  rows: AdminReviewResponse[] = [];

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  get totalReviews(): number {
    return (this.rows || []).length;
  }

  get avgRating(): number {
    const src = this.rows || [];
    if (!src.length) return 0;
    const sum = src.reduce((s, r) => {
      const n = Number((r as any)?.rating ?? 0);
      return s + (Number.isFinite(n) ? n : 0);
    }, 0);
    return sum / src.length;
  }

  get fiveStarCount(): number {
    return (this.rows || []).filter((r) => Number((r as any)?.rating ?? 0) >= 5).length;
  }

  load(): void {
    this.error = '';
    this.loading = true;
    this.adminData.getReviews().subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách đánh giá.';
          return;
        }
        this.rows = Array.isArray(res.data) ? res.data : [];
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy đánh giá.';
      }
    });
  }

  formatDate(input?: string | null): string {
    if (!input) return '-';
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  }

  formatRating(input: any): string {
    const n = Number(input);
    if (!Number.isFinite(n)) return '0.0';
    return n.toFixed(1);
  }
}
