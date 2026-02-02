import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserDataService, UserMeResponse } from '../../core/services/user-data.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss']
})
export class AdminShellComponent implements OnInit, OnDestroy {
  userMenuOpen = false;
  notificationPanelOpen = false;

  sidebarCollapsed = false;
  openGroup: string | null = null;
  activeGroup: string | null = null;

  roles: string[] = [];

  me: UserMeResponse | null = null;

  notifications: any[] = [];

  private routerSub?: Subscription;
  private meSub?: Subscription;

  @ViewChild('userWrap')
  userWrap?: ElementRef<HTMLElement>;

  constructor(
    private auth: AuthService,
    private userData: UserDataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sidebarCollapsed = localStorage.getItem('adminSidebarCollapsed') === '1';
    this.roles = this.auth.getRoles();

    this.meSub = this.userData.getMe().subscribe({
      next: (res) => {
        this.me = res?.data || null;
      },
      error: () => {
        this.me = null;
      }
    });

    this.syncOpenGroupFromUrl(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.syncOpenGroupFromUrl(e.urlAfterRedirects);
        this.closeUserMenu();
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.meSub?.unsubscribe();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('adminSidebarCollapsed', this.sidebarCollapsed ? '1' : '0');

    if (this.sidebarCollapsed) {
      this.openGroup = null;
    }
  }

  onGroupHeaderClick(group: string): void {
    if (this.sidebarCollapsed) {
      this.sidebarCollapsed = false;
      localStorage.setItem('adminSidebarCollapsed', '0');
      this.openGroup = group;
      return;
    }

    this.openGroup = this.openGroup === group ? null : group;
  }

  isGroupOpen(group: string): boolean {
    return this.openGroup === group;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  toggleNotificationPanel(): void {
    this.notificationPanelOpen = !this.notificationPanelOpen;
  }

  closeNotificationPanel(): void {
    this.notificationPanelOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    const userHost = this.userWrap?.nativeElement;
    
    if (this.userMenuOpen && target && userHost && !userHost.contains(target)) {
      this.userMenuOpen = false;
    }

    if (this.notificationPanelOpen) {
      const notifBtn = (event.target as HTMLElement).closest('.notification-btn');
      const notifPanel = (event.target as HTMLElement).closest('.notification-panel');
      if (!notifBtn && !notifPanel) {
        this.notificationPanelOpen = false;
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.userMenuOpen = false;
  }

  logout(): void {
    this.userMenuOpen = false;
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((r) => this.roles.includes(r));
  }

  get roleLabel(): string {
    if (this.hasRole('ADMIN')) return 'Quản trị viên hệ thống';
    if (this.hasRole('MANAGER')) return 'Quản lý';
    if (this.hasRole('STAFF')) return 'Nhân viên';
    return 'Tài khoản';
  }

  get displayName(): string {
    const fullName = String(this.me?.fullName || '').trim();
    if (fullName) return fullName;
    const username = String(this.me?.username || '').trim();
    if (username) return username;
    return 'User';
  }

  get avatarInitial(): string {
    const s = this.displayName;
    return (s ? s[0] : 'U').toUpperCase();
  }

  private syncOpenGroupFromUrl(url: string): void {
    this.activeGroup = this.getGroupFromUrl(url);

    if (this.sidebarCollapsed) {
      this.openGroup = null;
      return;
    }
  }

  private getGroupFromUrl(url: string): string | null {
    const u = url || '';

    if (u.startsWith('/admin/orders')) return 'orders';

    if (
      u.startsWith('/admin/products') ||
      u.startsWith('/admin/categories') ||
      u.startsWith('/admin/coupons')
    ) {
      return 'sales';
    }

    if (u.startsWith('/admin/settings/home-sections') || u.startsWith('/admin/sale-page')) return 'storefront';

    if (
      u.startsWith('/admin/users') ||
      u.startsWith('/admin/settings') ||
      u.startsWith('/admin/branches')
    ) {
      return 'system';
    }

    if (
      u.startsWith('/admin/customers') ||
      u.startsWith('/admin/support-chat') ||
      u.startsWith('/admin/reviews')
    ) {
      return 'customers';
    }

    if (u === '/admin' || u.startsWith('/admin?')) return 'overview';

    return null;
  }
}
