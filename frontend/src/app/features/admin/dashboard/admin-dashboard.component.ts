import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AdminStatsResponse, AdminStatsService } from '../../../core/services/admin-stats.service';
import { AdminDataService, AdminOrderSummaryResponse } from '../../../core/services/admin-data.service';

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

  orders: AdminOrderSummaryResponse[] = [];

  revenue7d: { label: string; value: number }[] = [];
  orders7d: { label: string; value: number }[] = [];

  revenue7dTotal = 0;
  orders7dTotal = 0;

  revenueBars: { x: number; y: number; w: number; h: number; label: string; value: number }[] = [];
  ordersBars: { x: number; y: number; w: number; h: number; label: string; value: number }[] = [];

  statusStats: { key: string; label: string; count: number; pct: number }[] = [];

  constructor(private adminStats: AdminStatsService, private adminData: AdminDataService) {
    this.load();
  }

  load(): void {
    this.error = '';
    this.loading = true;

    let statsDone = false;
    let ordersDone = false;

    const finish = () => {
      if (statsDone && ordersDone) {
        this.loading = false;
      }
    };

    this.adminStats.getStats().subscribe({
      next: (res) => {
        statsDone = true;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải thống kê.';
          finish();
          return;
        }
        this.stats = res?.data || null;
        finish();
      },
      error: () => {
        statsDone = true;
        this.error = 'Không thể kết nối backend để lấy thống kê.';
        finish();
      }
    });

    this.adminData.getOrders().subscribe({
      next: (res: any) => {
        ordersDone = true;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách đơn hàng.';
          finish();
          return;
        }
        this.orders = Array.isArray(res?.data) ? res.data : [];
        this.computeCharts();
        finish();
      },
      error: () => {
        ordersDone = true;
        this.error = 'Không thể kết nối backend để lấy đơn hàng.';
        finish();
      }
    });
  }

  private computeCharts(): void {
    const today = new Date();
    const days = this.lastDays(today, 7);

    const revenue = days.map((d) => ({ label: this.formatDayLabel(d), value: 0 }));
    const count = days.map((d) => ({ label: this.formatDayLabel(d), value: 0 }));

    for (const o of this.orders) {
      const dt = this.parseDate(o.createdAt);
      if (!dt) continue;
      const idx = this.indexOfDay(days, dt);
      if (idx === -1) continue;
      revenue[idx].value += Number(o.total || 0);
      count[idx].value += 1;
    }

    this.revenue7d = revenue;
    this.orders7d = count;

    this.revenue7dTotal = this.revenue7d.reduce((a, b) => a + Number(b.value || 0), 0);
    this.orders7dTotal = this.orders7d.reduce((a, b) => a + Number(b.value || 0), 0);

    this.revenueBars = this.buildBars(this.revenue7d, 700, 220, 18);
    this.ordersBars = this.buildBars(this.orders7d, 700, 220, 18);

    const statusMap = new Map<string, number>();
    for (const o of this.orders) {
      const key = (o.status || 'UNKNOWN').toString();
      statusMap.set(key, (statusMap.get(key) || 0) + 1);
    }

    const total = Array.from(statusMap.values()).reduce((a, b) => a + b, 0) || 1;
    const rows = Array.from(statusMap.entries())
      .map(([key, c]) => ({ key, label: this.formatStatusLabel(key), count: c, pct: Math.round((c * 1000) / total) / 10 }))
      .sort((a, b) => b.count - a.count);
    this.statusStats = rows;
  }

  private lastDays(ref: Date, n: number): Date[] {
    const start = new Date(ref);
    start.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      days.push(d);
    }
    return days;
  }

  private indexOfDay(days: Date[], dt: Date): number {
    const t = new Date(dt);
    t.setHours(0, 0, 0, 0);
    for (let i = 0; i < days.length; i++) {
      if (days[i].getTime() === t.getTime()) return i;
    }
    return -1;
  }

  private parseDate(s?: string | null): Date | null {
    if (!s) return null;
    const dt = new Date(s);
    if (!Number.isFinite(dt.getTime())) return null;
    return dt;
  }

  private formatDayLabel(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  }

  private formatStatusLabel(key: string): string {
    const k = key.toUpperCase();
    if (k === 'PENDING') return 'Chờ xử lý';
    if (k === 'PROCESSING') return 'Đang xử lý';
    if (k === 'SHIPPED') return 'Đang giao';
    if (k === 'DELIVERED') return 'Hoàn tất';
    if (k === 'CANCELLED') return 'Đã huỷ';
    return key;
  }

  private buildBars(series: { label: string; value: number }[], width: number, height: number, pad: number) {
    const max = Math.max(1, ...series.map((s) => s.value));
    const w = width;
    const h = height;
    const chartW = w - pad * 2;
    const chartH = h - pad * 2;

    const gap = 10;
    const bw = Math.max(12, Math.floor((chartW - gap * (series.length - 1)) / series.length));
    const startX = pad + Math.floor((chartW - (bw * series.length + gap * (series.length - 1))) / 2);

    return series.map((s, i) => {
      const v = Number(s.value || 0);
      const hh = Math.round((v / max) * chartH);
      const x = startX + i * (bw + gap);
      const y = pad + (chartH - hh);
      return { x, y, w: bw, h: hh, label: s.label, value: v };
    });
  }

  formatInt(v: number): string {
    return new Intl.NumberFormat('vi-VN').format(v || 0);
  }
}
