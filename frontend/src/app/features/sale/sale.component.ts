import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { FooterComponent } from '../../shared/footer/footer.component';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ProductSearchResponse {
  data: Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    oldPrice?: number;
    imageUrl?: string;
    badge?: string;
    discountPercent?: number;
    rating?: number;
    soldCount?: number;
    brand?: string;
    category?: string;
  }>;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface SaleProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  imageUrl?: string;
  badge?: string;
  discountPercent?: number;
  rating?: number;
  soldCount?: number;
  brand?: string;
}

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
  selector: 'app-sale',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent],
  templateUrl: './sale.component.html',
  styleUrls: ['./sale.component.scss']
})
export class SaleComponent implements OnInit {
  loading = true;
  error = '';
  products: SaleProduct[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.products = [];

    const url = `${environment.apiBaseUrl}/api/products/search?sort=newest&page=0&limit=80`;
    this.http.get<ApiResponse<ProductSearchResponse>>(url).subscribe({
      next: (res) => {
        const rows = res?.data?.data;
        const items = Array.isArray(rows) ? rows : [];

        this.products = items
          .map((x) => ({
            id: Number(x.id),
            name: String(x.name || 'Sản phẩm'),
            slug: String(x.slug || ''),
            price: Number(x.price || 0),
            oldPrice: x.oldPrice !== undefined ? Number(x.oldPrice) : undefined,
            imageUrl: x.imageUrl ? String(x.imageUrl) : undefined,
            badge: x.badge ? String(x.badge) : undefined,
            discountPercent: x.discountPercent !== undefined ? Number(x.discountPercent) : undefined,
            rating: x.rating !== undefined ? Number(x.rating) : undefined,
            soldCount: x.soldCount !== undefined ? Number(x.soldCount) : undefined,
            brand: x.brand ? String(x.brand) : undefined
          }))
          .filter((p) => !!p.slug)
          .filter((p) => this.isOnSale(p));

        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        if (err?.status === 0) {
          this.error = 'Không thể kết nối backend để tải danh sách Sale.';
          return;
        }
        this.error = err?.error?.message || err?.message || 'Không thể tải danh sách Sale.';
      }
    });
  }

  isOnSale(p: SaleProduct): boolean {
    if (p.discountPercent && p.discountPercent > 0) return true;
    if (p.oldPrice && p.oldPrice > p.price) return true;
    return false;
  }

  getDiscountLabel(p: SaleProduct): string {
    if (p.discountPercent && p.discountPercent > 0) return `-${p.discountPercent}%`;
    if (p.oldPrice && p.oldPrice > p.price && p.oldPrice > 0) {
      const pct = Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
      return pct > 0 ? `-${pct}%` : '';
    }
    return '';
  }

  formatMoney(v: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(v));
  }

  addToCart(p: SaleProduct): void {
    const item: CartItem = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      imageUrl: p.imageUrl,
      price: Number(p.price || 0),
      quantity: 1
    };

    const cart = this.readCart();
    const idx = cart.findIndex((x) => x.id === item.id && (x.size || '') === '' && (x.color || '') === '');

    if (idx >= 0) {
      cart[idx] = { ...cart[idx], quantity: Math.min(99, (cart[idx].quantity || 1) + 1) };
    } else {
      cart.push(item);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
  }

  buyNow(p: SaleProduct): void {
    this.addToCart(p);
    this.router.navigateByUrl('/checkout');
  }

  goToProduct(p: SaleProduct): void {
    this.router.navigate(['/product', p.slug]);
  }

  private readCart(): CartItem[] {
    try {
      const raw = localStorage.getItem('cart');
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      if (!Array.isArray(arr)) return [];
      return arr
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
    } catch {
      return [];
    }
  }
}
