import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AdminStatsResponse, AdminStatsService } from '../../../core/services/admin-stats.service';
import { AdminBranchResponse, AdminDataService, AdminOrderSummaryResponse, AdminUserResponse } from '../../../core/services/admin-data.service';

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
  now = new Date();
  readonly heroQuotes = [
    'Chuc ban mot ngay lam viec hieu qua va tran day nang luong!',
    'Moi ngay la mot co hoi moi de tien bo hon hom qua.',
    'Kien tri hom nay se tao nen thanh cong ngay mai.',
    'Tap trung vao dieu quan trong, ket qua se tu den.',
    'Lam tot tung viec nho, ban se dat duoc dieu lon.'
  ];

  orders: AdminOrderSummaryResponse[] = [];
  users: AdminUserResponse[] = [];
  customers: AdminUserResponse[] = [];
  branches: AdminBranchResponse[] = [];

  revenue7d: { label: string; value: number }[] = [];
  orders7d: { label: string; value: number }[] = [];

  revenue7dTotal = 0;
  orders7dTotal = 0;

  revenueBars: { x: number; y: number; w: number; h: number; label: string; value: number }[] = [];
  ordersBars: { x: number; y: number; w: number; h: number; label: string; value: number }[] = [];

  roleSeries: { label: string; value: number }[] = [];
  roleStackBars: {
    key: 'ADMIN' | 'MANAGER' | 'STAFF';
    x: number;
    w: number;
    total: number;
    totalY: number;
    trackY: number;
    trackH: number;
    baseline: number;
    segments: { key: string; label: string; value: number; y: number; h: number; color: string }[];
  }[] = [];
  roleTotal = 0;

  roleBranchLegend: { key: string; label: string; color: string }[] = [];

  customerSegmentRows: { key: string; label: string; count: number }[] = [];

  statusStats: { key: string; label: string; count: number; pct: number }[] = [];

  constructor(private adminStats: AdminStatsService, private adminData: AdminDataService) {
    this.load();
  }

  get greeting(): string {
    const hour = this.now.getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  get currentDateTimeLabel(): string {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(this.now);
  }

  get currentTimeWithSecondsLabel(): string {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(this.now);
  }

  get currentLongDateLabel(): string {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(this.now);
  }

  get dailyQuote(): string {
    return this.heroQuotes[this.now.getDate() % this.heroQuotes.length];
  }

  get orderCompletionPct(): number {
    const delivered = this.statusStats.find((item) => item.key.toUpperCase() === 'DELIVERED')?.count || 0;
    return this.statsOrders > 0 ? Math.round((delivered / this.statsOrders) * 100) : 0;
  }

  get statsOrders(): number {
    return Number(this.stats?.orders || 0);
  }

  get statsProducts(): number {
    return Number(this.stats?.products || 0);
  }

  get statsUsers(): number {
    return Number(this.stats?.users || 0);
  }

  get statsCoupons(): number {
    return Number(this.stats?.coupons || 0);
  }

  get statsCategories(): number {
    return Number(this.stats?.categories || 0);
  }

  get statsReviews(): number {
    return Number(this.stats?.reviews || 0);
  }

  get customersCount(): number {
    return Array.isArray(this.customers) ? this.customers.length : 0;
  }

  load(): void {
    this.error = '';
    this.loading = true;

    let statsDone = false;
    let ordersDone = false;
    let usersDone = false;
    let customersDone = false;
    let branchesDone = false;

    const finish = () => {
      if (statsDone && ordersDone && usersDone && customersDone && branchesDone) {
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

    this.adminData.getUsers().subscribe({
      next: (res: any) => {
        usersDone = true;
        if (!res?.success) {
          if (!this.error) this.error = res?.message || 'Không thể tải danh sách người dùng.';
          finish();
          return;
        }
        this.users = Array.isArray(res?.data) ? res.data : [];
        this.computeRoleChart();
        finish();
      },
      error: () => {
        usersDone = true;
        if (!this.error) this.error = 'Không thể kết nối backend để lấy người dùng.';
        finish();
      }
    });

    this.adminData.getBranches().subscribe({
      next: (res: any) => {
        branchesDone = true;
        if (!res?.success) {
          this.branches = [];
          this.computeRoleChart();
          finish();
          return;
        }
        this.branches = Array.isArray(res?.data) ? res.data : [];
        this.computeRoleChart();
        finish();
      },
      error: () => {
        branchesDone = true;
        this.branches = [];
        this.computeRoleChart();
        finish();
      }
    });

    this.adminData.getCustomers().subscribe({
      next: (res: any) => {
        customersDone = true;
        if (!res?.success) {
          if (!this.error) this.error = res?.message || 'Không thể tải danh sách khách hàng.';
          finish();
          return;
        }
        this.customers = Array.isArray(res?.data) ? res.data : [];
        this.computeCustomerSegments();
        finish();
      },
      error: () => {
        customersDone = true;
        if (!this.error) this.error = 'Không thể kết nối backend để lấy khách hàng.';
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

  private computeRoleChart(): void {
    const roles = { ADMIN: 0, MANAGER: 0, STAFF: 0 };

    const managerByBranch = new Map<string, number>();
    const staffByBranch = new Map<string, number>();

    for (const u of this.users) {
      const set = new Set((u?.roles || []).map((r) => (r || '').toString().toUpperCase()));
      if (set.has('ADMIN')) roles.ADMIN += 1;
      if (set.has('MANAGER')) {
        roles.MANAGER += 1;
        const k = u?.branchId != null ? String(u.branchId) : 'NO_BRANCH';
        managerByBranch.set(k, (managerByBranch.get(k) || 0) + 1);
      }
      if (set.has('STAFF')) {
        roles.STAFF += 1;
        const k = u?.branchId != null ? String(u.branchId) : 'NO_BRANCH';
        staffByBranch.set(k, (staffByBranch.get(k) || 0) + 1);
      }
    }

    this.roleSeries = [
      { label: 'Admin', value: roles.ADMIN },
      { label: 'Quản lý', value: roles.MANAGER },
      { label: 'Nhân viên', value: roles.STAFF }
    ];
    this.roleTotal = this.roleSeries.reduce((a, b) => a + Number(b.value || 0), 0);

    const branchLabel = (key: string): string => {
      if (key === 'NO_BRANCH') return 'Chưa gán CN';
      const id = Number(key);
      if (!Number.isFinite(id)) return `CN ${key}`;
      const b = (this.branches || []).find((x) => Number(x?.id) === id);
      if (!b) return `CN ${id}`;
      const name = (b.name || '').trim();
      const code = (b.code || '').trim();
      if (code && name) return `${code} - ${name}`;
      return name || code || `CN ${id}`;
    };

    const totalsByBranch = new Map<string, number>();
    for (const [k, v] of managerByBranch.entries()) totalsByBranch.set(k, (totalsByBranch.get(k) || 0) + v);
    for (const [k, v] of staffByBranch.entries()) totalsByBranch.set(k, (totalsByBranch.get(k) || 0) + v);

    const sortedBranchKeys = Array.from(totalsByBranch.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

    const maxBranches = 5;
    const topKeys = sortedBranchKeys.slice(0, maxBranches);
    const hasOther = sortedBranchKeys.length > maxBranches;

    const palette = ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#a78bfa', '#f59e0b', '#10b981'];
    const legend: { key: string; label: string; color: string }[] = [];
    for (let i = 0; i < topKeys.length; i++) {
      legend.push({ key: topKeys[i], label: branchLabel(topKeys[i]), color: palette[i % palette.length] });
    }
    if (hasOther) {
      legend.push({ key: 'OTHER', label: 'Khác', color: '#94a3b8' });
    }
    this.roleBranchLegend = legend;

    const roleSegments = (m: Map<string, number>): Array<{ key: string; label: string; value: number; color: string }> => {
      const items: Array<{ key: string; label: string; value: number; color: string }> = [];

      let other = 0;
      for (const [k, v] of m.entries()) {
        if (!topKeys.includes(k)) other += v;
      }

      for (const seg of legend) {
        if (seg.key === 'OTHER') {
          items.push({ key: seg.key, label: seg.label, value: other, color: seg.color });
        } else {
          items.push({ key: seg.key, label: seg.label, value: m.get(seg.key) || 0, color: seg.color });
        }
      }

      return items;
    };

    const stacked = [
      {
        key: 'ADMIN' as const,
        label: 'Admin',
        total: roles.ADMIN,
        segments: [{ key: 'ALL', label: 'Admin', value: roles.ADMIN, color: '#7c3aed' }]
      },
      {
        key: 'MANAGER' as const,
        label: 'Quản lý',
        total: roles.MANAGER,
        segments: roleSegments(managerByBranch)
      },
      {
        key: 'STAFF' as const,
        label: 'Nhân viên',
        total: roles.STAFF,
        segments: roleSegments(staffByBranch)
      }
    ];

    this.roleStackBars = this.buildStackedBars(stacked, 700, 180, 14);
  }

  private buildStackedBars(
    series: Array<{
      key: 'ADMIN' | 'MANAGER' | 'STAFF';
      label: string;
      total: number;
      segments: Array<{ key: string; label: string; value: number; color: string }>;
    }>,
    width: number,
    height: number,
    pad: number
  ) {
    const w = width;
    const h = height;
    const chartW = w - pad * 2;
    const chartH = h - pad * 2;
    const baseline = pad + chartH;

    const max = Math.max(1, ...series.map((s) => Number(s.total || 0)));

    const slots = Math.max(1, series.length);
    const slotW = chartW / slots;
    const bw = Math.min(30, Math.max(12, Math.floor(slotW * 0.28)));

    return series.map((s, i) => {
      const total = Number(s.total || 0);
      const totalH = Math.round((total / max) * chartH);

      const x = Math.round(pad + slotW * i + (slotW - bw) / 2);
      const wBar = bw;

      const segs = (s.segments || []).filter((x2) => Number(x2.value || 0) > 0);
      const outSegs: { key: string; label: string; value: number; y: number; h: number; color: string }[] = [];
      if (total > 0 && segs.length) {
        let used = 0;
        for (let si = 0; si < segs.length; si++) {
          const seg = segs[si];
          const v = Number(seg.value || 0);
          let hh = si === segs.length - 1 ? Math.max(0, totalH - used) : Math.round((v / total) * totalH);
          if (hh < 0) hh = 0;
          if (used + hh > totalH) hh = Math.max(0, totalH - used);
          const y = baseline - used - hh;
          outSegs.push({ key: seg.key, label: seg.label, value: v, y, h: hh, color: seg.color });
          used += hh;
          if (used >= totalH) break;
        }
      }

      return {
        key: s.key,
        x,
        w: wBar,
        total,
        totalY: total > 0 ? baseline - totalH - 10 : baseline - 10,
        trackY: pad,
        trackH: chartH,
        baseline,
        segments: outSegs
      };
    });
  }

  private computeCustomerSegments(): void {
    const order: Array<{ key: string; label: string }> = [
      { key: 'TIEM_NANG', label: 'Tiềm năng' },
      { key: 'THAN_THIET', label: 'Thân thiết' },
      { key: 'BAC', label: 'Bạc' },
      { key: 'VANG', label: 'Vàng' },
      { key: 'KIM_CUONG', label: 'Kim cương' }
    ];

    const counts = new Map<string, number>();
    for (const c of this.customers) {
      const key = (c?.customerSegment || '').toString().toUpperCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    this.customerSegmentRows = order.map((o) => ({
      key: o.key,
      label: o.label,
      count: counts.get(o.key) || 0
    }));
  }

  formatInt(v: number): string {
    return new Intl.NumberFormat('vi-VN').format(v || 0);
  }

  formatVnd(v?: number | null): string {
    const n = typeof v === 'number' && isFinite(v) ? v : 0;
    return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
  }
}
