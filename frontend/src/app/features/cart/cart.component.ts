import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { HOME_CONFIG, HomeSectionId } from '../home/home.config';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FooterComponent } from '../../shared/footer/footer.component';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { UserDataService } from '../../core/services/user-data.service';
import { AdminBranchResponse, AdminDataService } from '../../core/services/admin-data.service';
import {
  DeliveryDistanceTier,
  DeliveryMethod,
  DeliveryPricingConfig,
  ShippingConfigService
} from '../admin/shipping-settings/shipping-config.service';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface CartItem {
  id: number;
  name: string;
  slug: string;
  image?: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  selected?: boolean;
  originalPrice?: number;
  branch?: string;
  branchId?: number;
  branchName?: string;
}

interface Address {
  id: number;
  name: string;
  phone: string;
  address: string;
  type?: string;
  province?: string;
  district?: string;
  ward?: string;
  latitude?: number;
  longitude?: number;
}

interface PaymentMethod {
  id: number;
  name: string;
  description: string;
}

interface CouponDto {
  id: number;
  code: string;
  description?: string | null;
  type?: string | null;
  discountAmount?: number | null;
  discountPercent?: number | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  shippingDiscountAmount?: number | null;
  allowedSegments?: string | null;
  targetAudience?: string | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean | null;
}

interface UserCouponDto {
  id: number;
  userId: number;
  status: string;
  claimedAt?: string | null;
  usedAt?: string | null;
  usedOrderId?: number | null;
  coupon?: CouponDto | null;
}

interface ShipmentOption {
  method: DeliveryMethod;
  label: string;
  distanceKm: number;
  fee: number;
  minDays: number;
  maxDays: number;
}

interface ShipmentGroup {
  key: string;
  branchId: number | null;
  branchCode: string;
  branchName: string;
  branchAddress: string;
  branchProvince: string;
  customerProvince: string;
  sameProvince: boolean;
  items: CartItem[];
  itemCount: number;
  quantity: number;
  subtotal: number;
  distanceSource: 'map' | 'config';
  options: ShipmentOption[];
  selectedOption: ShipmentOption;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent, FormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {
  readonly cfg = HOME_CONFIG;

  accountOpen = false;
  wishlistCount = 0;
  cartCount = 0;
  showScrollTop = false;

  searchQuery = '';
  showSearchSuggest = false;
  searchSuggest: Array<{ label: string; route: string }> = [];
  activeSuggestIndex = -1;

  items: CartItem[] = [];
  branches: AdminBranchResponse[] = [];
  shippingPricing: DeliveryPricingConfig;

  discountCode = '';
  discountMessage = '';
  discountAmount = 0;
  discountModalOpen = false;
  addressModalOpen = false;
  discountLoading = false;
  discountLoadError = '';
  discountOptions: CouponDto[] = [];
  filteredDiscounts: CouponDto[] = [];
  discountSearchQuery = '';
  claimedCouponCodes = new Set<string>();
  selectedShipmentMethods: Record<string, DeliveryMethod> = {};
  addresses: Address[] = [];
  selectedAddressIndex = -1;
  showAddAddress = false;
  showAddAddressForm = false;
  newAddress: Partial<Address> = {
    name: '',
    phone: '',
    address: '',
    type: ''
  };
  quickAddress: Partial<Address> = {
    name: '',
    phone: '',
    address: '',
    province: '',
    district: ''
  };
  paymentMethods: PaymentMethod[] = [
    { id: 1, name: 'Thanh toán khi nhận hàng (COD)', description: 'Thanh toán bằng tiền mặt khi nhận hàng' },
    { id: 2, name: 'Chuyển khoản ngân hàng', description: 'Chuyển khoản qua ngân hàng' },
    { id: 3, name: 'Thẻ tín dụng/Ghi nợ', description: 'Thanh toán qua thẻ Visa/Mastercard' },
    { id: 4, name: 'Ví điện tử', description: 'Thanh toán qua MoMo, ZaloPay, VNPay' }
  ];
  selectedPaymentMethod = 0;

  constructor(
    private router: Router,
    private destroyRef: DestroyRef,
    private http: HttpClient,
    private userData: UserDataService,
    private adminData: AdminDataService,
    private shippingConfigService: ShippingConfigService
  ) {
    this.shippingPricing = this.shippingConfigService.getDeliveryPricingSnapshot();
  }

  private getCurrentUserId(): number | null {
    try {
      const raw = localStorage.getItem('fh_userId');
      const n = raw != null ? Number(raw) : NaN;
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  ngOnInit(): void {
    this.hydrateBadges();
    this.loadCart();
    this.loadAddresses();
    this.loadBranches();

    this.shippingConfigService.getDeliveryPricing()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cfg) => {
        this.shippingPricing = cfg;
      });

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.accountOpen = false;
    });
  }

  private hydrateBadges(): void {
    try {
      const wishlistRaw = localStorage.getItem('wishlist');
      const cartRaw = localStorage.getItem('cart');
      const wishlist = wishlistRaw ? JSON.parse(wishlistRaw) : [];
      const cart = cartRaw ? JSON.parse(cartRaw) : [];
      this.wishlistCount = Array.isArray(wishlist) ? wishlist.length : 0;
      this.cartCount = Array.isArray(cart) ? cart.length : 0;
    } catch {
      this.wishlistCount = 0;
      this.cartCount = 0;
    }
  }

  private loadCart(): void {
    try {
      const raw = localStorage.getItem('cart');
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(arr)) {
        this.items = arr
          .map((x) => x as Partial<CartItem>)
          .filter((x) => typeof x.id === 'number' && typeof x.price === 'number')
          .map((x) => ({
            id: x.id!,
            name: x.name || 'Sản phẩm',
            slug: x.slug || '',
            imageUrl: x.imageUrl,
            image: x.image,
            price: x.price!,
            quantity: typeof x.quantity === 'number' && x.quantity > 0 ? x.quantity : 1,
            size: x.size,
            color: x.color,
            selected: x.selected !== false,
            originalPrice: x.originalPrice || x.price! * 1.2,
            branchId: typeof x.branchId === 'number' ? x.branchId : undefined,
            branchName: x.branchName || x.branch || undefined,
            branch: x.branchName || x.branch || undefined
          }));
      } else {
        this.items = [];
      }
    } catch {
      this.items = [];
    }

    this.cartCount = this.items.length;
  }

  private loadBranches(): void {
    this.adminData.getBranches()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.branches = res?.success && Array.isArray(res.data) ? res.data : [];
        },
        error: () => {
          this.branches = [];
        }
      });
  }

  private loadAddresses(): void {
    let fromStorage: unknown = [];
    try {
      const raw = localStorage.getItem('addresses');
      fromStorage = raw ? JSON.parse(raw) : [];
    } catch {
      fromStorage = [];
    }

    if (Array.isArray(fromStorage) && fromStorage.length > 0) {
      this.addresses = (fromStorage as any[]).map((address) => ({
        ...address,
        latitude: typeof address?.latitude === 'number' ? address.latitude : undefined,
        longitude: typeof address?.longitude === 'number' ? address.longitude : undefined
      }));
      if (this.selectedAddressIndex < 0) this.selectedAddressIndex = 0;
      return;
    }

    this.addresses = [];
    this.selectedAddressIndex = -1;

    const userId = this.getCurrentUserId();
    if (!userId) return;

    this.userData.getMe().subscribe({
      next: (res) => {
        const me = res?.data as any;
        if (!me) return;

        const parts = [me.addressDetail, me.ward, me.district, me.province]
          .map((x: any) => String(x || '').trim())
          .filter((x: string) => !!x);

        if (parts.length === 0) return;

        const addr: Address = {
          id: 1,
          name: String(me.fullName || '').trim() || 'Người nhận',
          phone: String(me.phone || '').trim() || '',
          address: parts.join(', '),
          type: 'Hồ sơ',
          province: me.province || undefined,
          district: me.district || undefined,
          ward: me.ward || undefined,
          latitude: typeof me.latitude === 'number' ? me.latitude : undefined,
          longitude: typeof me.longitude === 'number' ? me.longitude : undefined
        };

        this.addresses = [addr];
        this.selectedAddressIndex = 0;
      },
      error: () => {
        this.addresses = [];
        this.selectedAddressIndex = -1;
      }
    });
  }

  private persistCart(): void {
    localStorage.setItem('cart', JSON.stringify(this.items));
    this.cartCount = this.items.length;
  }

  toggleAccount(): void {
    this.accountOpen = !this.accountOpen;
  }

  closeAccount(): void {
    this.accountOpen = false;
  }

  go(route: string): void {
    this.closeAccount();
    this.router.navigateByUrl(route);
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.activeSuggestIndex = -1;
    const q = value.trim().toLowerCase();
    if (!q) {
      this.searchSuggest = [];
      return;
    }
    const items = this.getSearchIndex();
    const seen = new Set<string>();
    this.searchSuggest = items
      .filter((x) => x.label.toLowerCase().includes(q))
      .filter((x) => {
        if (seen.has(x.route)) return false;
        seen.add(x.route);
        return true;
      })
      .slice(0, 8);
  }

  onSearchFocus(): void {
    this.showSearchSuggest = true;
    if (this.searchQuery) this.onSearchInput(this.searchQuery);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (!this.showSearchSuggest || this.searchSuggest.length === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.submitSearch();
      }
      return;
    }

    const max = this.searchSuggest.length - 1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeSuggestIndex = Math.min(max, this.activeSuggestIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeSuggestIndex = Math.max(0, this.activeSuggestIndex - 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.activeSuggestIndex >= 0) {
        this.selectSuggestion(this.searchSuggest[this.activeSuggestIndex].route);
      } else {
        this.submitSearch();
      }
      return;
    }
    if (event.key === 'Tab' && this.activeSuggestIndex >= 0) {
      event.preventDefault();
      this.selectSuggestion(this.searchSuggest[this.activeSuggestIndex].route);
    }
  }

  selectSuggestion(route: string): void {
    this.showSearchSuggest = false;
    this.activeSuggestIndex = -1;
    this.router.navigateByUrl(route);
  }

  submitSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) return;
    const slug = q
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    this.showSearchSuggest = false;
    this.router.navigateByUrl(`/category/${slug}`);
  }

  private getSearchIndex(): Array<{ label: string; route: string }> {
    const fromQuick = (this.cfg.quickTiles || []).map((x) => ({ label: x.label, route: x.route }));
    const fromGroups = this.cfg.categoryGroups.flatMap((g) => g.items).map((x) => ({ label: x.label, route: x.route }));
    return [...fromQuick, ...fromGroups];
  }

  onNavClick(item: { sectionId?: HomeSectionId; route?: string }): void {
    if (item.route) {
      this.router.navigateByUrl(item.route);
      return;
    }
    if (!item.sectionId) return;
    this.router.navigateByUrl('/sale').then(() => {
      window.setTimeout(() => {
        const el = document.getElementById(item.sectionId as string);
        if (!el) return;
        const header = document.querySelector('.header') as HTMLElement | null;
        const headerOffset = (header?.offsetHeight ?? 0) + 10;
        const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }, 50);
    });
  }

  get subtotal(): number {
    return this.selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  get originalTotal(): number {
    return this.selectedItems.reduce((sum, i) => sum + (i.originalPrice || i.price) * i.quantity, 0);
  }

  get selectedItems(): CartItem[] {
    return this.items.filter((item) => item.selected);
  }

  get selectedItemsCount(): number {
    return this.selectedItems.reduce((count, item) => count + item.quantity, 0);
  }

  get selectedAddress(): Address | null {
    return this.selectedAddressIndex >= 0 ? this.addresses[this.selectedAddressIndex] : null;
  }

  get shipmentGroups(): ShipmentGroup[] {
    if (!this.selectedItems.length) return [];
    const grouped = new Map<string, CartItem[]>();

    for (const item of this.selectedItems) {
      const key = item.branchId != null
        ? `branch:${item.branchId}`
        : `branch-name:${String(item.branchName || item.branch || 'unknown').trim().toLowerCase()}`;
      const bucket = grouped.get(key) || [];
      bucket.push(item);
      grouped.set(key, bucket);
    }

    return Array.from(grouped.entries()).map(([key, items]) => this.buildShipmentGroup(key, items));
  }

  get shippingFee(): number {
    return this.shipmentGroups.reduce((sum, shipment) => sum + shipment.selectedOption.fee, 0);
  }

  get totalAmount(): number {
    return this.subtotal + this.shippingFee - this.discountAmount;
  }

  get total(): number {
    return this.totalAmount;
  }

  formatMoney(v: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(v));
  }

  formatPrice(v: number): string {
    return this.formatMoney(v);
  }

  formatShippingDays(minDays: number, maxDays: number): string {
    if (minDays === maxDays) return `${minDays} ngày`;
    return `${minDays}-${maxDays} ngày`;
  }

  formatDistanceKm(distanceKm: number): string {
    return `${distanceKm.toFixed(distanceKm >= 100 ? 0 : 1)} km`;
  }

  inc(item: CartItem): void {
    item.quantity += 1;
    this.persistCart();
  }

  dec(item: CartItem): void {
    item.quantity = Math.max(1, item.quantity - 1);
    this.persistCart();
  }

  increaseQuantity(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.items[index].quantity += 1;
      this.persistCart();
    }
  }

  decreaseQuantity(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.items[index].quantity = Math.max(1, this.items[index].quantity - 1);
      this.persistCart();
    }
  }

  remove(item: CartItem): void {
    this.items = this.items.filter((x) => x !== item);
    this.persistCart();
  }

  removeItem(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);
      this.persistCart();
    }
  }

  toggleItemSelection(index: number, checked: boolean): void {
    if (index < 0 || index >= this.items.length) return;
    this.items[index].selected = checked;
    this.persistCart();
  }

  setShipmentMethod(shipment: ShipmentGroup, method: DeliveryMethod): void {
    this.selectedShipmentMethods[shipment.key] = method;
    localStorage.setItem(this.getShipmentMethodStorageKey(shipment.key), method);
  }

  checkout(): void {
    if (this.selectedItemsCount === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán');
      return;
    }
    if (!this.selectedAddress) {
      alert('Vui lòng chọn địa chỉ giao hàng');
      return;
    }

    const checkoutData = {
      items: this.selectedItems,
      shipments: this.shipmentGroups,
      address: this.selectedAddress,
      paymentMethod: this.paymentMethods[this.selectedPaymentMethod],
      subtotal: this.subtotal,
      shippingFee: this.shippingFee,
      discountAmount: this.discountAmount,
      totalAmount: this.totalAmount
    };

    localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    this.router.navigateByUrl('/checkout');
  }

  toggleSelectAll(): void {
    const allSelected = this.isAllSelected();
    this.items.forEach((item) => item.selected = !allSelected);
    this.persistCart();
  }

  isAllSelected(): boolean {
    return this.items.length > 0 && this.items.every((item) => item.selected);
  }

  updateSelection(): void {
    this.persistCart();
  }

  openDiscountModal(): void {
    const userId = this.getCurrentUserId();
    this.discountModalOpen = true;
    this.discountSearchQuery = '';

    if (this.discountOptions.length === 0) {
      this.loadDiscountOptions(userId);
    } else {
      this.filterDiscounts();
    }
  }

  closeDiscountModal(): void {
    this.discountModalOpen = false;
  }

  openAddressModal(): void {
    this.addressModalOpen = true;
  }

  closeAddressModal(): void {
    this.addressModalOpen = false;
  }

  private loadDiscountOptions(userId: number | null): void {
    if (this.discountLoading) return;
    this.discountLoading = true;
    this.discountLoadError = '';

    const allCouponsUrl = `${environment.apiBaseUrl}/api/coupons`;
    this.http.get<ApiResponse<CouponDto[]>>(allCouponsUrl).subscribe({
      next: (res) => {
        const coupons = Array.isArray(res?.data)
          ? res.data.filter((coupon): coupon is CouponDto => !!coupon && !!coupon.code)
          : [];

        if (!userId) {
          this.discountLoading = false;
          this.claimedCouponCodes = new Set();
          this.discountOptions = coupons;
          this.filterDiscounts();
          return;
        }

        const claimedCouponsUrl = `${environment.apiBaseUrl}/api/coupons/user?userId=${encodeURIComponent(String(userId))}&status=CLAIMED`;
        this.http.get<ApiResponse<UserCouponDto[]>>(claimedCouponsUrl).subscribe({
          next: (claimedRes) => {
            this.discountLoading = false;
            const claimed = Array.isArray(claimedRes?.data) ? claimedRes.data : [];
            this.claimedCouponCodes = new Set(
              claimed
                .map((row) => String(row?.coupon?.code || '').trim().toUpperCase())
                .filter((code) => !!code)
            );
            this.discountOptions = coupons;
            this.filterDiscounts();
          },
          error: () => {
            this.discountLoading = false;
            this.claimedCouponCodes = new Set();
            this.discountOptions = coupons;
            this.filterDiscounts();
          }
        });
      },
      error: () => {
        this.discountLoading = false;
        this.discountLoadError = 'Không tải được danh sách mã giảm giá.';
        this.discountOptions = [];
        this.filteredDiscounts = [];
      }
    });
  }

  filterDiscounts(): void {
    const query = this.discountSearchQuery.toLowerCase().trim();
    const filtered = !query
      ? [...this.discountOptions]
      : this.discountOptions.filter((coupon) =>
          coupon.code.toLowerCase().includes(query) ||
          !!coupon.description?.toLowerCase().includes(query)
        );

    this.filteredDiscounts = filtered.sort((a, b) => {
      const aEligible = this.isDiscountEligible(a) ? 1 : 0;
      const bEligible = this.isDiscountEligible(b) ? 1 : 0;
      if (aEligible !== bEligible) return bEligible - aEligible;
      return String(a.code || '').localeCompare(String(b.code || ''), 'vi');
    });
  }

  isDiscountEligible(coupon: CouponDto): boolean {
    const code = String(coupon.code || '').trim().toUpperCase();
    if (!code || !this.claimedCouponCodes.has(code)) return false;
    if (coupon.active === false) return false;
    const min = Number(coupon?.minOrderAmount);
    if (Number.isFinite(min) && min > 0 && this.subtotal < min) return false;
    if (coupon.endsAt && new Date(coupon.endsAt) < new Date()) return false;
    if (coupon.startsAt && new Date(coupon.startsAt) > new Date()) return false;
    if (coupon.usageLimit && coupon.usedCount && coupon.usedCount >= coupon.usageLimit) return false;
    return true;
  }

  isDiscountSelected(coupon: CouponDto): boolean {
    return this.discountCode.trim().toUpperCase() === String(coupon.code || '').trim().toUpperCase();
  }

  pickDiscount(coupon: CouponDto): void {
    if (!this.isDiscountEligible(coupon)) return;
    this.discountCode = coupon.code;
    this.discountModalOpen = false;
    this.applyDiscount();
  }

  applyDiscount(): void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      this.discountMessage = 'Vui lòng đăng nhập để sử dụng mã giảm giá.';
      this.discountAmount = 0;
      return;
    }

    if (!this.discountCode.trim()) {
      this.discountMessage = 'Vui lòng nhập mã giảm giá';
      return;
    }

    const code = this.discountCode.toUpperCase().trim();
    const mockCoupon = this.discountOptions.find((c) => c.code === code);
    if (mockCoupon) {
      if (!this.isDiscountEligible(mockCoupon)) {
        this.discountAmount = 0;
        this.discountMessage = `Đơn hàng tối thiểu ${this.formatMoney(mockCoupon.minOrderAmount || 0)}đ để áp dụng mã này.`;
        return;
      }

      let discount = 0;
      if (mockCoupon.discountPercent) {
        discount = this.subtotal * (mockCoupon.discountPercent / 100);
        if (mockCoupon.maxDiscountAmount) discount = Math.min(discount, mockCoupon.maxDiscountAmount);
      } else if (mockCoupon.discountAmount) {
        discount = mockCoupon.discountAmount;
      }

      this.discountAmount = Math.min(Math.round(discount), this.subtotal);
      this.discountMessage = `Đã áp dụng mã giảm giá: -${this.formatMoney(this.discountAmount)}đ`;
      return;
    }

    const apiUrl = `${environment.apiBaseUrl}/api/coupons/preview`;
    this.http.post<ApiResponse<{ discount: number }>>(apiUrl, {
      userId,
      couponCode: code,
      subtotal: this.subtotal
    }).subscribe({
      next: (res) => {
        const discount = Number(res?.data?.discount);
        if (!Number.isFinite(discount) || discount <= 0) {
          this.discountAmount = 0;
          this.discountMessage = 'Mã giảm giá không hợp lệ hoặc không áp dụng được.';
          return;
        }
        this.discountAmount = Math.min(Math.round(discount), this.subtotal);
        this.discountMessage = `Đã áp dụng mã giảm giá: -${this.formatMoney(this.discountAmount)}đ`;
      },
      error: () => {
        this.discountAmount = 0;
        this.discountMessage = 'Mã giảm giá không hợp lệ hoặc không áp dụng được.';
      }
    });
  }

  selectAddress(index: number): void {
    this.selectedAddressIndex = index;
  }

  selectAddressFromModal(index: number): void {
    this.selectAddress(index);
    this.closeAddressModal();
  }

  isNewAddressValid(): boolean {
    return !!(this.newAddress.name?.trim() && this.newAddress.phone?.trim() && this.newAddress.address?.trim());
  }

  isQuickAddressValid(): boolean {
    return !!(this.quickAddress.name?.trim() && this.quickAddress.phone?.trim() && this.quickAddress.address?.trim());
  }

  cancelAddAddress(): void {
    this.showAddAddress = false;
    this.resetNewAddress();
  }

  cancelQuickAdd(): void {
    this.showAddAddressForm = false;
    this.resetQuickAddress();
  }

  resetNewAddress(): void {
    this.newAddress = { name: '', phone: '', address: '', type: '' };
  }

  resetQuickAddress(): void {
    this.quickAddress = { name: '', phone: '', address: '', province: '', district: '' };
  }

  saveNewAddress(): void {
    if (!this.isNewAddressValid()) return;
    const address: Address = {
      id: Date.now(),
      name: this.newAddress.name!.trim(),
      phone: this.newAddress.phone!.trim(),
      address: this.newAddress.address!.trim(),
      type: this.newAddress.type || undefined
    };
    this.addresses.push(address);
    this.saveAddressesToStorage();
    this.showAddAddress = false;
    this.resetNewAddress();
    if (this.addresses.length === 1) this.selectedAddressIndex = 0;
  }

  saveQuickAddress(): void {
    if (!this.isQuickAddressValid()) return;
    const fullAddress = [
      this.quickAddress.address?.trim(),
      this.quickAddress.district?.trim(),
      this.quickAddress.province?.trim()
    ].filter(Boolean).join(', ');

    const address: Address = {
      id: Date.now(),
      name: this.quickAddress.name!.trim(),
      phone: this.quickAddress.phone!.trim(),
      address: fullAddress,
      type: 'NhĂ  riĂªng',
      province: this.quickAddress.province?.trim() || undefined,
      district: this.quickAddress.district?.trim() || undefined
    };
    this.addresses.push(address);
    this.saveAddressesToStorage();
    this.showAddAddressForm = false;
    this.resetQuickAddress();
    if (this.addresses.length === 1) this.selectedAddressIndex = 0;
  }

  setPrimaryAddress(index: number): void {
    if (index < 0 || index >= this.addresses.length) return;
    const primaryAddress = this.addresses.splice(index, 1)[0];
    this.addresses.unshift(primaryAddress);
    if (this.selectedAddressIndex === index) {
      this.selectedAddressIndex = 0;
    } else if (this.selectedAddressIndex > index) {
      this.selectedAddressIndex--;
    } else if (this.selectedAddressIndex < index) {
      this.selectedAddressIndex++;
    }
    this.saveAddressesToStorage();
  }

  deleteAddress(index: number): void {
    if (index < 0 || index >= this.addresses.length) return;
    this.addresses.splice(index, 1);
    if (this.selectedAddressIndex === index) {
      this.selectedAddressIndex = this.addresses.length > 0 ? 0 : -1;
    } else if (this.selectedAddressIndex > index) {
      this.selectedAddressIndex--;
    }
    this.saveAddressesToStorage();
  }

  private saveAddressesToStorage(): void {
    try {
      localStorage.setItem('addresses', JSON.stringify(this.addresses));
    } catch {
    }
  }

  proceedToCheckout(): void {
    if (this.items.length === 0 || this.selectedAddressIndex === -1) return;
    const selectedAddress = this.addresses[this.selectedAddressIndex];
    this.router.navigate(['/checkout'], {
      state: {
        items: this.items,
        address: selectedAddress,
        subtotal: this.subtotal,
        shippingFee: this.shippingFee,
        discountAmount: this.discountAmount,
        total: this.total,
        discountCode: this.discountCode
      }
    });
  }

  continueShopping(): void {
    this.router.navigate(['/sale']);
  }

  clearCart(): void {
    if (confirm('Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?')) {
      this.items = [];
      this.persistCart();
    }
  }

  selectPaymentMethod(index: number): void {
    this.selectedPaymentMethod = index;
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showScrollTop = window.scrollY > 500;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.accountOpen = false;
    this.showSearchSuggest = false;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private buildShipmentGroup(key: string, items: CartItem[]): ShipmentGroup {
    const first = items[0];
    const branch = this.findBranch(first);
    const branchName = String(branch?.name || first?.branchName || first?.branch || 'Chi nhánh chưa rõ').trim();
    const branchAddress = this.formatBranchAddress(branch);
    const branchProvince = this.resolveBranchProvince(branch, first, branchName, branchAddress);
    const customerProvince = String(this.selectedAddress?.province || '').trim();
    const sameProvince = this.shippingConfigService.isSameProvince(branchProvince, customerProvince);
    const zoneKey = sameProvince ? 'sameProvince' : 'differentProvince';
    const actualDistance = this.computeDistanceKm(
      branch?.latitude,
      branch?.longitude,
      this.selectedAddress?.latitude,
      this.selectedAddress?.longitude
    );
    const options = (['ECONOMY', 'FAST'] as DeliveryMethod[]).map((method) =>
      this.buildShipmentOption(method, this.shippingPricing[zoneKey][method], actualDistance)
    );
    const storedMethod = this.selectedShipmentMethods[key] || this.readStoredShipmentMethod(key);
    const selectedOption = options.find((option) => option.method === storedMethod) || options[0];

    return {
      key,
      branchId: branch?.id ?? first?.branchId ?? null,
      branchCode: String(branch?.code || '').trim(),
      branchName,
      branchAddress,
      branchProvince,
      customerProvince,
      sameProvince,
      items,
      itemCount: items.length,
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      distanceSource: actualDistance != null ? 'map' : 'config',
      options,
      selectedOption
    };
  }

  private buildShipmentOption(method: DeliveryMethod, cfgList: DeliveryDistanceTier[], actualDistanceKm: number | null): ShipmentOption {
    const cfg = this.pickTierForDistance(cfgList, actualDistanceKm);
    return {
      method,
      label: method === 'FAST' ? 'Giao nhanh' : 'Giao tiết kiệm',
      distanceKm: actualDistanceKm != null ? actualDistanceKm : Math.max(0, Number(cfg.maxDistanceKm || 0)),
      fee: Math.max(0, Number(cfg.fee || 0)),
      minDays: Math.max(0, Number(cfg.minDays || 0)),
      maxDays: Math.max(0, Number(cfg.maxDays || 0))
    };
  }

  private pickTierForDistance(tiers: DeliveryDistanceTier[], distanceKm: number | null): DeliveryDistanceTier {
    const normalized = (Array.isArray(tiers) ? tiers : [])
      .slice()
      .sort((a, b) => a.minDistanceKm - b.minDistanceKm || a.maxDistanceKm - b.maxDistanceKm);
    if (!normalized.length) {
      return { minDistanceKm: 0, maxDistanceKm: 0, minDays: 0, maxDays: 0, fee: 0 };
    }
    if (distanceKm == null) return normalized[0];
    const matched = normalized.find((tier) => distanceKm >= Number(tier.minDistanceKm || 0) && distanceKm <= Number(tier.maxDistanceKm || 0));
    if (matched) return matched;
    const above = normalized.find((tier) => distanceKm < Number(tier.minDistanceKm || 0));
    if (above) return above;
    return normalized[normalized.length - 1];
  }

  private findBranch(item: CartItem | null | undefined): AdminBranchResponse | null {
    if (!item) return null;
    if (item.branchId != null) {
      const byId = this.branches.find((branch) => branch.id === item.branchId);
      if (byId) return byId;
    }
    const branchName = this.normalizeLookupText(item.branchName || item.branch || '');
    if (!branchName) return null;
    return this.branches.find((branch) => {
      const candidateName = this.normalizeLookupText(branch.name || '');
      const candidateCode = this.normalizeLookupText(branch.code || '');
      return candidateName === branchName || candidateCode === branchName || candidateName.includes(branchName) || branchName.includes(candidateName);
    }) || null;
  }

  private resolveBranchProvince(
    branch: AdminBranchResponse | null,
    item: CartItem | null | undefined,
    branchName: string,
    branchAddress: string
  ): string {
    const direct = String(branch?.province || '').trim();
    if (direct) return direct;

    const fromItemName = this.findProvinceFromText(String(item?.branchName || item?.branch || '').trim());
    if (fromItemName) return fromItemName;

    const fromAddress = this.findProvinceFromText(branchAddress);
    if (fromAddress) return fromAddress;

    return this.findProvinceFromText(branchName);
  }

  private findProvinceFromText(value: string): string {
    const text = this.normalizeLookupText(value);
    if (!text) return '';
    const provinces = this.branches
      .map((branch) => String(branch.province || '').trim())
      .filter((province, index, arr) => !!province && arr.indexOf(province) === index);

    return provinces.find((province) => {
      const normalizedProvince = this.normalizeLookupText(province);
      return !!normalizedProvince && (text.includes(normalizedProvince) || normalizedProvince.includes(text));
    }) || '';
  }

  private normalizeLookupText(value: unknown): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private formatBranchAddress(branch: AdminBranchResponse | null): string {
    if (!branch) return 'Chưa đồng bộ địa chỉ từ chi nhánh';
    const parts = [branch.address, branch.ward, branch.district, branch.province]
      .map((value) => String(value || '').trim())
      .filter((value) => !!value);
    return parts.length ? parts.join(', ') : 'Chưa khai báo địa chỉ';
  }

  private computeDistanceKm(
    lat1?: number | null,
    lng1?: number | null,
    lat2?: number | null,
    lng2?: number | null
  ): number | null {
    if (![lat1, lng1, lat2, lng2].every((value) => typeof value === 'number' && Number.isFinite(value))) {
      return null;
    }
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLat = toRad((lat2 as number) - (lat1 as number));
    const dLng = toRad((lng2 as number) - (lng1 as number));
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1 as number)) * Math.cos(toRad(lat2 as number)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(6371 * c * 10) / 10;
  }

  private getShipmentMethodStorageKey(key: string): string {
    return `cart_shipping_method_${key}`;
  }

  private readStoredShipmentMethod(key: string): DeliveryMethod | null {
    try {
      const raw = localStorage.getItem(this.getShipmentMethodStorageKey(key));
      return raw === 'FAST' || raw === 'ECONOMY' ? raw : null;
    } catch {
      return null;
    }
  }
}

