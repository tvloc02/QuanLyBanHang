import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { UserDataService } from '../../core/services/user-data.service';
import { FooterComponent } from '../../shared/footer/footer.component';

interface CartItem {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

interface CheckoutShipmentOption {
  method?: string | null;
  label?: string | null;
  fee?: number | null;
  minDays?: number | null;
  maxDays?: number | null;
}

interface CheckoutShipmentItem {
  id?: number | null;
  name?: string | null;
  quantity?: number | null;
  price?: number | null;
  size?: string | null;
  color?: string | null;
}

interface CheckoutShipment {
  key?: string | null;
  branchId?: number | null;
  branchCode?: string | null;
  branchName?: string | null;
  branchAddress?: string | null;
  displayOrderCode?: string | null;
  quantity?: number | null;
  subtotal?: number | null;
  items?: CheckoutShipmentItem[] | null;
  selectedOption?: CheckoutShipmentOption | null;
}

interface CheckoutAddress {
  id?: number | null;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface CheckoutPaymentMethod {
  id?: number | null;
  name?: string | null;
  description?: string | null;
}

interface CheckoutSnapshot {
  items?: CartItem[] | null;
  shipments?: CheckoutShipment[] | null;
  address?: CheckoutAddress | null;
  paymentMethod?: CheckoutPaymentMethod | null;
  subtotal?: number | null;
  shippingFee?: number | null;
  discountAmount?: number | null;
  totalAmount?: number | null;
}

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  items: CartItem[] = [];
  checkoutShipments: CheckoutShipment[] = [];

  fullName = '';
  phone = '';
  province = '';
  district = '';
  ward = '';
  addressDetail = '';
  latitude: number | null = null;
  longitude: number | null = null;

  paymentMethodName = 'Thanh toán khi nhận hàng (COD)';
  paymentMethodDescription = 'Thanh toán bằng tiền mặt khi nhận hàng';
  discountAmount = 0;

  placed = false;
  placing = false;
  error = '';

  private shippingFeeValue = 0;
  private orderCodeSeed = '';

  constructor(
    private router: Router,
    private auth: AuthService,
    private userData: UserDataService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.orderCodeSeed = this.buildOrderCodeSeed();
    this.loadCheckoutSnapshot();
    this.prefillMissingFromProfile();
  }

  private loadCheckoutSnapshot(): void {
    try {
      const raw = localStorage.getItem('checkoutData');
      if (!raw) {
        this.items = [];
        this.checkoutShipments = [];
        return;
      }

      const data = JSON.parse(raw) as CheckoutSnapshot | null;
      if (!data || typeof data !== 'object') {
        this.items = [];
        this.checkoutShipments = [];
        return;
      }

      this.items = Array.isArray(data.items)
        ? data.items
            .map((x) => x as Partial<CartItem>)
            .filter((x) => typeof x.id === 'number' && typeof x.price === 'number')
            .map((x) => ({
              id: x.id!,
              name: x.name || 'Sản phẩm',
              slug: x.slug || '',
              imageUrl: x.imageUrl,
              price: x.price!,
              quantity: typeof x.quantity === 'number' && x.quantity > 0 ? x.quantity : 1,
              size: x.size,
              color: x.color
            }))
        : [];

      this.checkoutShipments = Array.isArray(data.shipments)
        ? data.shipments.map((shipment, index) => ({
            ...shipment,
            displayOrderCode: this.buildShipmentOrderCode(index)
          }))
        : [];

      const address = data.address || {};
      this.fullName = String(address.name || '').trim();
      this.phone = String(address.phone || '').trim();
      this.province = String(address.province || '').trim();
      this.district = String(address.district || '').trim();
      this.ward = String(address.ward || '').trim();
      this.addressDetail = String(address.address || '').trim();
      this.latitude = Number.isFinite(Number(address.latitude)) ? Number(address.latitude) : null;
      this.longitude = Number.isFinite(Number(address.longitude)) ? Number(address.longitude) : null;

      const payment = data.paymentMethod || {};
      this.paymentMethodName = String(payment.name || '').trim() || 'Thanh toán khi nhận hàng (COD)';
      this.paymentMethodDescription = String(payment.description || '').trim() || 'Thanh toán bằng tiền mặt khi nhận hàng';

      const shipping = Number(data.shippingFee);
      const discount = Number(data.discountAmount);
      this.shippingFeeValue = Number.isFinite(shipping) ? shipping : 0;
      this.discountAmount = Number.isFinite(discount) ? discount : 0;
    } catch {
      this.items = [];
      this.checkoutShipments = [];
    }
  }

  private prefillMissingFromProfile(): void {
    if (!this.auth.isAuthenticated()) return;

    this.userData.getMe().subscribe({
      next: (res) => {
        const d = res?.data;
        if (!d) return;

        if (!this.fullName.trim() && d.fullName) this.fullName = String(d.fullName).trim();
        if (!this.phone.trim() && d.phone) this.phone = String(d.phone).trim();
        if (!this.province.trim() && d.province) this.province = String(d.province).trim();
        if (!this.district.trim() && d.district) this.district = String(d.district).trim();
        if (!this.ward.trim() && d.ward) this.ward = String(d.ward).trim();
        if (!this.addressDetail.trim() && d.addressDetail) this.addressDetail = String(d.addressDetail).trim();
        if (this.latitude == null && Number.isFinite(Number(d.latitude))) this.latitude = Number(d.latitude);
        if (this.longitude == null && Number.isFinite(Number(d.longitude))) this.longitude = Number(d.longitude);
      },
      error: () => {
      }
    });
  }

  get subtotal(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get shippingFee(): number {
    return this.shippingFeeValue;
  }

  get total(): number {
    return this.subtotal + this.shippingFee - this.discountAmount;
  }

  get mainOrderCode(): string {
    return `DH-${this.orderCodeSeed}`;
  }

  get shippingAddressSummary(): string {
    const detail = String(this.addressDetail || '').trim();
    const regionParts = [this.ward, this.district, this.province]
      .map((value) => String(value || '').trim())
      .filter((value) => !!value);

    if (!detail) return regionParts.join(', ');

    const normalize = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');

    const detailNorm = normalize(detail);
    const missingRegionParts = regionParts.filter((part) => !detailNorm.includes(normalize(part)));
    return [detail, ...missingRegionParts].join(', ');
  }

  buildShipmentOrderCode(index: number): string {
    const suffix = String(index + 1).padStart(2, '0');
    return `${this.mainOrderCode}_${suffix}`;
  }

  formatShipmentSubtotal(shipment: CheckoutShipment): number {
    const subtotal = Number(shipment.subtotal);
    if (Number.isFinite(subtotal)) return subtotal;
    return Array.isArray(shipment.items)
      ? shipment.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
      : 0;
  }

  formatShipmentQuantity(shipment: CheckoutShipment): number {
    const quantity = Number(shipment.quantity);
    if (Number.isFinite(quantity) && quantity > 0) return quantity;
    return Array.isArray(shipment.items)
      ? shipment.items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)), 0)
      : 0;
  }

  formatShippingDays(minDays?: number | null, maxDays?: number | null): string {
    const min = Math.max(0, Number(minDays || 0));
    const max = Math.max(0, Number(maxDays || 0));
    if (min === max) return `${min} ngày`;
    return `${min}-${max} ngày`;
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)));
  }

  async placeOrder(): Promise<void> {
    this.error = '';

    if (this.items.length === 0) {
      this.error = 'Giỏ hàng đang trống.';
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.error = 'Vui lòng đăng nhập để đặt hàng.';
      return;
    }

    if (!this.fullName.trim() || !this.phone.trim() || !this.province.trim() || !this.ward.trim() || !this.addressDetail.trim()) {
      this.error = 'Vui lòng nhập đầy đủ thông tin giao hàng.';
      return;
    }

    const userId = this.auth.getCurrentUserId();
    if (!userId) {
      this.error = 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
      return;
    }

    this.placing = true;

    try {
      const token = this.auth.getToken();
      const requestOptions = token
        ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
        : {};
      const createdOrderIds: number[] = [];
      const shipments = this.checkoutShipments.length
        ? this.checkoutShipments
        : [{
            branchId: null,
            items: this.items.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              size: item.size,
              color: item.color
            })),
            selectedOption: { fee: this.shippingFee }
          } as CheckoutShipment];

      for (const shipment of shipments) {
        const shipmentItems = Array.isArray(shipment.items) ? shipment.items : [];
        if (!shipmentItems.length) continue;

        const payload = {
          userId,
          orderCode: shipment.displayOrderCode || this.mainOrderCode,
          items: shipmentItems.map((item) => ({
            productId: item.id,
            productName: item.name || 'Sản phẩm',
            quantity: Math.max(1, Number(item.quantity || 0)),
            unitPrice: Math.max(0, Number(item.price || 0)),
            size: item.size || null,
            color: item.color || null
          })),
          couponCode: null,
          shippingFee: Math.max(0, Number(shipment.selectedOption?.fee || 0)),
          shippingFullName: this.fullName.trim(),
          shippingPhone: this.phone.trim(),
          shippingProvince: this.province.trim(),
          shippingWard: this.ward.trim(),
          shippingAddressDetail: this.addressDetail.trim(),
          branchId: shipment.branchId ?? null,
          shippingLatitude: this.latitude,
          shippingLongitude: this.longitude
        };

        const res = await firstValueFrom(
          this.http.post<ApiResponse<{ id?: number | null }>>(`${environment.apiBaseUrl}/api/orders`, payload, requestOptions)
        );

        if (!res?.success) {
          throw new Error(res?.message || 'Đặt hàng thất bại.');
        }

        const orderId = Number(res?.data?.id);
        if (Number.isFinite(orderId) && orderId > 0) {
          createdOrderIds.push(orderId);
        }
      }

      this.placing = false;
      localStorage.setItem('cart', '[]');
      localStorage.removeItem('checkoutData');
      window.dispatchEvent(new Event('cart-updated'));
      this.placed = true;

      window.setTimeout(() => {
        const firstOrderId = createdOrderIds[0];
        if (firstOrderId) {
          this.router.navigate(['/order-lookup'], {
            queryParams: {
              orderId: firstOrderId,
              phone: this.phone.trim()
            }
          });
          return;
        }
        this.router.navigateByUrl('/order-lookup');
      }, 1200);
    } catch (err: any) {
      this.placing = false;
      this.error =
        (err?.status === 401 ? 'Yêu cầu đặt hàng bị backend từ chối xác thực (401 Unauthorized).' : null) ||
        err?.error?.message ||
        err?.message ||
        'Không thể đặt hàng. Vui lòng thử lại.';
    }
  }

  backToCart(): void {
    this.router.navigateByUrl('/cart');
  }

  private buildOrderCodeSeed(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
  }
}
