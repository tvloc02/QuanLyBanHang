import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { HOME_CONFIG, HomeSectionId } from './home.config';
import { environment } from '../../../environments/environment';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements AfterViewInit {
  readonly cfg = HOME_CONFIG;

  private readonly claimedVoucherCodes = new Set<string>();

  activeSection: HomeSectionId = 'hero';

  accountOpen = false;
  cartCount = 0;
  wishlistCount = 0;

  showScrollTop = false;

  searchQuery = '';
  showSearchSuggest = false;
  searchSuggest: Array<{ label: string; route: string }> = [];
  activeSuggestIndex = -1;

  @ViewChild('categoryScroll') categoryScroll!: ElementRef;

  quickTilesPageCount = 1;
  quickTilesActivePage = 0;
  quickTilesPages: number[] = [0];

  constructor(private router: Router, private http: HttpClient) {
    this.applyTheme();
    this.loadClaimedVouchers();
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

  ngAfterViewInit(): void {
    this.updateQuickTilesPaging();
  }

  private applyTheme(): void {
    const root = document.documentElement;
    root.style.setProperty('--fh-primary', this.cfg.theme.primary);
    root.style.setProperty('--fh-accent', this.cfg.theme.accent);
    root.style.setProperty('--fh-bg', this.cfg.theme.bg);
    root.style.setProperty('--fh-text', this.cfg.theme.text);
    root.style.setProperty('--fh-muted', this.cfg.theme.muted);
    root.style.setProperty('--fh-border', this.cfg.theme.border);
  }

  scrollTo(sectionId: HomeSectionId): void {
    const el = document.getElementById(sectionId);
    if (!el) return;

    const header = document.querySelector('.header') as HTMLElement | null;
    const headerOffset = (header?.offsetHeight ?? 0) + 10;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  onNavClick(item: { sectionId?: HomeSectionId; route?: string }): void {
    if (item.route) {
      this.router.navigateByUrl(item.route);
      return;
    }
    if (item.sectionId) {
      this.scrollTo(item.sectionId);
    }
  }

  toggleAccount(): void {
    this.accountOpen = !this.accountOpen;
  }

  closeAccount(): void {
    this.accountOpen = false;
  }

  go(url: string): void {
    this.accountOpen = false;
    this.router.navigateByUrl(url);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.accountOpen = false;
    this.showSearchSuggest = false;
  }

  copy(text: string): void {
    navigator.clipboard?.writeText(text);
  }

  private getUserId(): number | null {
    const raw = localStorage.getItem('fh_userId');
    const userId = raw ? Number(raw) : NaN;
    if (!Number.isFinite(userId) || userId <= 0) return null;
    return userId;
  }

  private claimedStorageKey(userId: number): string {
    return `fh_claimedVouchers_${userId}`;
  }

  private loadClaimedVouchers(): void {
    const userId = this.getUserId();
    if (!userId) return;
    const raw = localStorage.getItem(this.claimedStorageKey(userId));
    if (!raw) return;
    try {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr)) {
        arr.filter((x) => typeof x === 'string').forEach((code) => this.claimedVoucherCodes.add(code));
      }
    } catch {
      // ignore
    }
  }

  private persistClaimedVouchers(): void {
    const userId = this.getUserId();
    if (!userId) return;
    const arr = Array.from(this.claimedVoucherCodes);
    localStorage.setItem(this.claimedStorageKey(userId), JSON.stringify(arr));
  }

  isVoucherClaimed(code: string): boolean {
    return this.claimedVoucherCodes.has(code);
  }

  claimVoucher(code: string): void {
    const userId = this.getUserId();
    if (!userId) {
      this.go('/login');
      return;
    }

    if (this.isVoucherClaimed(code)) return;

    const url = `${environment.apiBaseUrl}/api/coupons/${encodeURIComponent(code)}/claim?userId=${encodeURIComponent(String(userId))}`;
    this.http.post(url, {}).subscribe({
      next: () => {
        this.claimedVoucherCodes.add(code);
        this.persistClaimedVouchers();
        this.copy(code);
      },
      error: () => {
        // errors are handled globally in the backend; keep UI simple for now
      }
    });
  }

  scrollGroups(dir: 'left' | 'right'): void {
    const el = this.categoryScroll?.nativeElement;
    if (!el) return;

    const step = this.getQuickTilesStep(el);
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  }

  onQuickTilesScroll(): void {
    this.updateQuickTilesPaging();
  }

  scrollQuickTilesToPage(pageIndex: number): void {
    const el = this.categoryScroll?.nativeElement;
    if (!el) return;
    const maxPage = Math.max(0, this.quickTilesPageCount - 1);
    const target = Math.min(Math.max(pageIndex, 0), maxPage);
    const step = this.getQuickTilesStep(el);
    el.scrollTo({ left: target * step, behavior: 'smooth' });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateQuickTilesPaging();
  }

  private updateQuickTilesPaging(): void {
    const el = this.categoryScroll?.nativeElement;
    if (!el) return;

    const tiles = el.querySelectorAll('.quick-tile');
    const totalCols = tiles.length;
    if (totalCols <= 0) {
      this.quickTilesPageCount = 1;
      this.quickTilesPages = [0];
      this.quickTilesActivePage = 0;
      return;
    }

    const step = this.getQuickTilesStep(el);
    const gap = Number.parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const visibleCols = Math.max(1, Math.floor((el.clientWidth + gap) / step));
    const maxShift = Math.max(0, totalCols - visibleCols);

    const pageCount = maxShift + 1;
    this.quickTilesPageCount = pageCount;
    this.quickTilesPages = Array.from({ length: pageCount }, (_, i) => i);

    const active = Math.round(el.scrollLeft / step);
    this.quickTilesActivePage = Math.min(Math.max(active, 0), pageCount - 1);
  }

  private getQuickTilesStep(el: HTMLElement): number {
    const gap = Number.parseFloat(getComputedStyle(el).columnGap || '0') || 0;
    const firstTile = el.querySelector('.quick-tile') as HTMLElement | null;
    const tileWidth = firstTile?.offsetWidth ?? 0;
    return Math.max(60, tileWidth + gap);
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.showScrollTop = window.scrollY > 500;
    const ids: HomeSectionId[] = ['hero', 'vouchers', 'quick-categories', 'featured', 'hot', 'exclusive', 'news', 'footer'];
    const best = ids
      .map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, top: Number.POSITIVE_INFINITY };
        const rect = el.getBoundingClientRect();
        return { id, top: Math.abs(rect.top - 120) };
      })
      .sort((a, b) => a.top - b.top)[0];

    if (best && best.id !== this.activeSection) {
      this.activeSection = best.id;
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
