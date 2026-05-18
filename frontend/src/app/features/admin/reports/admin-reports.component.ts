import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { environment } from '../../../../environments/environment';
import {
  AdminDataService,
  AdminOrderDetailResponse,
  AdminOrderSummaryResponse,
  AdminProductStockSummaryResponse
} from '../../../core/services/admin-data.service';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ProductReportSource {
  id: number;
  sku?: string | null;
  name: string;
  slug?: string | null;
  category?: string | null;
  soldCount?: number | null;
  stock?: number | null;
}

interface ProductReportRow {
  productId: number;
  sku: string;
  name: string;
  category: string;
  soldQty: number;
  currentStock: number;
  revenue: number;
}

interface TrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

type ReportMode = 'month' | 'quarter';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.scss']
})
export class AdminReportsComponent implements OnInit {
  loading = false;
  error = '';
  detailsLoading = false;

  readonly modeOptions: Array<{ value: ReportMode; label: string }> = [
    { value: 'month', label: 'Theo tháng' },
    { value: 'quarter', label: 'Theo quý' }
  ];

  readonly monthOptions = [
    { value: 1, label: 'Tháng 1' }, { value: 2, label: 'Tháng 2' }, { value: 3, label: 'Tháng 3' },
    { value: 4, label: 'Tháng 4' }, { value: 5, label: 'Tháng 5' }, { value: 6, label: 'Tháng 6' },
    { value: 7, label: 'Tháng 7' }, { value: 8, label: 'Tháng 8' }, { value: 9, label: 'Tháng 9' },
    { value: 10, label: 'Tháng 10' }, { value: 11, label: 'Tháng 11' }, { value: 12, label: 'Tháng 12' }
  ];

  readonly quarterOptions = [
    { value: 1, label: 'Quý 1' },
    { value: 2, label: 'Quý 2' },
    { value: 3, label: 'Quý 3' },
    { value: 4, label: 'Quý 4' }
  ];

  readonly successStatuses = new Set(['DELIVERED', 'RATED', 'COMPLETED']);
  readonly cancelledStatuses = new Set(['CANCELLED', 'REJECTED']);
  readonly excludedRevenueStatuses = new Set(['CANCELLED', 'REJECTED', 'RETURN_REJECTED']);

  reportMode: ReportMode = 'month';
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;
  selectedQuarter = Math.floor(new Date().getMonth() / 3) + 1;

  yearOptions: number[] = [];

  orders: AdminOrderSummaryResponse[] = [];
  products: ProductReportSource[] = [];
  stockRows: AdminProductStockSummaryResponse[] = [];

  filteredOrders: AdminOrderSummaryResponse[] = [];
  filteredDetails: AdminOrderDetailResponse[] = [];
  productRows: ProductReportRow[] = [];
  trendPoints: TrendPoint[] = [];

  totalRevenue = 0;
  totalOrders = 0;
  totalSoldQty = 0;
  totalCurrentStock = 0;
  cancelRate = 0;
  successRate = 0;

  topRevenue = 0;
  topOrders = 0;
  topProductMetric = 0;

  private orderDetailCache = new Map<number, AdminOrderDetailResponse>();

  constructor(
    private adminData: AdminDataService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.yearOptions = this.buildYearOptions();
    this.load();
  }

  get periodLabel(): string {
    return this.reportMode === 'month'
      ? `Tháng ${this.selectedMonth}/${this.selectedYear}`
      : `Quý ${this.selectedQuarter}/${this.selectedYear}`;
  }

  get rangeLabel(): string {
    const [start, end] = this.getPeriodRange();
    return `${this.formatDate(start)} - ${this.formatDate(end)}`;
  }

  get topProductRows(): ProductReportRow[] {
    return this.productRows.slice(0, 12);
  }

  get chartRevenueBars(): Array<TrendPoint & { heightPct: number }> {
    const max = Math.max(1, ...this.trendPoints.map((point) => point.revenue || 0));
    return this.trendPoints.map((point) => ({
      ...point,
      heightPct: Math.max(8, Math.round(((point.revenue || 0) / max) * 100))
    }));
  }

  get chartOrderBars(): Array<TrendPoint & { heightPct: number }> {
    const max = Math.max(1, ...this.trendPoints.map((point) => point.orders || 0));
    return this.trendPoints.map((point) => ({
      ...point,
      heightPct: Math.max(8, Math.round(((point.orders || 0) / max) * 100))
    }));
  }

  get topProductBars(): Array<ProductReportRow & { widthPct: number }> {
    const rows = this.productRows.slice(0, 8);
    const max = Math.max(1, ...rows.map((row) => row.soldQty || 0));
    return rows.map((row) => ({
      ...row,
      widthPct: Math.max(8, Math.round(((row.soldQty || 0) / max) * 100))
    }));
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';

    try {
      const [ordersRes, productsRes, stockRes] = await Promise.all([
        firstValueFrom(this.adminData.getOrders()),
        firstValueFrom(this.http.get<ApiResponse<ProductReportSource[]>>(`${environment.apiBaseUrl}/api/products`)),
        firstValueFrom(this.adminData.getProductStockSummary())
      ]);

      this.orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
      this.products = Array.isArray(productsRes?.data) ? productsRes.data : [];
      this.stockRows = Array.isArray(stockRes?.data) ? stockRes.data : [];

      await this.refreshReport();
    } catch (error: any) {
      this.error = error?.error?.message || error?.message || 'Không thể tải dữ liệu báo cáo.';
    } finally {
      this.loading = false;
    }
  }

  async applyFilters(): Promise<void> {
    await this.refreshReport();
  }

  async onModeChange(): Promise<void> {
    await this.refreshReport();
  }

  async exportExcel(): Promise<void> {
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ['Kỳ báo cáo', this.periodLabel],
      ['Khoảng thời gian', this.rangeLabel],
      ['Doanh thu', this.totalRevenue],
      ['Tổng đơn hàng', this.totalOrders],
      ['Tổng sản phẩm đã bán', this.totalSoldQty],
      ['Tổng tồn kho hiện tại', this.totalCurrentStock],
      ['Tỷ lệ đơn hủy (%)', this.cancelRate],
      ['Tỷ lệ giao thành công (%)', this.successRate]
    ];

    const productRows = this.productRows.map((row, index) => ({
      STT: index + 1,
      SKU: row.sku,
      'Sản phẩm': row.name,
      'Danh mục': row.category,
      'Đã bán': row.soldQty,
      'Tồn hiện tại': row.currentStock,
      'Doanh thu': row.revenue
    }));

    const trendRows = this.trendPoints.map((row) => ({
      'Mốc thời gian': row.label,
      'Doanh thu': row.revenue,
      'Số đơn': row.orders
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Tong quan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), 'San pham');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trendRows), 'Bieu do');

    XLSX.writeFile(wb, `bao-cao-${this.reportMode}-${this.selectedYear}-${this.reportMode === 'month' ? this.selectedMonth : `q${this.selectedQuarter}`}.xlsx`);
  }

  exportPdf(): void {
    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) return;

    const tableRows = this.productRows
      .slice(0, 20)
      .map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${this.escapeHtml(row.sku || '-')}</td>
          <td>${this.escapeHtml(row.name)}</td>
          <td>${this.escapeHtml(row.category)}</td>
          <td>${this.formatInt(row.soldQty)}</td>
          <td>${this.formatInt(row.currentStock)}</td>
          <td>${this.formatMoney(row.revenue)}</td>
        </tr>
      `)
      .join('');

    win.document.write(`
      <html>
      <head>
        <title>Báo cáo ${this.periodLabel}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 8px; }
          .meta { margin-bottom: 20px; color: #475569; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
          .card { border: 1px solid #cbd5e1; padding: 12px 14px; }
          .label { font-size: 12px; text-transform: uppercase; color: #64748b; }
          .value { margin-top: 6px; font-size: 24px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>Báo cáo bán hàng</h1>
        <div class="meta">${this.periodLabel} | ${this.rangeLabel}</div>
        <div class="grid">
          <div class="card"><div class="label">Doanh thu</div><div class="value">${this.formatMoney(this.totalRevenue)}</div></div>
          <div class="card"><div class="label">Tổng đơn</div><div class="value">${this.formatInt(this.totalOrders)}</div></div>
          <div class="card"><div class="label">Tỷ lệ đơn hủy</div><div class="value">${this.cancelRate}%</div></div>
          <div class="card"><div class="label">Tỷ lệ giao thành công</div><div class="value">${this.successRate}%</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>SKU</th>
              <th>Sản phẩm</th>
              <th>Danh mục</th>
              <th>Đã bán</th>
              <th>Tồn hiện tại</th>
              <th>Doanh thu</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  formatMoney(value: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)))}đ`;
  }

  formatInt(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)));
  }

  trackByProductId(_: number, row: ProductReportRow): number {
    return row.productId;
  }

  get revenueChartChunks(): Array<Array<TrendPoint & { heightPct: number }>> {
    return this.chunkChartBars(this.chartRevenueBars);
  }

  get orderChartChunks(): Array<Array<TrendPoint & { heightPct: number }>> {
    return this.chunkChartBars(this.chartOrderBars);
  }

  private async refreshReport(): Promise<void> {
    const [start, end] = this.getPeriodRange();
    this.filteredOrders = this.orders.filter((order) => {
      const dt = this.parseDate(order.createdAt);
      return !!dt && dt >= start && dt <= end;
    });

    this.detailsLoading = true;
    try {
      await this.ensureOrderDetails(this.filteredOrders.map((order) => Number(order.id)));
      this.filteredDetails = this.filteredOrders
        .map((order) => this.orderDetailCache.get(Number(order.id)) || null)
        .filter((detail): detail is AdminOrderDetailResponse => !!detail);
    } finally {
      this.detailsLoading = false;
    }

    this.computeSummary();
    this.computeTrends();
    this.computeProductRows();
  }

  private computeSummary(): void {
    const totalOrders = this.filteredOrders.length;
    const cancelledOrders = this.filteredOrders.filter((order) => this.cancelledStatuses.has(String(order.status || '').toUpperCase())).length;
    const successOrders = this.filteredOrders.filter((order) => this.successStatuses.has(String(order.status || '').toUpperCase())).length;

    this.totalOrders = totalOrders;
    this.cancelRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 1000) / 10 : 0;
    this.successRate = totalOrders > 0 ? Math.round((successOrders / totalOrders) * 1000) / 10 : 0;

    this.totalRevenue = this.filteredOrders.reduce((sum, order) => {
      const status = String(order.status || '').toUpperCase();
      if (this.excludedRevenueStatuses.has(status)) return sum;
      return sum + Math.max(0, Number(order.total || 0));
    }, 0);

    this.totalCurrentStock = this.stockRows.reduce((sum, row) => sum + Math.max(0, Number(row.totalStock || 0)), 0);
    this.totalSoldQty = this.filteredDetails.reduce((sum, detail) => {
      const order = this.filteredOrders.find((item) => Number(item.id) === Number(detail.id));
      const status = String(order?.status || '').toUpperCase();
      if (this.cancelledStatuses.has(status)) return sum;
      return sum + (detail.items || []).reduce((itemSum, item) => itemSum + Math.max(0, Number(item.quantity || 0)), 0);
    }, 0);
  }

  private computeTrends(): void {
    if (this.reportMode === 'month') {
      const days = this.buildMonthDays(this.selectedYear, this.selectedMonth);
      const rows = days.map((date) => ({
        label: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
        revenue: 0,
        orders: 0
      }));

      for (const order of this.filteredOrders) {
        const dt = this.parseDate(order.createdAt);
        if (!dt) continue;
        const index = dt.getDate() - 1;
        if (!rows[index]) continue;
        rows[index].orders += 1;
        if (!this.excludedRevenueStatuses.has(String(order.status || '').toUpperCase())) {
          rows[index].revenue += Math.max(0, Number(order.total || 0));
        }
      }

      this.trendPoints = rows;
    } else {
      const startMonth = (this.selectedQuarter - 1) * 3 + 1;
      const rows: TrendPoint[] = [0, 1, 2].map((offset) => {
        const month = startMonth + offset;
        return {
          label: `T${month}/${this.selectedYear}`,
          revenue: 0,
          orders: 0
        };
      });

      for (const order of this.filteredOrders) {
        const dt = this.parseDate(order.createdAt);
        if (!dt) continue;
        const index = dt.getMonth() + 1 - startMonth;
        if (index < 0 || index > 2 || !rows[index]) continue;
        rows[index].orders += 1;
        if (!this.excludedRevenueStatuses.has(String(order.status || '').toUpperCase())) {
          rows[index].revenue += Math.max(0, Number(order.total || 0));
        }
      }

      this.trendPoints = rows;
    }

    this.topRevenue = Math.max(1, ...this.trendPoints.map((point) => point.revenue || 0));
    this.topOrders = Math.max(1, ...this.trendPoints.map((point) => point.orders || 0));
  }

  private computeProductRows(): void {
    const stockByProductId = new Map<number, number>();
    for (const row of this.stockRows) {
      const productId = Number(row.productId);
      if (!Number.isFinite(productId) || productId <= 0) continue;
      stockByProductId.set(productId, Math.max(0, Number(row.totalStock || 0)));
    }

    const productMeta = new Map<number, ProductReportSource>();
    for (const product of this.products) {
      const productId = Number(product.id);
      if (!Number.isFinite(productId) || productId <= 0) continue;
      productMeta.set(productId, product);
    }

    const soldByProduct = new Map<number, { soldQty: number; revenue: number }>();

    for (const detail of this.filteredDetails) {
      const summary = this.filteredOrders.find((order) => Number(order.id) === Number(detail.id));
      const status = String(summary?.status || '').toUpperCase();
      if (this.cancelledStatuses.has(status)) continue;

      for (const item of detail.items || []) {
        const productId = Number(item.productId);
        if (!Number.isFinite(productId) || productId <= 0) continue;
        const current = soldByProduct.get(productId) || { soldQty: 0, revenue: 0 };
        current.soldQty += Math.max(0, Number(item.quantity || 0));
        current.revenue += Math.max(0, Number(item.totalPrice || 0));
        soldByProduct.set(productId, current);
      }
    }

    const allIds = new Set<number>([
      ...Array.from(productMeta.keys()),
      ...Array.from(stockByProductId.keys()),
      ...Array.from(soldByProduct.keys())
    ]);

    this.productRows = Array.from(allIds)
      .map((productId) => {
        const meta = productMeta.get(productId);
        const sold = soldByProduct.get(productId);
        return {
          productId,
          sku: String(meta?.sku || productId),
          name: String(meta?.name || `Sản phẩm #${productId}`),
          category: String(meta?.category || '-'),
          soldQty: Math.max(0, Number(sold?.soldQty || 0)),
          currentStock: Math.max(0, Number(stockByProductId.get(productId) || meta?.stock || 0)),
          revenue: Math.max(0, Number(sold?.revenue || 0))
        };
      })
      .sort((a, b) => (b.revenue - a.revenue) || (b.soldQty - a.soldQty) || a.name.localeCompare(b.name));

    this.topProductMetric = Math.max(1, ...this.productRows.slice(0, 8).map((row) => row.soldQty || 0));
  }

  private async ensureOrderDetails(orderIds: number[]): Promise<void> {
    const missingIds = orderIds.filter((id) => Number.isFinite(id) && id > 0 && !this.orderDetailCache.has(id));
    if (missingIds.length === 0) return;

    await Promise.all(
      missingIds.map(async (id) => {
        try {
          const res = await firstValueFrom(this.adminData.getOrderDetail(id));
          if (res?.success && res?.data) {
            this.orderDetailCache.set(id, res.data);
          }
        } catch {
        }
      })
    );
  }

  private getPeriodRange(): [Date, Date] {
    if (this.reportMode === 'month') {
      const start = new Date(this.selectedYear, this.selectedMonth - 1, 1, 0, 0, 0, 0);
      const end = new Date(this.selectedYear, this.selectedMonth, 0, 23, 59, 59, 999);
      return [start, end];
    }

    const startMonth = (this.selectedQuarter - 1) * 3;
    const start = new Date(this.selectedYear, startMonth, 1, 0, 0, 0, 0);
    const end = new Date(this.selectedYear, startMonth + 3, 0, 23, 59, 59, 999);
    return [start, end];
  }

  private buildMonthDays(year: number, month: number): Date[] {
    const lastDay = new Date(year, month, 0).getDate();
    return Array.from({ length: lastDay }, (_, index) => new Date(year, month - 1, index + 1));
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const dt = new Date(value);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(value);
  }

  private buildYearOptions(): number[] {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => current - index);
  }

  private chunkChartBars<T>(rows: T[]): T[][] {
    if (this.reportMode !== 'month') return [rows];
    const out: T[][] = [];
    for (let i = 0; i < rows.length; i += 15) {
      out.push(rows.slice(i, i + 15));
    }
    return out;
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
