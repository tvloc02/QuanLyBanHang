import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { HOME_CONFIG, HomeSectionId } from '../home/home.config';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FooterComponent } from '../../shared/footer/footer.component';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { UserDataService, UserMeResponse } from '../../core/services/user-data.service';

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
}

interface Address {
  id: number;
  name: string;
  phone: string;
  address: string;
  type?: string;
  province?: string;
  district?: string;
}

interface PaymentMethod {
  id: number;
  name: string;
  description: string;
}

interface DiscountCode {
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  minAmount?: number;
}

interface CouponDto {
  id: number;
  code: string;
  description?: string | null;
  discountAmount?: number | null;
  discountPercent?: number | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
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
  
  // New properties for enhanced cart functionality
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
    private userData: UserDataService
  ) {}

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

    // Close account dropdown when route changes
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
            price: x.price!,
            quantity: typeof x.quantity === 'number' && x.quantity > 0 ? x.quantity : 1,
            size: x.size,
            color: x.color,
            selected: x.selected !== false, // Default to true
            originalPrice: x.originalPrice || x.price! * 1.2, // Mock original price
            branch: x.branch || ['Hà Nội', 'TP.HCM', 'Đà Nẵng'][Math.floor(Math.random() * 3)]
          }));
      } else {
        this.items = [];
      }
    } catch {
      this.items = [];
    }

    this.cartCount = this.items.length;
    console.log('🛒 Loaded cart items:', this.items.length);
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
      this.addresses = fromStorage as Address[];
      if (this.selectedAddressIndex < 0) this.selectedAddressIndex = 0;
      console.log('🛒 Loaded addresses from storage:', this.addresses);
      return;
    }

    this.addresses = [];
    this.selectedAddressIndex = -1;

    const userId = this.getCurrentUserId();
    if (!userId) {
      console.log('🛒 User not logged in');
      return;
    }

    console.log('🛒 Loading addresses from UserDataService for user:', userId);
    this.userData.getMe().subscribe({
      next: (res) => {
        console.log('🛒 UserDataService response:', res);
        const me = res?.data;
        if (!me) {
          console.log('🛒 No user data in UserDataService response');
          return;
        }

        const parts = [me.addressDetail, me.ward, me.district, me.province]
          .map((x) => String(x || '').trim())
          .filter((x) => !!x);

        console.log('🛒 Address parts from UserDataService:', parts);

        if (parts.length === 0) {
          console.log('🛒 No address parts found for user in UserDataService');
          return;
        }

        const addr: Address = {
          id: 1,
          name: String(me.fullName || '').trim() || 'Người nhận',
          phone: String(me.phone || '').trim() || '',
          address: parts.join(', '),
          type: 'Hồ sơ',
          province: me.province || undefined,
          district: me.district || undefined
        };

        this.addresses = [addr];
        this.selectedAddressIndex = 0;
        console.log('🛒 Loaded address from UserDataService:', this.addresses);
      },
      error: (err) => {
        console.error('🛒 Error loading user address from UserDataService:', err);
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
        const k = x.route;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 8);
  }

  onSearchFocus(): void {
    this.showSearchSuggest = true;
    if (this.searchQuery) {
      this.onSearchInput(this.searchQuery);
    }
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
    if (event.key === 'Tab') {
      if (this.activeSuggestIndex >= 0) {
        event.preventDefault();
        this.selectSuggestion(this.searchSuggest[this.activeSuggestIndex].route);
      }
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
    return this.items.filter(item => item.selected);
  }

  get selectedItemsCount(): number {
    return this.selectedItems.reduce((count, item) => count + item.quantity, 0);
  }

  get shippingFee(): number {
    if (this.selectedItems.length === 0) return 0;
    
    // Calculate shipping based on branches
    const branches = new Set(this.selectedItems.map(item => item.branch));
    let fee = 0;
    
    branches.forEach(branch => {
      switch (branch) {
        case 'Hà Nội':
          fee += 30000;
          break;
        case 'TP.HCM':
          fee += 25000;
          break;
        case 'Đà Nẵng':
          fee += 35000;
          break;
        default:
          fee += 30000;
      }
    });
    
    return fee;
  }

  get totalAmount(): number {
    return this.subtotal + this.shippingFee - this.discountAmount;
  }

  get total(): number {
    return this.totalAmount;
  }

  get selectedAddress(): Address | null {
    return this.selectedAddressIndex >= 0 ? this.addresses[this.selectedAddressIndex] : null;
  }

  formatMoney(v: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(v));
  }

  formatPrice(v: number): string {
    return this.formatMoney(v);
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
      console.log('🛒 Increased quantity for item at index:', index);
    }
  }

  decreaseQuantity(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.items[index].quantity = Math.max(1, this.items[index].quantity - 1);
      this.persistCart();
      console.log('🛒 Decreased quantity for item at index:', index);
    }
  }

  remove(item: CartItem): void {
    this.items = this.items.filter((x) => x !== item);
    this.persistCart();
  }

  removeItem(index: number): void {
    if (index >= 0 && index < this.items.length) {
      const removedItem = this.items[index];
      this.items.splice(index, 1);
      this.persistCart();
      console.log('🛒 Removed item:', removedItem);
    }
  }

  toggleItemSelection(index: number, checked: boolean): void {
    if (index < 0 || index >= this.items.length) return;
    this.items[index].selected = checked;
    this.persistCart();
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
    
    // Prepare checkout data
    const checkoutData = {
      items: this.selectedItems,
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

  // Checkbox functionality
  toggleSelectAll(): void {
    const allSelected = this.isAllSelected();
    this.items.forEach(item => item.selected = !allSelected);
    this.persistCart();
  }

  isAllSelected(): boolean {
    return this.items.length > 0 && this.items.every(item => item.selected);
  }

  updateSelection(): void {
    this.persistCart();
  }

  openDiscountModal(): void {
    const userId = this.getCurrentUserId();
    console.log('🛒 Opening discount modal, userId:', userId);
    this.discountModalOpen = true;
    this.discountSearchQuery = '';

    if (!userId) {
      console.log('🛒 User not logged in');
      this.discountLoadError = 'Vui lòng đăng nhập để xem voucher.';
      this.discountOptions = [];
      this.filteredDiscounts = [];
      return;
    }

    if (this.discountOptions.length === 0) {
      console.log('🛒 Loading discount options...');
      this.loadDiscountOptions(userId);
    } else {
      console.log('🛒 Using cached discount options:', this.discountOptions.length);
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

  private loadDiscountOptions(userId: number): void {
    if (this.discountLoading) return;
    this.discountLoading = true;
    this.discountLoadError = '';
    
    const apiUrl = `${environment.apiBaseUrl}/api/coupons/user?userId=${encodeURIComponent(String(userId))}&status=CLAIMED`;
    console.log('🛒 Loading discount options from:', apiUrl);
    
    this.http
      .get<ApiResponse<UserCouponDto[]>>(apiUrl)
      .subscribe({
        next: (res) => {
          console.log('🛒 Discount API response:', res);
          this.discountLoading = false;
          const list = Array.isArray(res?.data) ? res.data : [];
          console.log('🛒 Raw coupon list:', list);
          
          this.discountOptions = list
            .map((x) => x?.coupon || null)
            .filter((c): c is CouponDto => !!c && !!c.code);
            
          console.log('🛒 Processed discount options:', this.discountOptions);
          
          // Apply initial filter
          this.filterDiscounts();
        },
        error: (err) => {
          console.error('🛒 Discount API error:', err);
          this.discountLoading = false;
          this.discountLoadError = 'Không tải được danh sách mã giảm giá.';
          this.discountOptions = [];
          this.filteredDiscounts = [];
        }
      });
  }

  filterDiscounts(): void {
    console.log('🛒 Filtering discounts with query:', this.discountSearchQuery);
    
    if (!this.discountSearchQuery.trim()) {
      this.filteredDiscounts = [...this.discountOptions];
      console.log('🛒 No search query, showing all discounts:', this.filteredDiscounts.length);
      return;
    }
    
    const query = this.discountSearchQuery.toLowerCase().trim();
    this.filteredDiscounts = this.discountOptions.filter(coupon => 
      coupon.code.toLowerCase().includes(query) ||
      (coupon.description && coupon.description.toLowerCase().includes(query))
    );
    
    console.log('🛒 Filtered discounts:', this.filteredDiscounts.length);
  }

  isDiscountEligible(coupon: CouponDto): boolean {
    // Check if coupon is active
    if (coupon.active === false) {
      return false;
    }
    
    // Check minimum order amount
    const min = Number(coupon?.minOrderAmount);
    if (Number.isFinite(min) && min > 0) {
      if (this.subtotal < min) {
        return false;
      }
    }
    
    // Check if coupon has expired
    if (coupon.endsAt) {
      const endDate = new Date(coupon.endsAt);
      if (endDate < new Date()) {
        return false;
      }
    }
    
    // Check if coupon has started
    if (coupon.startsAt) {
      const startDate = new Date(coupon.startsAt);
      if (startDate > new Date()) {
        return false;
      }
    }
    
    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount) {
      if (coupon.usedCount >= coupon.usageLimit) {
        return false;
      }
    }
    
    return true;
  }

  pickDiscount(coupon: CouponDto): void {
    console.log('🛒 Picking discount coupon:', coupon);
    
    // Only apply if eligible
    if (!this.isDiscountEligible(coupon)) {
      console.log('🛒 Coupon not eligible, cannot apply');
      return;
    }
    
    this.discountCode = coupon.code;
    this.discountModalOpen = false;
    this.applyDiscount();
  }

  // Discount functionality
  applyDiscount(): void {
    const userId = this.getCurrentUserId();
    console.log('🛒 Applying discount, userId:', userId, 'code:', this.discountCode, 'subtotal:', this.subtotal);
    
    if (!userId) {
      console.log('🛒 User not logged in for discount');
      this.discountMessage = 'Vui lòng đăng nhập để sử dụng mã giảm giá.';
      this.discountAmount = 0;
      return;
    }

    if (!this.discountCode.trim()) {
      console.log('🛒 No discount code provided');
      this.discountMessage = 'Vui lòng nhập mã giảm giá';
      return;
    }

    const code = this.discountCode.toUpperCase().trim();
    
    // First try to apply from mock data
    const mockCoupon = this.discountOptions.find(c => c.code === code);
    if (mockCoupon) {
      console.log('🛒 Found mock coupon:', mockCoupon);
      
      // Check eligibility
      if (!this.isDiscountEligible(mockCoupon)) {
        this.discountAmount = 0;
        this.discountMessage = `Đơn hàng tối thiểu ${this.formatMoney(mockCoupon.minOrderAmount || 0)}đ để áp dụng mã này.`;
        return;
      }
      
      // Calculate discount
      let discount = 0;
      if (mockCoupon.discountPercent) {
        discount = this.subtotal * (mockCoupon.discountPercent / 100);
        if (mockCoupon.maxDiscountAmount) {
          discount = Math.min(discount, mockCoupon.maxDiscountAmount);
        }
      } else if (mockCoupon.discountAmount) {
        discount = mockCoupon.discountAmount;
      }
      
      this.discountAmount = Math.min(Math.round(discount), this.subtotal);
      this.discountMessage = `Đã áp dụng mã giảm giá: -${this.formatMoney(this.discountAmount)}đ`;
      console.log('🛒 Mock discount applied successfully:', this.discountAmount);
      return;
    }
    
    // If not found in mock data, try API
    const apiUrl = `${environment.apiBaseUrl}/api/coupons/preview`;
    const requestBody = {
      userId,
      couponCode: code,
      subtotal: this.subtotal
    };
    
    console.log('🛒 Discount preview API call:', apiUrl, requestBody);
    
    this.http
      .post<ApiResponse<{ couponCode: string; subtotal: number; discount: number; totalAfterDiscount: number }>>(
        apiUrl,
        requestBody
      )
      .subscribe({
        next: (res) => {
          console.log('🛒 Discount preview response:', res);
          const d = res?.data;
          const discount = Number((d as any)?.discount);
          
          if (!Number.isFinite(discount) || discount <= 0) {
            console.log('🛒 Invalid discount amount:', discount);
            this.discountAmount = 0;
            this.discountMessage = 'Mã giảm giá không hợp lệ hoặc không áp dụng được.';
            return;
          }
          
          this.discountAmount = Math.min(Math.round(discount), this.subtotal);
          this.discountMessage = `Đã áp dụng mã giảm giá: -${this.formatMoney(this.discountAmount)}đ`;
          console.log('🛒 Discount applied successfully:', this.discountAmount);
        },
        error: (err) => {
          console.error('🛒 Discount preview error:', err);
          this.discountAmount = 0;
          this.discountMessage = 'Mã giảm giá không hợp lệ hoặc không áp dụng được.';
        }
      });
  }

  // Address functionality
  selectAddress(index: number): void {
    this.selectedAddressIndex = index;
    console.log('🛒 Selected address:', this.addresses[index]);
  }

  selectAddressFromModal(index: number): void {
    this.selectAddress(index);
    this.closeAddressModal();
  }

  // Address management methods
  isNewAddressValid(): boolean {
    return !!(this.newAddress.name?.trim() && 
              this.newAddress.phone?.trim() && 
              this.newAddress.address?.trim());
  }

  isQuickAddressValid(): boolean {
    return !!(this.quickAddress.name?.trim() && 
              this.quickAddress.phone?.trim() && 
              this.quickAddress.address?.trim());
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
    this.newAddress = {
      name: '',
      phone: '',
      address: '',
      type: ''
    };
  }

  resetQuickAddress(): void {
    this.quickAddress = {
      name: '',
      phone: '',
      address: '',
      province: '',
      district: ''
    };
  }

  saveNewAddress(): void {
    if (!this.isNewAddressValid()) {
      console.log('🛒 New address is not valid');
      return;
    }

    const address: Address = {
      id: Date.now(), // Temporary ID
      name: this.newAddress.name!.trim(),
      phone: this.newAddress.phone!.trim(),
      address: this.newAddress.address!.trim(),
      type: this.newAddress.type || undefined
    };

    this.addresses.push(address);
    this.saveAddressesToStorage();
    this.showAddAddress = false;
    this.resetNewAddress();
    
    // Auto-select the new address if it's the first one
    if (this.addresses.length === 1) {
      this.selectedAddressIndex = 0;
    }
    
    console.log('🛒 Added new address:', address);
  }

  saveQuickAddress(): void {
    if (!this.isQuickAddressValid()) {
      console.log('🛒 Quick address is not valid');
      return;
    }

    // Combine address parts
    const fullAddress = [
      this.quickAddress.address?.trim(),
      this.quickAddress.district?.trim(),
      this.quickAddress.province?.trim()
    ].filter(Boolean).join(', ');

    const address: Address = {
      id: Date.now(), // Temporary ID
      name: this.quickAddress.name!.trim(),
      phone: this.quickAddress.phone!.trim(),
      address: fullAddress,
      type: 'Nhà riêng', // Default type for quick add
      province: this.quickAddress.province?.trim() || undefined,
      district: this.quickAddress.district?.trim() || undefined
    };

    this.addresses.push(address);
    this.saveAddressesToStorage();
    this.showAddAddressForm = false;
    this.resetQuickAddress();
    
    // Auto-select the new address if it's the first one
    if (this.addresses.length === 1) {
      this.selectedAddressIndex = 0;
    }
    
    console.log('🛒 Added quick address:', address);
  }

  setPrimaryAddress(index: number): void {
    if (index < 0 || index >= this.addresses.length) return;
    
    // Move the selected address to the top
    const primaryAddress = this.addresses.splice(index, 1)[0];
    this.addresses.unshift(primaryAddress);
    
    // Update selected index
    if (this.selectedAddressIndex === index) {
      this.selectedAddressIndex = 0;
    } else if (this.selectedAddressIndex > index) {
      this.selectedAddressIndex--;
    } else if (this.selectedAddressIndex < index) {
      this.selectedAddressIndex++;
    }
    
    this.saveAddressesToStorage();
    console.log('🛒 Set primary address:', this.addresses[0]);
  }

  deleteAddress(index: number): void {
    if (index < 0 || index >= this.addresses.length) return;
    
    const deletedAddress = this.addresses[index];
    this.addresses.splice(index, 1);
    
    // Update selected index
    if (this.selectedAddressIndex === index) {
      this.selectedAddressIndex = this.addresses.length > 0 ? 0 : -1;
    } else if (this.selectedAddressIndex > index) {
      this.selectedAddressIndex--;
    }
    
    this.saveAddressesToStorage();
    console.log('🛒 Deleted address:', deletedAddress);
  }

  private saveAddressesToStorage(): void {
    try {
      localStorage.setItem('addresses', JSON.stringify(this.addresses));
      console.log('🛒 Saved addresses to storage:', this.addresses.length);
    } catch (error) {
      console.error('🛒 Error saving addresses:', error);
    }
  }

  proceedToCheckout(): void {
    if (this.items.length === 0) {
      console.log('🛒 Cannot proceed to checkout: cart is empty');
      return;
    }

    if (this.selectedAddressIndex === -1) {
      console.log('🛒 Cannot proceed to checkout: no address selected');
      return;
    }

    const selectedAddress = this.addresses[this.selectedAddressIndex];
    console.log('🛒 Proceeding to checkout with address:', selectedAddress);
    
    // Navigate to checkout page with selected address
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
    console.log('🛒 Continuing shopping');
    this.router.navigate(['/sale']);
  }

  clearCart(): void {
    if (confirm('Bạn có chắc muốn xóa tất cả sản phẩm trong giỏ hàng?')) {
      this.items = [];
      this.persistCart();
      console.log('🛒 Cart cleared');
    }
  }

  // Payment method functionality
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
}
