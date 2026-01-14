import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HOME_CONFIG, HomeSectionId } from '../home/home.config';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent],
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

  constructor(
    private router: Router,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.hydrateBadges();
    this.loadCart();

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
            color: x.color
          }));
      } else {
        this.items = [];
      }
    } catch {
      this.items = [];
    }

    this.cartCount = this.items.length;
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

    this.router.navigateByUrl('/').then(() => {
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
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
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
    this.router.navigateByUrl('/');
  }

  checkout(): void {
    this.router.navigateByUrl('/checkout');
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
