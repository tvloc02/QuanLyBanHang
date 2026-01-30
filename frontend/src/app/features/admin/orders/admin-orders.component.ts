import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminDataService, AdminOrderSummaryResponse } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.scss']
})
export class AdminOrdersComponent implements OnDestroy {
  loading = false;
  error = '';
  allRows: AdminOrderSummaryResponse[] = [];
  rows: AdminOrderSummaryResponse[] = [];

  view: string = 'ALL';
  viewTitle = 'Đơn hàng';
  viewNote = '';

  private qpSub: any = null;

  constructor(
    private adminData: AdminDataService,
    private route: ActivatedRoute
  ) {
    this.qpSub = this.route.queryParamMap.subscribe((qp) => {
      this.view = (qp.get('view') || 'ALL').toUpperCase();
      this.applyViewMeta();
      this.applyFilter();
    });
    this.load();
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
        this.applyFilter();
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy đơn hàng.';
      }
    });
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
        this.viewTitle = 'Đã nhận hàng';
        break;
      case 'CANCELLED':
        this.viewTitle = 'Đơn hàng đã hủy';
        break;
      case 'REFUNDED':
        this.viewTitle = 'Hoàn tiền';
        break;
      case 'REJECTED':
        this.viewTitle = 'Đơn hàng đã từ chối';
        this.viewNote = 'Trạng thái này chưa được backend hỗ trợ (chưa có OrderStatus tương ứng).';
        break;
      case 'RATED':
        this.viewTitle = 'Đã đánh giá';
        this.viewNote = 'Trạng thái này chưa được backend hỗ trợ (cần liên kết với review).';
        break;
      case 'RETURN_PENDING':
        this.viewTitle = 'Trả hàng - Đang chờ';
        this.viewNote = 'Luồng trả hàng chưa được backend hỗ trợ.';
        break;
      case 'RETURN_APPROVED':
        this.viewTitle = 'Trả hàng - Đã duyệt';
        this.viewNote = 'Luồng trả hàng chưa được backend hỗ trợ.';
        break;
      case 'RETURN_REJECTED':
        this.viewTitle = 'Trả hàng - Đã từ chối';
        this.viewNote = 'Luồng trả hàng chưa được backend hỗ trợ.';
        break;
      default:
        this.view = 'ALL';
        this.viewTitle = 'Đơn hàng';
        break;
    }
  }

  private applyFilter(): void {
    const src = Array.isArray(this.allRows) ? this.allRows : [];
    const v = (this.view || 'ALL').toUpperCase();

    const status = this.mapViewToOrderStatus(v);
    if (!status) {
      this.rows = v === 'ALL' ? src : [];
      return;
    }
    this.rows = src.filter((r) => String(r.status || '').toUpperCase() === status);
  }

  private mapViewToOrderStatus(view: string): string | null {
    switch (view) {
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
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  }
}
