import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminBranchResponse, AdminDataService, AdminOrderDetailItemResponse, AdminOrderDetailResponse, AdminOrderSummaryResponse, AdminUserResponse } from '../../../core/services/admin-data.service';
import { AuthService } from '../../../core/services/auth.service';

type PrintViewModel = {
  orderCode: string;
  branchName: string;
  createdAt: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  buyerAddress: string;
  sellerName: string;
  sellerPhone: string;
  sellerAddress: string;
  subtotal: string;
  shippingFee: string;
  discount: string;
  total: string;
  items: AdminOrderDetailItemResponse[];
};

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.scss']
})
export class AdminOrdersComponent implements OnDestroy {
  loading = false;
  actionLoadingId: number | null = null;
  bulkActionLoading = false;
  error = '';
  allRows: AdminOrderSummaryResponse[] = [];
  rows: AdminOrderSummaryResponse[] = [];
  usersById = new Map<number, AdminUserResponse>();
  branchesById = new Map<number, AdminBranchResponse>();
  selectedIds = new Set<number>();
  page = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 50, 100, 500];

  view = 'ALL';
  viewTitle = 'Đơn hàng';
  viewNote = '';

  previewOpen = false;
  previewLoading = false;
  previewTitle = '';
  previewHtml = '';
  previewRow: AdminOrderSummaryResponse | null = null;

  private qpSub: any = null;

  constructor(
    private adminData: AdminDataService,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {
    this.qpSub = this.route.queryParamMap.subscribe((qp) => {
      this.view = (qp.get('view') || 'ALL').toUpperCase();
      this.applyViewMeta();
      this.applyFilter();
    });
    this.load();
    this.loadUsers();
    this.loadBranches();
  }

  get totalOrdersAll(): number {
    return (this.allRows || []).length;
  }

  get totalOrdersInView(): number {
    return (this.rows || []).length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalOrdersInView / this.pageSize));
  }

  get pagedRows(): AdminOrderSummaryResponse[] {
    const start = (this.page - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    if (!this.totalOrdersInView) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalOrdersInView);
  }

  get totalAmountInView(): number {
    return (this.rows || []).reduce((sum, row) => {
      const value = Number(row?.total ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  get selectableRows(): AdminOrderSummaryResponse[] {
    return this.pagedRows.filter((row) => this.canShowAction(row) || this.canReject(row));
  }

  get allVisibleSelected(): boolean {
    return this.selectableRows.length > 0 && this.selectableRows.every((row) => row.id != null && this.selectedIds.has(Number(row.id)));
  }

  get hasSelection(): boolean {
    return this.selectedIds.size > 0;
  }

  get canManageWorkflow(): boolean {
    return this.auth.isAdmin() || this.auth.isManager() || this.auth.isStaff();
  }

  ngOnDestroy(): void {
    if (this.qpSub) {
      this.qpSub.unsubscribe();
      this.qpSub = null;
    }
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
        this.allRows = Array.isArray(res.data) ? res.data : [];
        this.selectedIds.clear();
        this.applyFilter();
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || 'Không thể kết nối backend để lấy đơn hàng.';
      }
    });
  }

  canShowAction(row: AdminOrderSummaryResponse): boolean {
    if (!this.canManageWorkflow || !row?.id) return false;
    const status = String(row.status || '').toUpperCase();
    return status === 'PENDING' || status === 'CONFIRMED' || status === 'PACKING' || status === 'SHIPPING';
  }

  canReject(row: AdminOrderSummaryResponse): boolean {
    if (!this.canManageWorkflow || !row?.id) return false;
    const status = String(row.status || '').toUpperCase();
    return status === 'PENDING';
  }

  toggleRowSelection(row: AdminOrderSummaryResponse, checked: boolean): void {
    if (row?.id == null) return;
    const id = Number(row.id);
    if (checked) {
      this.selectedIds.add(id);
      return;
    }
    this.selectedIds.delete(id);
  }

  toggleAllVisible(checked: boolean): void {
    for (const row of this.selectableRows) {
      if (row?.id == null) continue;
      const id = Number(row.id);
      if (checked) this.selectedIds.add(id);
      else this.selectedIds.delete(id);
    }
  }

  isSelected(row: AdminOrderSummaryResponse): boolean {
    return row?.id != null && this.selectedIds.has(Number(row.id));
  }

  canPrintLabel(row: AdminOrderSummaryResponse): boolean {
    const status = String(row?.status || '').toUpperCase();
    return !!row?.id && status !== 'PENDING' && status !== 'CANCELLED' && status !== 'REFUNDED';
  }

  actionLabel(row: AdminOrderSummaryResponse): string {
    const status = String(row.status || '').toUpperCase();
    if (status === 'PENDING') return 'Duyệt đơn';
    if (status === 'CONFIRMED') return 'Xác nhận đóng gói';
    if (status === 'PACKING') return 'Bàn giao vận chuyển';
    if (status === 'SHIPPING') return 'Đã giao hàng';
    return 'Cập nhật';
  }

  actionType(row: AdminOrderSummaryResponse): 'APPROVE' | 'PACK' | 'HANDOVER' | 'MARK_DELIVERED' {
    const status = String(row.status || '').toUpperCase();
    if (status === 'PENDING') return 'APPROVE';
    if (status === 'CONFIRMED') return 'PACK';
    if (status === 'PACKING') return 'HANDOVER';
    return 'MARK_DELIVERED';
  }

  act(row: AdminOrderSummaryResponse): void {
    this.performAction(row, this.actionType(row));
  }

  reject(row: AdminOrderSummaryResponse): void {
    this.performAction(row, 'CANCEL');
  }

  async bulkApprove(): Promise<void> {
    await this.performBulkAction('APPROVE');
  }

  async bulkReject(): Promise<void> {
    await this.performBulkAction('CANCEL');
  }

  private performAction(row: AdminOrderSummaryResponse, action: 'APPROVE' | 'PACK' | 'HANDOVER' | 'MARK_DELIVERED' | 'CANCEL'): void {
    if (!row?.id || this.actionLoadingId != null) return;
    this.error = '';
    this.actionLoadingId = row.id;

    this.adminData.updateOrderAction(row.id, action).subscribe({
      next: (res) => {
        this.actionLoadingId = null;
        if (!res?.success) {
          this.error = res?.message || 'Không thể cập nhật trạng thái đơn.';
          return;
        }
        this.load();
      },
      error: (err: any) => {
        this.actionLoadingId = null;
        this.error = err?.error?.message || 'Không thể cập nhật trạng thái đơn.';
      }
    });
  }

  private async performBulkAction(action: 'APPROVE' | 'CANCEL'): Promise<void> {
    const selectedRows = this.rows.filter((row) => row?.id != null && this.selectedIds.has(Number(row.id)));
    if (!selectedRows.length || this.bulkActionLoading) return;

    const eligibleRows = selectedRows.filter((row) => action === 'APPROVE' ? this.canShowAction(row) : this.canReject(row));
    if (!eligibleRows.length) return;

    this.error = '';
    this.bulkActionLoading = true;

    try {
      for (const row of eligibleRows) {
        await new Promise<void>((resolve, reject) => {
          this.adminData.updateOrderAction(Number(row.id), action).subscribe({
            next: (res) => {
              if (!res?.success) {
                reject(new Error(res?.message || 'Không thể cập nhật trạng thái đơn.'));
                return;
              }
              resolve();
            },
            error: (err: any) => reject(new Error(err?.error?.message || 'Không thể cập nhật trạng thái đơn.'))
          });
        });
      }

      this.selectedIds.clear();
      this.bulkActionLoading = false;
      this.load();
    } catch (err: any) {
      this.bulkActionLoading = false;
      this.error = err?.message || 'Không thể cập nhật trạng thái đơn.';
    }
  }

  async openPreview(row: AdminOrderSummaryResponse): Promise<void> {
    if (!row?.id) return;
    this.previewOpen = true;
    this.previewLoading = true;
    this.previewRow = row;
    this.previewTitle = this.displayOrderCode(row);
    this.previewHtml = '';
    this.error = '';

    try {
      const detail = await this.fetchOrderDetail(row);
      const vm = this.buildPrintViewModel(detail, row);
      this.previewHtml = this.buildDocumentBody(vm);
    } catch (err: any) {
      this.error = err?.message || 'Không thể tải chi tiết đơn hàng để xem trước.';
      this.previewOpen = false;
    } finally {
      this.previewLoading = false;
    }
  }

  closePreview(): void {
    this.previewOpen = false;
    this.previewLoading = false;
    this.previewTitle = '';
    this.previewHtml = '';
    this.previewRow = null;
  }

  async printLabel(row: AdminOrderSummaryResponse): Promise<void> {
    try {
      const detail = await this.fetchOrderDetail(row);
      const vm = this.buildPrintViewModel(detail, row);
      this.openPrintWindow(this.buildPrintDocument(vm));
    } catch (err: any) {
      this.error = err?.message || 'Không thể tải chi tiết đơn hàng để in.';
    }
  }

  printPreview(): void {
    if (!this.previewHtml) return;
    const row = this.previewRow;
    const title = row ? this.displayOrderCode(row) : 'Đơn hàng';
    this.openPrintWindow(this.wrapPreviewHtml(title, this.previewHtml));
  }

  private async fetchOrderDetail(row: AdminOrderSummaryResponse): Promise<AdminOrderDetailResponse> {
    const res = await firstValueFrom(this.adminData.getOrderDetail(Number(row.id)));
    if (!res?.success || !res.data) {
      throw new Error(res?.message || 'Không thể tải chi tiết đơn hàng.');
    }
    return res.data;
  }

  private openPrintWindow(html: string): void {
    const popup = window.open('', '_blank', 'width=980,height=760');
    if (!popup) {
      this.error = 'Trình duyệt đang chặn cửa sổ in. Hãy bật popup rồi thử lại.';
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

  private buildPrintViewModel(detail: AdminOrderDetailResponse, row: AdminOrderSummaryResponse): PrintViewModel {
    return {
      orderCode: this.escapeHtml(String(detail.orderCode || this.displayOrderCode(row))),
      branchName: this.escapeHtml(this.branchDisplay(row)),
      createdAt: this.escapeHtml(this.formatDate(detail.createdAt || row.createdAt)),
      buyerName: this.escapeHtml(String(detail.buyerName || this.userDisplay(row) || '-')),
      buyerPhone: this.escapeHtml(String(detail.buyerPhone || '-')),
      buyerEmail: this.escapeHtml(String(detail.buyerEmail || '-')),
      buyerAddress: this.escapeHtml(String(detail.buyerAddress || '-')),
      sellerName: this.escapeHtml(String(detail.sellerName || this.branchDisplay(row) || 'L.Event')),
      sellerPhone: this.escapeHtml(String(detail.sellerPhone || '-')),
      sellerAddress: this.escapeHtml(String(detail.sellerAddress || this.branchDisplay(row) || '-')),
      subtotal: `${this.escapeHtml(this.formatMoney(detail.subtotal ?? row.total))}đ`,
      shippingFee: `${this.escapeHtml(this.formatMoney(detail.shippingFee ?? 0))}đ`,
      discount: `${this.escapeHtml(this.formatMoney(detail.discount ?? 0))}đ`,
      total: `${this.escapeHtml(this.formatMoney(detail.total ?? row.total))}đ`,
      items: Array.isArray(detail.items) ? detail.items : []
    };
  }

  private buildItemsRows(items: AdminOrderDetailItemResponse[]): string {
    if (!items.length) {
      return `
        <tr>
          <td colspan="5" class="empty">Không có dữ liệu sản phẩm</td>
        </tr>
      `;
    }

    return items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${this.escapeHtml(String(item?.productName || '-'))}</td>
        <td class="text-right">${this.escapeHtml(String(Number(item?.quantity || 0)))}</td>
        <td class="text-right">${this.escapeHtml(this.formatMoney(item?.unitPrice ?? 0))}đ</td>
        <td class="text-right">${this.escapeHtml(this.formatMoney(item?.totalPrice ?? 0))}đ</td>
      </tr>
    `).join('');
  }

  private buildDocumentBody(vm: PrintViewModel): string {
    return `
      <div class="sheet">
        <div class="sheet-header">
          <div>
            <div class="brand">L.Event</div>
            <div class="branch">Chi nhánh xử lý: ${vm.branchName}</div>
            <div class="code">${vm.orderCode}</div>
          </div>
          <div class="created-at">
            <div>Phiếu thông tin đơn hàng</div>
            <div>${vm.createdAt}</div>
          </div>
        </div>

        <div class="top-grid">
          <div class="card">
            <div class="card-title">Thông tin người bán</div>
            <div class="line"><strong>Tên:</strong> ${vm.sellerName}</div>
            <div class="line"><strong>Điện thoại:</strong> ${vm.sellerPhone}</div>
            <div class="line"><strong>Địa chỉ:</strong> ${vm.sellerAddress}</div>
          </div>
          <div class="card">
            <div class="card-title">Thông tin người mua</div>
            <div class="line"><strong>Tên:</strong> ${vm.buyerName}</div>
            <div class="line"><strong>Điện thoại:</strong> ${vm.buyerPhone}</div>
            <div class="line"><strong>Email:</strong> ${vm.buyerEmail}</div>
            <div class="line"><strong>Địa chỉ:</strong> ${vm.buyerAddress}</div>
          </div>
        </div>

        <div class="summary">
          <div class="summary-top">
            <div class="mini">
              <div class="mini-label">Mã đơn hàng</div>
              <div class="mini-value">${vm.orderCode}</div>
            </div>
            <div class="mini">
              <div class="mini-label">Chi nhánh xử lý</div>
              <div class="mini-value">${vm.branchName}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:60px">STT</th>
                <th>Sản phẩm</th>
                <th style="width:90px" class="text-right">SL</th>
                <th style="width:140px" class="text-right">Đơn giá</th>
                <th style="width:160px" class="text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>${this.buildItemsRows(vm.items)}</tbody>
          </table>
        </div>

        <table class="totals">
          <tr><td>Tạm tính</td><td class="text-right">${vm.subtotal}</td></tr>
          <tr><td>Phí vận chuyển</td><td class="text-right">${vm.shippingFee}</td></tr>
          <tr><td>Giảm giá</td><td class="text-right">${vm.discount}</td></tr>
          <tr><td>Tổng thanh toán</td><td class="text-right"><strong>${vm.total}</strong></td></tr>
        </table>
      </div>
    `;
  }

  private buildPrintStyles(): string {
    return `
      * { box-sizing: border-box; }
      body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f3f4f6; color: #111827; }
      .sheet { width: 100%; max-width: 980px; margin: 0 auto; background: #fff; border: 2px solid #111827; padding: 18px; }
      .sheet-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 14px; }
      .brand { font-size: 14px; font-weight: 800; text-transform: uppercase; }
      .branch { margin-top: 4px; font-size: 12px; color: #374151; }
      .code { font-size: 34px; font-weight: 900; line-height: 1.1; margin-top: 10px; }
      .created-at { text-align: right; font-size: 12px; font-weight: 700; }
      .top-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 10px; }
      .card { border: 1.5px solid #111827; padding: 12px 14px; min-height: 128px; }
      .card-title { font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; }
      .line { margin: 4px 0; font-size: 13px; line-height: 1.45; }
      .line strong { display: inline-block; min-width: 88px; }
      .summary { margin-top: 14px; border: 1.5px solid #111827; }
      .summary-top { display: grid; grid-template-columns: 1fr 1fr; }
      .mini { padding: 10px 12px; border-bottom: 1px solid #111827; }
      .mini:first-child { border-right: 1px solid #111827; }
      .mini-label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #4b5563; }
      .mini-value { margin-top: 4px; font-size: 16px; font-weight: 800; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #111827; padding: 8px 10px; font-size: 13px; vertical-align: top; }
      th { background: #f9fafb; text-transform: uppercase; font-size: 11px; font-weight: 800; text-align: left; }
      .text-right { text-align: right; }
      .empty { text-align: center; color: #6b7280; }
      .totals { width: 320px; margin-left: auto; margin-top: 12px; }
      .totals td:first-child { font-weight: 700; background: #f9fafb; }
      @media print {
        body { background: #fff; padding: 0; }
        .sheet { border-width: 1.5px; }
      }
    `;
  }

  private buildPrintDocument(vm: PrintViewModel): string {
    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>In đơn hàng</title>
  <style>${this.buildPrintStyles()}</style>
</head>
<body>
  ${this.buildDocumentBody(vm)}
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;
  }

  private wrapPreviewHtml(title: string, bodyHtml: string): string {
    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(title)}</title>
  <style>${this.buildPrintStyles()}</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
  }

  statusLabel(status: string | null | undefined): string {
    const key = String(status || '').toUpperCase();
    if (key === 'PENDING') return 'Đơn mới';
    if (key === 'CONFIRMED') return 'Đã duyệt';
    if (key === 'PACKING') return 'Đang đóng gói';
    if (key === 'SHIPPING') return 'Đang giao';
    if (key === 'DELIVERED') return 'Đã giao';
    if (key === 'COMPLETED') return 'Khách đã nhận';
    if (key === 'CANCELLED') return 'Đã hủy';
    if (key === 'REFUNDED') return 'Hoàn tiền';
    return key || '-';
  }

  branchDisplay(row: AdminOrderSummaryResponse): string {
    const branchId = row?.branchId != null ? Number(row.branchId) : null;
    const branch = branchId != null ? this.branchesById.get(branchId) : null;
    const mappedName = String(branch?.name || '').trim();
    const mappedCode = String(branch?.code || '').trim();
    if (mappedName && mappedCode) return `${mappedName} (${mappedCode})`;
    if (mappedName) return mappedName;
    if (mappedCode) return mappedCode;

    const name = String(row?.branchName || '').trim();
    const code = String(row?.branchCode || '').trim();
    if (name && code) return `${name} (${code})`;
    if (name) return name;
    if (code) return code;
    if (row?.branchId != null) return `Chi nhánh #${row.branchId}`;
    return 'Chưa rõ chi nhánh';
  }

  userDisplay(row: AdminOrderSummaryResponse): string {
    const userId = row?.userId != null ? Number(row.userId) : null;
    const user = userId != null ? this.usersById.get(userId) : null;
    const fullName = String(user?.fullName || '').trim();
    if (fullName) return fullName;
    const username = String(user?.username || '').trim();
    if (username) return username;
    const email = String(user?.email || '').trim();
    if (email) return email;
    if (userId != null) return `#${userId}`;
    return '-';
  }

  private applyViewMeta(): void {
    this.viewNote = '';
    switch (this.view) {
      case 'NEW':
        this.viewTitle = 'Đơn hàng mới';
        break;
      case 'APPROVED':
        this.viewTitle = 'Đơn hàng đã duyệt';
        break;
      case 'PACKING':
        this.viewTitle = 'Đơn hàng đang đóng gói';
        break;
      case 'SHIPPING':
        this.viewTitle = 'Đơn hàng đang giao';
        break;
      case 'DELIVERED':
        this.viewTitle = 'Đơn đã giao tới khách';
        break;
      case 'COMPLETED':
        this.viewTitle = 'Khách đã nhận hàng';
        break;
      case 'CANCELLED':
        this.viewTitle = 'Đơn hàng đã hủy';
        break;
      case 'REFUNDED':
        this.viewTitle = 'Đơn hoàn tiền';
        break;
      case 'RATED':
        this.viewTitle = 'Đơn đã đánh giá';
        this.viewNote = 'Đơn ở trạng thái hoàn tất có thể tiếp tục đi qua luồng đánh giá sản phẩm phía khách hàng.';
        break;
      default:
        this.view = 'ALL';
        this.viewTitle = 'Đơn hàng';
        break;
    }
  }

  private applyFilter(): void {
    const source = Array.isArray(this.allRows) ? this.allRows : [];
    const status = this.mapViewToOrderStatus(this.view);
    this.rows = !status ? source : source.filter((row) => String(row.status || '').toUpperCase() === status);
    this.page = 1;
  }

  setPageSize(rawValue: string | number): void {
    const next = Number(rawValue);
    if (!Number.isFinite(next) || next <= 0) return;
    this.pageSize = next;
    this.page = 1;
  }

  goToPage(page: number): void {
    const next = Math.min(this.totalPages, Math.max(1, page));
    this.page = next;
  }

  private mapViewToOrderStatus(view: string): string | null {
    switch ((view || 'ALL').toUpperCase()) {
      case 'ALL':
        return null;
      case 'NEW':
        return 'PENDING';
      case 'APPROVED':
        return 'CONFIRMED';
      case 'PACKING':
        return 'PACKING';
      case 'SHIPPING':
        return 'SHIPPING';
      case 'DELIVERED':
        return 'DELIVERED';
      case 'COMPLETED':
        return 'COMPLETED';
      case 'CANCELLED':
        return 'CANCELLED';
      case 'REFUNDED':
        return 'REFUNDED';
      default:
        return null;
    }
  }

  formatDate(input?: string | null): string {
    if (!input) return '-';
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('vi-VN');
  }

  formatMoney(input: any): string {
    const value = Number(input);
    if (!Number.isFinite(value)) return '-';
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  displayOrderCode(row: AdminOrderSummaryResponse): string {
    const explicitCode = String(row?.orderCode || '').trim();
    if (explicitCode) return explicitCode;

    const createdAt = row?.createdAt ? new Date(row.createdAt) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      const yyyy = createdAt.getFullYear();
      const mm = String(createdAt.getMonth() + 1).padStart(2, '0');
      const dd = String(createdAt.getDate()).padStart(2, '0');
      const hh = String(createdAt.getHours()).padStart(2, '0');
      const mi = String(createdAt.getMinutes()).padStart(2, '0');
      const ss = String(createdAt.getSeconds()).padStart(2, '0');
      return `DH-${yyyy}${mm}${dd}${hh}${mi}${ss}`;
    }

    return `#${row?.id ?? '-'}`;
  }

  private escapeHtml(input: string): string {
    return String(input || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private loadUsers(): void {
    this.adminData.getUsers().subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.usersById = new Map(rows.filter((row) => row?.id != null).map((row) => [Number(row.id), row]));
      },
      error: () => {
      }
    });
  }

  private loadBranches(): void {
    this.adminData.getBranches().subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.branchesById = new Map(rows.filter((row) => row?.id != null).map((row) => [Number(row.id), row]));
      },
      error: () => {
      }
    });
  }
}
