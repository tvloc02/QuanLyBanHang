import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface CategoryResponse {
  id: number;
  name: string;
  description?: string;
  active?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  promoText = 'GIẢM 20% KHI MUA TỪ 2 SẢN PHẨM  «  MUA NGAY  »';

  categories: Array<{ label: string; slug: string }> = [];

  searchQuery = '';
  showSuggest = false;
  suggest: Array<{ label: string; slug: string }> = [];
  activeSuggestIndex = -1;

  cartCount = 0;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.refreshCartCount();
    this.loadCategories();
  }

  private loadCategories(): void {
    const url = `${environment.apiBaseUrl}/api/categories`;
    this.http.get<ApiResponse<CategoryResponse[]>>(url).subscribe({
      next: (res) => {
        const rows = res?.data;
        if (!Array.isArray(rows)) {
          this.categories = [];
          return;
        }

        this.categories = rows
          .filter((c) => !!c?.name)
          .map((c) => {
            const slug = String(c.name).trim();
            return {
              slug,
              label: this.labelFromSlug(slug)
            };
          });
      },
      error: () => {
        this.categories = [];
      }
    });
  }

  private labelFromSlug(slug: string): string {
    const s = slug.replace(/[-_]+/g, ' ').trim();
    return s
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.activeSuggestIndex = -1;

    const q = value.trim().toLowerCase();
    if (!q) {
      this.suggest = [];
      return;
    }

    this.suggest = this.categories
      .filter((c) => c.label.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
      .slice(0, 8);
  }

  onSearchFocus(): void {
    this.showSuggest = true;
    if (this.searchQuery) this.onSearchInput(this.searchQuery);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (!this.showSuggest || this.suggest.length === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.submitSearch();
      }
      return;
    }

    const max = this.suggest.length - 1;
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
        this.selectSuggestion(this.suggest[this.activeSuggestIndex].slug);
      } else {
        this.submitSearch();
      }
      return;
    }
  }

  selectSuggestion(slug: string): void {
    this.showSuggest = false;
    this.activeSuggestIndex = -1;
    this.router.navigate(['/category', slug]);
  }

  submitSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) return;

    const exact = this.categories.find((c) => c.slug.toLowerCase() === q.toLowerCase());
    const slug = exact ? exact.slug : this.slugify(q);

    this.showSuggest = false;
    this.activeSuggestIndex = -1;
    this.router.navigate(['/category', slug]);
  }

  refreshCartCount(): void {
    try {
      const raw = localStorage.getItem('cart');
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      this.cartCount = Array.isArray(arr) ? arr.length : 0;
    } catch {
      this.cartCount = 0;
    }
  }

  @HostListener('window:storage')
  onStorage(): void {
    this.refreshCartCount();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showSuggest = false;
  }
}
