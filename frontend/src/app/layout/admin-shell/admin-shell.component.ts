import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.component.html',
  styleUrls: ['./admin-shell.component.scss']
})
export class AdminShellComponent {
  userMenuOpen = false;

  @ViewChild('userWrap')
  userWrap?: ElementRef<HTMLElement>;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.userMenuOpen) return;

    const target = event.target as Node | null;
    const host = this.userWrap?.nativeElement;
    if (target && host && host.contains(target)) return;

    this.userMenuOpen = false;
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
}
