import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'PACKING' | 'SHIPPED' | 'SHIPPING' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'REFUNDED' | string;
type LookupTab = 'all' | 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'returned';

interface OrderStatusLookupResponse {
  orderId: number;
  orderCode?: string | null;
  status: OrderStatus;
  total?: number;
  createdAt?: string;
  shippingPhone?: string;
  items?: Array<{ productId?: number; productName?: string; quantity?: number; unitPrice?: number; totalPrice?: number }>;
}

interface UserOrderResponse {
  id: number;
  orderCode?: string | null;
  userId?: number | null;
  status: OrderStatus;
  total?: number | null;
  subtotal?: number | null;
  shippingFee?: number | null;
  discount?: number | null;
  couponCode?: string | null;
  branchId?: number | null;
  shippingPhone?: string | null;
  createdAt?: string | null;
  items?: Array<{ productId?: number | null; productName?: string | null; quantity?: number | null; unitPrice?: number | null; totalPrice?: number | null }> | null;
}

interface DisplayOrderItem {
  productId?: number | null;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  reviewed?: boolean;
}

interface DisplayOrder {
  id: number;
  orderCode?: string | null;
  status: OrderStatus;
  total?: number | null;
  createdAt?: string | null;
  shippingPhone?: string | null;
  couponCode?: string | null;
  items?: DisplayOrderItem[];
  source: 'user-list' | 'direct-lookup';
}

interface ReviewResponse {
  id?: number | null;
  productId?: number | null;
  userId?: number | null;
  rating?: number | null;
  comment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

@Component({
  selector: 'app-order-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FooterComponent],
  templateUrl: './order-lookup.component.html',
  styleUrls: ['./order-lookup.component.scss']
})
export class OrderLookupComponent implements OnInit {
  readonly tabs: Array<{ key: LookupTab; label: string }> = [
    { key: 'all', label: 'Tất cả đơn hàng' },
    { key: 'pending', label: 'Chờ thanh toán' },
    { key: 'processing', label: 'Đang xử lý' },
    { key: 'shipping', label: 'Đang giao' },
    { key: 'delivered', label: 'Đã giao' },
    { key: 'cancelled', label: 'Đã hủy' },
    { key: 'returned', label: 'Hoàn hàng' }
  ];

  orderId = '';
  phone = '';
  activeTab: LookupTab = 'all';

  loading = false;
  loadingMyOrders = false;
  actionLoadingId: number | null = null;
  error = '';
  directLookupOrder: DisplayOrder | null = null;
  myOrders: DisplayOrder[] = [];

  reviewOpen = false;
  reviewSaving = false;
  reviewError = '';
  reviewRating = 5;
  reviewComment = '';
  reviewTargetOrderId: number | null = null;
  reviewTargetProductId: number | null = null;
  reviewTargetProductName = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly auth: AuthService
  ) {
    const qp = this.route.snapshot.queryParamMap;
    this.orderId = String(qp.get('orderId') || '').trim();
    this.phone = String(qp.get('phone') || '').trim();
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.loadMyOrders();
      return;
    }

    if (this.orderId && this.phone) {
      this.lookup();
    }
  }

  formatMoney(v: any): string {
    const n = Number(v || 0);
    return new Intl.NumberFormat('vi-VN').format(Number.isFinite(n) ? Math.round(n) : 0);
  }

  formatDate(value?: string | null): string {
    if (!value) return 'Chưa có thời gian';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Chưa có thời gian';
    return d.toLocaleString('vi-VN');
  }

  displayOrderCode(order: DisplayOrder): string {
    const explicitCode = String(order?.orderCode || '').trim();
    if (explicitCode) return explicitCode;

    const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      const yyyy = createdAt.getFullYear();
      const mm = String(createdAt.getMonth() + 1).padStart(2, '0');
      const dd = String(createdAt.getDate()).padStart(2, '0');
      const hh = String(createdAt.getHours()).padStart(2, '0');
      const mi = String(createdAt.getMinutes()).padStart(2, '0');
      const ss = String(createdAt.getSeconds()).padStart(2, '0');
      return `DH-${yyyy}${mm}${dd}${hh}${mi}${ss}`;
    }

    return `#${order?.id ?? '-'}`;
  }

  setActiveTab(tab: LookupTab): void {
    this.activeTab = tab;
  }

  get filteredOrders(): DisplayOrder[] {
    const source = this.myOrders.length > 0 ? this.myOrders : (this.directLookupOrder ? [this.directLookupOrder] : []);
    if (this.activeTab === 'all') return source;
    return source.filter((order) => this.matchesTab(order.status, this.activeTab));
  }

  get hasOrders(): boolean {
    return this.filteredOrders.length > 0;
  }

  goShopping(): void {
    this.router.navigateByUrl('/sale');
  }

  canCancel(order: DisplayOrder): boolean {
    const key = String(order?.status || '').trim().toUpperCase();
    return order?.source === 'user-list' && (key === 'PENDING' || key === 'CONFIRMED' || key === 'PACKING');
  }

  canConfirmReceived(order: DisplayOrder): boolean {
    return order?.source === 'user-list' && String(order?.status || '').trim().toUpperCase() === 'DELIVERED';
  }

  canReview(order: DisplayOrder, item: DisplayOrderItem): boolean {
    return order?.source === 'user-list'
      && String(order?.status || '').trim().toUpperCase() === 'COMPLETED'
      && !!item?.productId;
  }

  reviewLabel(item: DisplayOrderItem): string {
    return item?.reviewed ? 'Sửa đánh giá' : 'Đánh giá';
  }

  lookup(): void {
    this.error = '';
    this.directLookupOrder = null;

    const id = String(this.orderId || '').trim();
    if (!id) {
      this.error = 'Vui lòng nhập mã đơn hàng.';
      return;
    }

    const orderIdNum = Number(id);
    if (!Number.isFinite(orderIdNum) || orderIdNum <= 0) {
      this.error = 'Mã đơn hàng không hợp lệ.';
      return;
    }

    const p = String(this.phone || '').trim();
    if (!p) {
      this.error = 'Vui lòng nhập số điện thoại.';
      return;
    }

    const params = new URLSearchParams();
    params.set('phone', p);

    this.loading = true;

    const url = `${environment.apiBaseUrl}/api/order-status/${orderIdNum}?${params.toString()}`;
    this.http.get<ApiResponse<OrderStatusLookupResponse>>(url).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success || !res.data) {
          this.error = res?.message || 'Không tìm thấy đơn hàng.';
          return;
        }

        this.directLookupOrder = {
          id: Number(res.data.orderId),
          orderCode: res.data.orderCode || null,
          status: res.data.status,
          total: Number(res.data.total || 0),
          createdAt: res.data.createdAt || null,
          shippingPhone: res.data.shippingPhone || null,
          items: Array.isArray(res.data.items)
            ? res.data.items.map((item) => ({
                productId: item.productId ?? null,
                productName: item.productName || 'Sản phẩm',
                quantity: Number(item.quantity || 0),
                unitPrice: Number(item.unitPrice || 0),
                totalPrice: Number(item.totalPrice || 0),
                reviewed: false
              }))
            : [],
          source: 'direct-lookup'
        };
        this.activeTab = 'all';
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || 'Không thể tra cứu đơn hàng.';
      }
    });
  }

  updateOrderAction(order: DisplayOrder, action: 'CANCEL' | 'CONFIRM_RECEIVED'): void {
    if (!order?.id || this.actionLoadingId != null) return;
    this.error = '';
    this.actionLoadingId = order.id;

    const requestOptions = this.buildAuthOptions();

    this.http.post<ApiResponse<any>>(`${environment.apiBaseUrl}/api/orders/${order.id}/action`, { action }, requestOptions).subscribe({
      next: (res) => {
        this.actionLoadingId = null;
        if (!res?.success) {
          this.error = res?.message || 'Không thể cập nhật đơn hàng.';
          return;
        }
        this.loadMyOrders();
      },
      error: (err: any) => {
        this.actionLoadingId = null;
        this.error = err?.error?.message || 'Không thể cập nhật đơn hàng.';
      }
    });
  }

  openReview(order: DisplayOrder, item: DisplayOrderItem): void {
    if (!this.canReview(order, item)) return;
    this.reviewOpen = true;
    this.reviewSaving = false;
    this.reviewError = '';
    this.reviewRating = 5;
    this.reviewComment = '';
    this.reviewTargetOrderId = order.id;
    this.reviewTargetProductId = Number(item.productId);
    this.reviewTargetProductName = item.productName || 'Sản phẩm';
  }

  closeReview(): void {
    this.reviewOpen = false;
    this.reviewSaving = false;
    this.reviewError = '';
    this.reviewTargetOrderId = null;
    this.reviewTargetProductId = null;
    this.reviewTargetProductName = '';
    this.reviewComment = '';
    this.reviewRating = 5;
  }

  submitReview(): void {
    if (!this.reviewTargetProductId || this.reviewSaving) return;
    if (!Number.isFinite(this.reviewRating) || this.reviewRating < 1 || this.reviewRating > 5) {
      this.reviewError = 'Vui lòng chọn số sao từ 1 đến 5.';
      return;
    }

    this.reviewSaving = true;
    this.reviewError = '';

    const requestOptions = this.buildAuthOptions();
    this.http.post<ApiResponse<ReviewResponse>>(`${environment.apiBaseUrl}/api/reviews`, {
      productId: this.reviewTargetProductId,
      rating: this.reviewRating,
      comment: this.reviewComment.trim()
    }, requestOptions).subscribe({
      next: (res) => {
        this.reviewSaving = false;
        if (!res?.success) {
          this.reviewError = res?.message || 'Không thể gửi đánh giá.';
          return;
        }

        for (const order of this.myOrders) {
          if (order.id !== this.reviewTargetOrderId || !Array.isArray(order.items)) continue;
          for (const item of order.items) {
            if (Number(item.productId) === this.reviewTargetProductId) {
              item.reviewed = true;
            }
          }
        }
        this.closeReview();
      },
      error: (err: any) => {
        this.reviewSaving = false;
        this.reviewError = err?.error?.message || 'Không thể gửi đánh giá.';
      }
    });
  }

  private loadMyOrders(): void {
    const userId = this.auth.getCurrentUserId();
    if (!userId) {
      if (this.orderId && this.phone) {
        this.lookup();
      }
      return;
    }

    this.loadingMyOrders = true;
    this.error = '';

    const requestOptions = this.buildAuthOptions();
    const url = `${environment.apiBaseUrl}/api/orders?userId=${encodeURIComponent(String(userId))}`;
    this.http.get<ApiResponse<UserOrderResponse[]>>(url, requestOptions).subscribe({
      next: (res) => {
        this.loadingMyOrders = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách đơn hàng.';
          return;
        }

        const rows = Array.isArray(res.data) ? res.data : [];
        this.myOrders = rows
          .filter((row) => row && row.id != null)
          .map((row) => ({
            id: Number(row.id),
            orderCode: row.orderCode || null,
            status: row.status || 'PENDING',
            total: Number(row.total || 0),
            createdAt: row.createdAt || null,
            shippingPhone: row.shippingPhone || null,
            couponCode: row.couponCode || null,
            items: Array.isArray(row.items)
              ? row.items.map((item) => ({
                  productId: item.productId ?? null,
                  productName: item.productName || 'Sản phẩm',
                  quantity: Number(item.quantity || 0),
                  unitPrice: Number(item.unitPrice || 0),
                  totalPrice: Number(item.totalPrice || 0),
                  reviewed: false
                }))
              : [],
            source: 'user-list' as const
          }))
          .sort((a, b) => {
            const at = new Date(a.createdAt || 0).getTime();
            const bt = new Date(b.createdAt || 0).getTime();
            return bt - at;
          });

        if (!this.myOrders.length && this.orderId && this.phone) {
          this.lookup();
        }
      },
      error: (err: any) => {
        this.loadingMyOrders = false;
        this.error =
          err?.error?.message ||
          (err?.status ? `Không thể tải danh sách đơn hàng (${err.status} ${err.statusText || ''}).` : 'Không thể tải danh sách đơn hàng.');
      }
    });
  }

  private buildAuthOptions(): { headers?: HttpHeaders } {
    const token = this.auth.getToken();
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  private matchesTab(status: OrderStatus, tab: LookupTab): boolean {
    const key = String(status || '').trim().toUpperCase();
    if (tab === 'all') return true;
    if (tab === 'pending') return key === 'PENDING';
    if (tab === 'processing') return key === 'CONFIRMED' || key === 'PROCESSING' || key === 'PACKING';
    if (tab === 'shipping') return key === 'SHIPPED' || key === 'SHIPPING';
    if (tab === 'delivered') return key === 'DELIVERED' || key === 'COMPLETED';
    if (tab === 'cancelled') return key === 'CANCELLED';
    if (tab === 'returned') return key === 'RETURNED' || key === 'REFUNDED';
    return false;
  }

  mapStatusLabel(status: OrderStatus): string {
    const key = String(status || '').trim().toUpperCase();
    if (key === 'PENDING') return 'Chờ thanh toán';
    if (key === 'CONFIRMED' || key === 'PROCESSING' || key === 'PACKING') return 'Đang xử lý';
    if (key === 'SHIPPED' || key === 'SHIPPING') return 'Đang giao';
    if (key === 'DELIVERED') return 'Đã giao';
    if (key === 'COMPLETED') return 'Đã nhận hàng';
    if (key === 'CANCELLED') return 'Đã hủy';
    if (key === 'RETURNED' || key === 'REFUNDED') return 'Hoàn hàng';
    return key || 'Đơn hàng';
  }
}
