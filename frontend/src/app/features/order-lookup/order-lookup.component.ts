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
  orderId = '';
  phone = '';

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
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || 'Không thể tra cứu đơn hàng.';
      }
    });
  }
}
