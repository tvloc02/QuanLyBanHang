import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-modal">
        <div class="auth-head">
          <a routerLink="/" class="back">← Về trang chủ</a>
          <div class="brand">FashionHub</div>
        </div>

        <div class="auth-col">
          <div class="title">Đăng nhập</div>
          <div class="sub">Đăng nhập để tích voucher và đặt hàng nhanh hơn.</div>

          <div class="field">
            <div class="label">SĐT / Email / Tên đăng nhập</div>
            <div class="input-wrap">
              <span class="icon" aria-hidden="true">👤</span>
              <input
                class="input"
                type="text"
                [(ngModel)]="usernameOrEmail"
                placeholder="Nhập SĐT, email hoặc tên đăng nhập"
              />
            </div>
          </div>

          <div class="field">
            <div class="label">Mật khẩu</div>
            <div class="input-wrap">
              <span class="icon" aria-hidden="true">🔒</span>
              <input
                class="input"
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="password"
                placeholder="Nhập mật khẩu"
              />
              <button type="button" class="icon-btn" (click)="showPassword = !showPassword" aria-label="Toggle password">
                {{ showPassword ? 'Ẩn' : 'Hiện' }}
              </button>
            </div>
          </div>

          <div class="row">
            <label class="remember">
              <input type="checkbox" />
              <span>Ghi nhớ</span>
            </label>
            <a routerLink="/register" class="link">Quên mật khẩu?</a>
          </div>

          <div class="alert" *ngIf="error">{{ error }}</div>

          <button type="button" class="btn" (click)="save()" [disabled]="loading">
            {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
          </button>

          <div class="divider"><span>Hoặc</span></div>

          <div id="googleBtn"></div>

          <a class="ghost" routerLink="/register">Tạo tài khoản mới</a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-shell {
        position: relative;
        min-height: calc(100vh - 144px);
        display: grid;
        place-items: center;
        padding: 18px 16px;
        background: var(--fh-bg);
        overflow: hidden;
      }

      .auth-shell::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: url('https://via.placeholder.com/1600x900?text=FashionHub+Background');
        background-size: cover;
        background-position: center;
        transform: scale(1.03);
        filter: saturate(1.05) contrast(1.02);
        opacity: 0.22;
      }

      .auth-shell::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.92) 55%, rgba(255, 255, 255, 0.98));
      }

      .auth-modal {
        position: relative;
        z-index: 1;
        width: min(420px, 100%);
        background: rgba(255, 255, 255, 0.86);
        backdrop-filter: blur(10px);
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 18px 45px rgba(0, 0, 0, 0.14);
        border: 1px solid rgba(0, 0, 0, 0.06);
      }
      .auth-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        background: rgba(255, 255, 255, 0.6);
      }

      .brand {
        font-weight: 1000;
        letter-spacing: 0.8px;
        color: var(--fh-primary);
        font-size: 13px;
        text-transform: uppercase;
      }

      .auth-col {
        padding: 18px 18px 18px;
      }

      .back {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        color: var(--fh-primary);
        text-decoration: none;
        font-weight: 900;
        font-size: 12px;
      }

      .title {
        font-weight: 1000;
        font-size: 19px;
        margin: 0 0 6px;
        letter-spacing: 0.2px;
        color: #111;
      }
      .sub {
        color: #6b7280;
        font-size: 12px;
        line-height: 1.55;
        margin-bottom: 14px;
      }

      .field {
        margin-bottom: 12px;
      }
      .label {
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: 0.6px;
        margin-bottom: 7px;
        color: rgba(17, 24, 39, 0.9);
        text-transform: uppercase;
      }

      .input-wrap {
        position: relative;
        display: grid;
        grid-template-columns: 40px 1fr auto;
        align-items: center;
        border: 1px solid rgba(17, 24, 39, 0.14);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.75);
        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02);
        transition: border-color 160ms ease, box-shadow 160ms ease;
      }

      .input-wrap:focus-within {
        border-color: rgba(193, 18, 31, 0.55);
        box-shadow: 0 0 0 4px rgba(193, 18, 31, 0.12);
      }

      .icon {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        opacity: 0.8;
        font-size: 14px;
        border-right: 1px solid rgba(0, 0, 0, 0.06);
      }

      .input {
        width: 100%;
        height: 40px;
        border: 0;
        background: transparent;
        padding: 0 12px;
        outline: none;
        font-weight: 700;
        color: #111;
      }

      .icon-btn {
        height: 34px;
        margin-right: 6px;
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(255, 255, 255, 0.85);
        cursor: pointer;
        padding: 0 10px;
        font-weight: 900;
        font-size: 11px;
        color: rgba(17, 24, 39, 0.85);
      }

      .icon-btn:hover {
        filter: brightness(0.98);
      }

      .hint {
        margin-top: 7px;
        font-size: 11px;
        color: rgba(107, 114, 128, 1);
        line-height: 1.4;
      }

      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 10px 0 14px;
      }
      .remember {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: rgba(17, 24, 39, 0.9);
        font-weight: 700;
      }
      .remember input {
        width: 15px;
        height: 15px;
      }
      .link {
        color: var(--fh-primary);
        text-decoration: none;
        font-weight: 1000;
        font-size: 12px;
      }

      .btn {
        width: 100%;
        height: 42px;
        border: 0;
        border-radius: 12px;
        background: linear-gradient(180deg, rgba(193, 18, 31, 1), rgba(160, 11, 20, 1));
        color: var(--fh-primary-contrast);
        font-weight: 1000;
        cursor: pointer;
        letter-spacing: 0.3px;
        box-shadow: 0 10px 20px rgba(193, 18, 31, 0.22);
      }
      .btn:hover {
        filter: brightness(0.98);
      }

      .alert {
        margin: 8px 0 10px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(193, 18, 31, 0.18);
        background: rgba(193, 18, 31, 0.08);
        color: rgba(193, 18, 31, 1);
        font-weight: 900;
        font-size: 12px;
      }

      .divider {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 12px;
        align-items: center;
        margin: 14px 0;
        color: rgba(107, 114, 128, 1);
        font-size: 11px;
        font-weight: 900;
      }
      .divider::before,
      .divider::after {
        content: '';
        height: 1px;
        background: rgba(0, 0, 0, 0.08);
      }

      .ghost {
        width: 100%;
        height: 42px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(193, 18, 31, 0.28);
        background: rgba(255, 255, 255, 0.7);
        color: rgba(193, 18, 31, 1);
        font-weight: 1000;
        text-decoration: none;
      }

      .ghost:hover {
        background: rgba(193, 18, 31, 0.06);
      }

      @media (max-width: 420px) {
        .auth-col {
          padding: 18px 16px 18px;
        }
      }

      @media (max-width: 640px) {
        .auth-shell {
          min-height: calc(100vh - 120px);
        }
      }
    `
  ]
})
export class LoginComponent implements AfterViewInit {
  usernameOrEmail = '';
  password = '';
  showPassword = false;
  loading = false;
  error = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngAfterViewInit(): void {
    this.initGoogle();
  }

  private initGoogle(): void {
    const clientId = (environment as any).googleClientId as string | undefined;
    if (!clientId) return;
    if (typeof google === 'undefined' || !google?.accounts?.id) return;

    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp: any) => this.onGoogleCredential(resp)
      });
      google.accounts.id.renderButton(document.getElementById('googleBtn'), {
        theme: 'outline',
        size: 'large',
        width: 360
      });
    } catch {
      // ignore
    }
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
          // ignore
        }
      });
  }

  save(): void {
    this.error = '';
    const usernameOrEmail = (this.usernameOrEmail || '').trim();
    const password = (this.password || '').trim();

    if (!usernameOrEmail || !password) {
      this.error = 'Vui lòng nhập tài khoản và mật khẩu.';
      return;
    }

    this.loading = true;
    this.auth.login(usernameOrEmail, password).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Đăng nhập thất bại.';
          return;
        }
        const data = res?.data;
        this.auth.setSession(data);
        const roles = Array.isArray(data?.roles) ? data.roles : [];
        this.router.navigateByUrl(roles.includes('ADMIN') ? '/admin' : '/');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Đăng nhập thất bại. Hãy kiểm tra backend.';
      }
    });
  }
}
