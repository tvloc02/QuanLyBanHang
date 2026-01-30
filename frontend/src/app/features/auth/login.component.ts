import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../shared/toast/toast.service';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-container">
      <div class="background-overlay"></div>
      
      <div class="auth-card">
        <div class="auth-header">
          <div class="brand-section">
            <h1 class="brand-name">FASHION<span>HUB</span></h1>
            <p class="brand-tagline">Nâng tầm phong cách của bạn</p>
          </div>
          <a routerLink="/" class="back-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Trang chủ
          </a>
        </div>

        <div class="auth-body">
          <h2 class="form-title">Chào mừng trở lại</h2>
          <p class="form-subtitle">Đăng nhập để trải nghiệm dịch vụ tốt nhất</p>

          <div class="form-group">
            <label>Tài khoản</label>
            <div class="input-container">
              <span class="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input 
                type="text" 
                [(ngModel)]="usernameOrEmail" 
                placeholder="Email hoặc tên đăng nhập"
                (keyup.enter)="save()"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Mật khẩu</label>
            <div class="input-container">
              <span class="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input 
                [type]="showPassword() ? 'text' : 'password'" 
                [(ngModel)]="password" 
                placeholder="Nhập mật khẩu"
                (keyup.enter)="save()"
              />
              <button type="button" class="toggle-password" (click)="togglePass()">
                {{ showPassword() ? 'Ẩn' : 'Hiện' }}
              </button>
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-container">
              <input type="checkbox">
              <span class="checkmark"></span>
              Ghi nhớ đăng nhập
            </label>
            <a href="javascript:void(0)" class="forgot-password">Quên mật khẩu?</a>
          </div>

          <button class="login-button" (click)="save()" [disabled]="loading()">
            <span *ngIf="!loading()">Đăng Nhập</span>
            <span *ngIf="loading()" class="loader"></span>
          </button>

          <div class="divider">
            <span>Hoặc đăng nhập với</span>
          </div>

          <div class="social-grid">
            <button class="facebook-btn" (click)="loginWithFacebook()">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>

            <ng-container *ngIf="googleClientId && !googleRenderFailed(); else googleDisabled">
              <div id="googleBtn" class="google-btn-wrapper"></div>
            </ng-container>

            <ng-template #googleDisabled>
              <button class="google-fallback-btn" type="button" (click)="googleNotConfigured()">
                Đăng nhập bằng Google
              </button>
            </ng-template>
          </div>

          <div class="auth-footer">
            Chưa có tài khoản? <a routerLink="/register">Đăng ký ngay</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary: #c1121f;
      --primary-hover: #a4101a;
      --facebook: #1877f2;
      --text-main: #1f2937;
      --text-muted: #6b7280;
      --border: #e5e7eb;
      --bg-card: #ffffff;
      display: block;
    }

    .auth-container {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #f3f4f6;
    }

    .background-overlay {
      position: absolute;
      inset: 0;
      background-image: url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1600&auto=format&fit=crop');
      background-size: cover;
      background-position: center;
      filter: brightness(0.4);
      z-index: 0;
    }

    .auth-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 580px;
      background: var(--bg-card);
      border-radius: 48px;
      box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeInScale {
      from { opacity: 0; transform: scale(0.98) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .auth-header {
      padding: 32px 48px 0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .brand-name {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin: 0;
      color: var(--text-main);
    }

    .brand-name span {
      color: var(--primary);
    }

    .brand-tagline {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .back-home {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      text-decoration: none;
    }

    .back-home svg {
      width: 16px;
      height: 16px;
    }

    .auth-body {
      padding: 16px 48px 48px;
    }

    .form-title {
      font-size: 26px;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 2px;
    }

    .form-subtitle {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 12px;
    }

    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 5px;
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 16px;
      color: var(--text-muted);
      display: flex;
    }

    .input-icon svg {
      width: 18px;
      height: 18px;
    }

    .input-container input {
      width: 100%;
      height: 50px;
      padding: 0 48px;
      background: #f9fafb;
      border: 1.5px solid var(--border);
      border-radius: 18px;
      font-size: 15px;
      color: var(--text-main);
      transition: all 0.2s;
    }

    .input-container input:focus {
      outline: none;
      border-color: var(--primary);
      background: #fff;
      box-shadow: 0 0 0 4px rgba(193, 18, 31, 0.1);
    }

    .toggle-password {
      position: absolute;
      right: 14px;
      background: none;
      border: none;
      font-size: 12px;
      font-weight: 700;
      color: var(--primary);
      cursor: pointer;
      padding: 6px;
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-muted);
      cursor: pointer;
    }

    .forgot-password {
      font-size: 13px;
      font-weight: 600;
      color: var(--primary);
      text-decoration: none;
    }

    .login-button {
      width: 100%;
      height: 54px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 18px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 20px -5px rgba(193, 18, 31, 0.4);
      margin-bottom: 14px;
    }

    .login-button:hover:not(:disabled) {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }

    .loader {
      width: 22px;
      height: 22px;
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .divider {
      margin: 14px 0;
      display: flex;
      align-items: center;
      text-align: center;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1.5px solid var(--border);
    }

    .divider span {
      padding: 0 12px;
    }

    .social-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }

    .google-btn-wrapper {
      width: 100%;
      display: flex;
      justify-content: flex-end;
    }

    .facebook-btn {
      width: 100%;
      height: 48px;
      background: var(--facebook);
      color: white;
      border: none;
      border-radius: 16px;
      font-size: 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .facebook-btn svg {
      width: 20px;
      height: 20px;
    }

    .auth-footer {
      text-align: center;
      font-size: 14px;
      color: var(--text-muted);
    }

    .auth-footer a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 700;
    }

    .google-fallback-btn {
      width: 100%;
      height: 48px;
      background: #fff;
      color: #111;
      border: 1.5px solid var(--border);
      border-radius: 16px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }

    @media (max-width: 640px) {
      .auth-card {
        border-radius: 0;
        max-width: none;
        height: 100vh;
      }
      .auth-container {
        padding: 0;
      }
      .background-overlay {
        display: none;
      }
      .social-grid {
        grid-template-columns: 1fr;
      }
      .google-btn-wrapper {
        justify-content: center;
      }
      .auth-header, .auth-body {
        padding-left: 24px;
        padding-right: 24px;
      }
    }
  `]
})
export class LoginComponent implements AfterViewInit {
  usernameOrEmail = '';
  password = '';
  showPassword = signal(false);
  loading = signal(false);

  googleClientId = (environment as any).googleClientId as string;

  googleRenderFailed = signal(false);

  private googleInitRetries = 0;

  private router = inject(Router);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initGoogle();
    }, 0);
  }

  togglePass(): void {
    this.showPassword.update(v => !v);
  }

  private initGoogle(): void {
    const clientId = this.googleClientId;
    if (!clientId) return;

    if (this.googleRenderFailed()) return;

    const g = (window as any).google;
    if (!g?.accounts?.id) {
      if (this.googleInitRetries < 20) {
        this.googleInitRetries++;
        setTimeout(() => this.initGoogle(), 200);
      }
      if (this.googleInitRetries >= 20) {
        this.googleRenderFailed.set(true);
      }
      return;
    }

    try {
      const googleBtnEl = document.getElementById('googleBtn');
      if (!googleBtnEl) {
        this.googleRenderFailed.set(true);
        return;
      }

      const width = this.getGoogleBtnWidth(googleBtnEl);
      g.accounts.id.initialize({
        client_id: clientId,
        callback: (resp: any) => this.onGoogleCredential(resp)
      });
      g.accounts.id.renderButton(googleBtnEl, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width
      });
    } catch {
      this.googleRenderFailed.set(true);
    }
  }

  private getGoogleBtnWidth(el: HTMLElement | null): number {
    const w = el?.getBoundingClientRect?.().width;
    if (typeof w === 'number' && isFinite(w) && w > 0) return Math.floor(w);
    return 240;
  }

  private onGoogleCredential(resp: any): void {
    const credential = resp?.credential as string | undefined;
    if (!credential) return;

    this.http
      .post<any>(`${environment.apiBaseUrl}/api/auth/google`, { credential })
      .subscribe({
        next: (res) => {
          const data = res?.data;
          this.auth.setSession(data);
          const roles = Array.isArray(data?.roles) ? data.roles : [];
          this.router.navigateByUrl(roles.includes('ADMIN') ? '/admin' : '/');
        },
        error: () => {
          this.toast.error('Hệ thống đăng nhập qua Google đang bảo trì.');
        }
      });
  }

  loginWithFacebook(): void {
    this.toast.info('Tính năng Facebook hiện đang được cập nhật.');
  }

  googleNotConfigured(): void {
    this.toast.error('Chưa cấu hình Google Client ID nên chưa thể đăng nhập bằng Google.');
  }

  save(): void {
    const u = (this.usernameOrEmail || '').trim();
    const p = (this.password || '').trim();

    if (!u || !p) {
      this.toast.error('Vui lòng điền đầy đủ thông tin đăng nhập.');
      return;
    }

    this.loading.set(true);
    this.auth.login(u, p).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (!res?.success) {
          this.toast.error(res?.message || 'Tài khoản hoặc mật khẩu không chính xác.');
          return;
        }
        const data = res?.data;
        this.auth.setSession(data);
        const roles = Array.isArray(data?.roles) ? data.roles : [];
        this.router.navigateByUrl(roles.includes('ADMIN') ? '/admin' : '/');
      },
      error: (err: any) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại kết nối.');
      }
    });
  }
}