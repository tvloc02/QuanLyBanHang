import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserDataService, UserMeResponse } from '../../core/services/user-data.service';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  icon?: string | null;
  description?: string;
  active?: boolean;
  children?: CategoryResponse[];
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  promoText = 'GIẢM 20% KHI MUA TỪ 2 SẢN PHẨM  «  MUA NGAY  »';

  categories: Array<{ label: string; slug: string }> = [];

  categoryTree: CategoryResponse[] = [];

  searchQuery = '';
  showSuggest = false;
  suggest: Array<{ label: string; slug: string }> = [];
  activeSuggestIndex = -1;

  cartCount = 0;

  openMegaRootId: number | null = null;
  userMenuOpen = false;

  me: UserMeResponse | null = null;
  rewardPoints = 0;
  private meLoading = false;

  private closeMegaTimer: any | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly auth: AuthService,
    private readonly userData: UserDataService
  ) {}

  ngOnInit(): void {
    this.refreshCartCount();
    this.loadCategories();
    this.loadMeIfNeeded();
  }

  get userDisplayName(): string {
    const fullName = String(this.me?.fullName || '').trim();
    if (fullName) return fullName;
    const username = String(this.me?.username || '').trim();
    if (username) return username;
    return 'Tài khoản';
  }

  get userInitial(): string {
    const name = this.userDisplayName;
    return (name ? name[0] : 'U').toUpperCase();
  }

  private loadMeIfNeeded(): void {
    if (!this.isAuthenticated()) {
      this.me = null;
      return;
    }
    if (this.meLoading) return;

    this.meLoading = true;
    this.userData.getMe().subscribe({
      next: (res) => {
        this.meLoading = false;
        this.me = res?.data || null;
      },
      error: () => {
        this.meLoading = false;
        this.me = null;
      }
    });
  }

  resolveCategoryIcon(key?: string | null): string {
    const k = (key || '').trim();
    return k ? k : 'tag';
  }

  private loadCategories(): void {
    const url = `${environment.apiBaseUrl}/api/categories/tree`;
    this.http.get<ApiResponse<CategoryResponse[]>>(url).subscribe({
      next: (res) => {
        const rows = res?.data;
        if (!Array.isArray(rows)) {
          this.categoryTree = [];
          this.categories = [];
          return;
        }

        const tree = this.sortTree(rows);
        this.categoryTree = tree;
        this.categories = this.flattenTree(tree);
      },
      error: () => {
        this.categoryTree = [];
        this.categories = [];
      }
    });
  }

  private flattenTree(tree: CategoryResponse[]): Array<{ label: string; slug: string }> {
    const out: Array<{ label: string; slug: string }> = [];
    const walk = (nodes: CategoryResponse[]) => {
      for (const n of nodes) {
        if (n?.slug && n?.name) {
          out.push({ slug: n.slug, label: n.name });
        }
        const kids = Array.isArray(n?.children) ? n.children : [];
        if (kids.length) walk(kids);
      }
    };
    walk(tree);
    return out;
  }

  private sortTree(tree: CategoryResponse[]): CategoryResponse[] {
    const copy = Array.isArray(tree) ? [...tree] : [];
    copy.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
    for (const n of copy) {
      if (Array.isArray(n?.children) && n.children.length) {
        n.children = this.sortTree(n.children);
      } else {
        n.children = [];
      }
    }
    return copy;
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

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  isInternal(): boolean {
    return this.auth.isInternal();
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
    this.openMegaRootId = null;
    if (this.userMenuOpen) {
      this.loadMeIfNeeded();
    }
  }

  logout(): void {
    this.userMenuOpen = false;
    this.me = null;
    this.auth.logout();
    this.router.navigateByUrl('/sale');
  }

  onRootCategoryClick(root: CategoryResponse, event: MouseEvent): void {
    const hasChildren = Array.isArray(root?.children) && root.children.length > 0;
    if (!hasChildren) return;

    // Desktop hover devices: mega panel opens on hover, click should navigate normally.
    if (this.isHoverCapable()) {
      this.openMegaRootId = null;
      return;
    }

    if (this.openMegaRootId !== root.id) {
      event.preventDefault();
      event.stopPropagation();
      this.openMegaRootId = root.id;
      this.userMenuOpen = false;
      this.showSuggest = false;
      return;
    }

    // second click: allow navigation, close mega menu
    this.openMegaRootId = null;
  }

  onRootHover(root: CategoryResponse): void {
    if (!this.isHoverCapable()) return;
    const hasChildren = Array.isArray(root?.children) && root.children.length > 0;
    if (!hasChildren) {
      this.openMegaRootId = null;
      return;
    }
    this.cancelCloseMega();
    this.openMegaRootId = root.id;
    this.userMenuOpen = false;
    this.showSuggest = false;
  }

  onNavAreaEnter(): void {
    this.cancelCloseMega();
  }

  onNavAreaLeave(): void {
    if (!this.isHoverCapable()) return;
    this.scheduleCloseMega();
  }

  private scheduleCloseMega(): void {
    this.cancelCloseMega();
    this.closeMegaTimer = setTimeout(() => {
      this.openMegaRootId = null;
      this.closeMegaTimer = null;
    }, 160);
  }

  private cancelCloseMega(): void {
    if (this.closeMegaTimer != null) {
      clearTimeout(this.closeMegaTimer);
      this.closeMegaTimer = null;
    }
  }

  private isHoverCapable(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    try {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    } catch {
      return false;
    }
  }

  getOpenRoot(): CategoryResponse | null {
    const id = this.openMegaRootId;
    if (id == null) return null;
    return this.categoryTree.find((x) => x?.id === id) || null;
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
    this.userMenuOpen = false;
    this.openMegaRootId = null;
    this.cancelCloseMega();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showSuggest = false;
    this.userMenuOpen = false;
    this.openMegaRootId = null;
    this.cancelCloseMega();
  }
}
