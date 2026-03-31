import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router, RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'COMPLETED' | string;
type LookupTab = 'all' | 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'returned';

interface OrderStatusLookupResponse {
  orderId: number;
  status: OrderStatus;
  total?: number;
  createdAt?: string;
  shippingPhone?: string;
  items?: Array<{ productName?: string; quantity?: number; unitPrice?: number; totalPrice?: number }>;
}

@Component({
  selector: 'app-order-lookup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FooterComponent],
  templateUrl: './order-lookup.component.html',
  styleUrls: ['./order-lookup.component.scss']
})
export class OrderLookupComponent {
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
  error = '';
  result: OrderStatusLookupResponse | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
    private readonly router: Router
  ) {
    const qp = this.route.snapshot.queryParamMap;
    this.orderId = String(qp.get('orderId') || '').trim();
    this.phone = String(qp.get('phone') || '').trim();
  }

  formatMoney(v: any): string {
    const n = Number(v || 0);
    return new Intl.NumberFormat('vi-VN').format(Number.isFinite(n) ? Math.round(n) : 0);
  }

  setActiveTab(tab: LookupTab): void {
    this.activeTab = tab;
  }

  get visibleResult(): OrderStatusLookupResponse | null {
    if (!this.result) return null;
    if (this.activeTab === 'all') return this.result;
    return this.matchesTab(this.result.status, this.activeTab) ? this.result : null;
  }

  get statusLabel(): string {
    return this.mapStatusLabel(this.visibleResult?.status || '');
  }

  goShopping(): void {
    this.router.navigateByUrl('/sale');
  }

  lookup(): void {
    this.error = '';
    this.result = null;

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

    const url = `${environment.apiBaseUrl}/api/order-status/${orderIdNum}${params.toString() ? `?${params.toString()}` : ''}`;
    this.http.get<ApiResponse<OrderStatusLookupResponse>>(url).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success || !res.data) {
          this.error = res?.message || 'Không tìm thấy đơn hàng.';
          return;
        }
        this.result = res.data;
        this.activeTab = 'all';
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || 'Không thể tra cứu đơn hàng.';
      }
    });
  }

  private matchesTab(status: OrderStatus, tab: LookupTab): boolean {
    const key = String(status || '').trim().toUpperCase();
    if (tab === 'all') return true;
    if (tab === 'pending') return key === 'PENDING';
    if (tab === 'processing') return key === 'CONFIRMED' || key === 'PROCESSING';
    if (tab === 'shipping') return key === 'SHIPPED';
    if (tab === 'delivered') return key === 'DELIVERED' || key === 'COMPLETED';
    if (tab === 'cancelled') return key === 'CANCELLED';
    if (tab === 'returned') return key === 'RETURNED' || key === 'REFUNDED';
    return false;
  }

  private mapStatusLabel(status: OrderStatus): string {
    const key = String(status || '').trim().toUpperCase();
    if (key === 'PENDING') return 'Chờ thanh toán';
    if (key === 'CONFIRMED' || key === 'PROCESSING') return 'Đang xử lý';
    if (key === 'SHIPPED') return 'Đang giao';
    if (key === 'DELIVERED' || key === 'COMPLETED') return 'Đã giao';
    if (key === 'CANCELLED') return 'Đã hủy';
    if (key === 'RETURNED' || key === 'REFUNDED') return 'Hoàn hàng';
    return key || 'Đơn hàng';
  }
}
