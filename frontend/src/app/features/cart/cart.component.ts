import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HOME_CONFIG, HomeSectionId } from '../home/home.config';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FooterComponent } from '../../shared/footer/footer.component';
import { FormsModule } from '@angular/forms';

interface CartItem {
  id: number;
  name: string;
  slug: string;
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
  addresses: Address[] = [];
  selectedAddressIndex = -1;
  paymentMethods: PaymentMethod[] = [
    { id: 1, name: 'Thanh toán khi nhận hàng (COD)', description: 'Thanh toán bằng tiền mặt khi nhận hàng' },
    { id: 2, name: 'Chuyển khoản ngân hàng', description: 'Chuyển khoản qua ngân hàng' },
    { id: 3, name: 'Thẻ tín dụng/Ghi nợ', description: 'Thanh toán qua thẻ Visa/Mastercard' },
    { id: 4, name: 'Ví điện tử', description: 'Thanh toán qua MoMo, ZaloPay, VNPay' }
  ];
  selectedPaymentMethod = 0;
  showAddAddress = false;

  constructor(
    private router: Router,
    private destroyRef: DestroyRef
  ) {}

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
  }

  private loadAddresses(): void {
    try {
      const raw = localStorage.getItem('addresses');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        this.addresses = arr;
      } else {
        // Mock addresses for demo
        this.addresses = [
          {
            id: 1,
            name: 'Nguyễn Văn A',
            phone: '0912345678',
            address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
            type: 'Nhà riêng'
          },
          {
            id: 2,
            name: 'Nguyễn Văn A',
            phone: '0912345678',
            address: '456 Lê Lợi, Quận 3, TP.HCM',
            type: 'Công ty'
          }
        ];
        this.selectedAddressIndex = 0;
      }
    } catch {
      this.addresses = [];
    }
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

  get selectedAddress(): Address | null {
    return this.selectedAddressIndex >= 0 ? this.addresses[this.selectedAddressIndex] : null;
  }

  formatMoney(v: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(v));
  }

  inc(item: CartItem): void {
    item.quantity += 1;
    this.persistCart();
  }

  dec(item: CartItem): void {
    item.quantity = Math.max(1, item.quantity - 1);
    this.persistCart();
  }

  remove(item: CartItem): void {
    this.items = this.items.filter((x) => x !== item);
    this.persistCart();
  }

  continueShopping(): void {
    this.router.navigateByUrl('/sale');
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

  // Discount functionality
  applyDiscount(): void {
    if (!this.discountCode.trim()) {
      this.discountMessage = 'Vui lòng nhập mã giảm giá';
      return;
    }

    // Mock discount codes
    const validCodes: { [key: string]: DiscountCode } = {
      'SALE10': { code: 'SALE10', discount: 10, type: 'percentage', minAmount: 200000 },
      'SALE20': { code: 'SALE20', discount: 20, type: 'percentage', minAmount: 500000 },
      'FIXED50': { code: 'FIXED50', discount: 50000, type: 'fixed', minAmount: 300000 },
      'NEWUSER': { code: 'NEWUSER', discount: 15, type: 'percentage', minAmount: 100000 }
    };

    const code = this.discountCode.toUpperCase().trim();
    const discount = validCodes[code];

    if (!discount) {
      this.discountMessage = 'Mã giảm giá không hợp lệ';
      this.discountAmount = 0;
      return;
    }

    if (discount.minAmount && this.subtotal < discount.minAmount) {
      this.discountMessage = `Đơn hàng tối thiểu ${this.formatMoney(discount.minAmount)}đ để áp dụng mã này`;
      this.discountAmount = 0;
      return;
    }

    if (discount.type === 'percentage') {
      this.discountAmount = Math.round(this.subtotal * discount.discount / 100);
    } else {
      this.discountAmount = Math.min(discount.discount, this.subtotal);
    }

    this.discountMessage = `Đã áp dụng mã giảm giá: -${this.formatMoney(this.discountAmount)}đ`;
  }

  // Address functionality
  selectAddress(index: number): void {
    this.selectedAddressIndex = index;
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
