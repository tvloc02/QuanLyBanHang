import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../shared/toast/toast.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AuthService],
  template: `
    <div class="auth-container">
      <div class="background-overlay"></div>
      
      <div class="auth-card">
        <div class="auth-header">
          <div class="brand-section">
            <h1 class="brand-name" aria-label="L.event"><span class="brand-l">L</span><span class="brand-rest">.event</span></h1>
            <p class="brand-tagline">Khởi đầu phong cách mới</p>
          </div>
          <a routerLink="/sale" class="back-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </a>
        </div>

        <div class="auth-body">
          <div class="welcome">
            <h2 class="form-title">Tạo Tài Khoản</h2>
            <p class="form-subtitle">Tham gia cùng chúng tôi để nhận ưu đãi đặc quyền</p>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Họ</label>
              <div class="input-container">
                <input type="text" [(ngModel)]="lastName" placeholder="Họ" />
              </div>
            </div>
            <div class="form-group">
              <label>Tên</label>
              <div class="input-container">
                <input type="text" [(ngModel)]="firstName" placeholder="Tên" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Số điện thoại</label>
            <div class="input-container">
              <span class="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </span>
              <input type="tel" [(ngModel)]="phone" placeholder="Nhập số điện thoại" />
            </div>
          </div>

          <div class="form-group">
            <label>Email</label>
            <div class="input-container">
              <span class="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </span>
              <input type="email" [(ngModel)]="email" placeholder="Địa chỉ email" />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Mật khẩu</label>
              <div class="input-container">
                <input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="password" placeholder="Mật khẩu" />
                <button
                  type="button"
                  class="toggle-password"
                  (click)="togglePass()"
                  [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                >
                  <svg *ngIf="!showPassword()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <path d="M2 12s3.5-7 10-7s10 7 10 7s-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <svg *ngIf="showPassword()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a3 3 0 0 0 4.24 4.24" />
                    <path d="M9.9 4.6A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a18.7 18.7 0 0 1-4.2 5.4" />
                    <path d="M6.2 6.2C3.7 8.1 2 12 2 12s3.5 7 10 7c1 0 1.9-.1 2.8-.4" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>Xác nhận</label>
              <div class="input-container">
                <input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="confirmPassword" placeholder="Nhập lại" />
                <button
                  type="button"
                  class="toggle-password"
                  (click)="togglePass()"
                  [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                >
                  <svg *ngIf="!showPassword()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <path d="M2 12s3.5-7 10-7s10 7 10 7s-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <svg *ngIf="showPassword()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a3 3 0 0 0 4.24 4.24" />
                    <path d="M9.9 4.6A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a18.7 18.7 0 0 1-4.2 5.4" />
                    <path d="M6.2 6.2C3.7 8.1 2 12 2 12s3.5 7 10 7c1 0 1.9-.1 2.8-.4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Giới tính</label>
            <div class="gender-selection">
              <label class="gender-pill">
                <input type="radio" name="gender" [(ngModel)]="gender" value="Nam">
                <span>Nam</span>
              </label>
              <label class="gender-pill">
                <input type="radio" name="gender" [(ngModel)]="gender" value="Nữ">
                <span>Nữ</span>
              </label>
              <label class="gender-pill">
                <input type="radio" name="gender" [(ngModel)]="gender" value="Khác">
                <span>Khác</span>
              </label>
            </div>
          </div>

          <button class="register-button" (click)="submit()" [disabled]="loading()">
            <span *ngIf="!loading()">Đăng Ký Ngay</span>
            <span *ngIf="loading()" class="loader"></span>
          </button>

          <div class="divider">
            <span>Hoặc</span>
          </div>

          <div class="social-row">
            <div class="google-wrapper">
              <div id="googleBtn"></div>
            </div>
          </div>

          <div class="auth-footer">
            Đã có tài khoản? <a routerLink="/login">Đăng nhập</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary: #c1121f;
      --primary-hover: #a4101a;
      --text-main: #1f2937;
      --text-muted: #6b7280;
      --border: #e5e7eb;
      --bg-card: #ffffff;
      display: block;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
    }

    .auth-container {
      position: relative;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px 20px;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #f3f4f6;
    }

    .background-overlay {
      position: absolute;
      inset: 0;
      background-image: url('https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=1600&auto=format&fit=crop');
      background-size: cover;
      background-position: center;
      filter: brightness(0.4);
      z-index: 0;
    }

    .auth-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 640px;
      background: var(--bg-card);
      border-radius: 48px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
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
      font-family: 'Segoe Script', 'Brush Script MT', 'Comic Sans MS', cursive;
      font-weight: 500;
      font-size: 46px;
      line-height: 1;
      letter-spacing: 0;
      margin: 0;
      color: var(--text-main);
      text-shadow: 0 10px 22px rgba(2, 6, 23, 0.08);
    }

    .brand-l {
      color: var(--primary);
      font-size: 1.18em;
      line-height: 1;
    }

    .brand-rest {
      color: rgba(15, 23, 42, 0.98);
      font-size: 1em;
      line-height: 1;
    }

    .brand-tagline {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .back-home {
      display: flex;
      align-items: center;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s;
    }

    .back-home:hover { color: var(--primary); }
    .back-home svg { width: 20px; height: 20px; }

    .auth-body {
      padding: 16px 48px 48px;
    }

    .welcome {
      text-align: center;
      margin-bottom: 18px;
    }

    .form-title {
      font-size: 26px;
      font-weight: 900;
      color: var(--text-main);
      margin: 0 0 2px;
      letter-spacing: -0.4px;
    }

    .form-subtitle {
      font-size: 14px;
      color: var(--text-muted);
      margin: 0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .form-group {
      margin-bottom: 12px;
    }

    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 4px;
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

    .input-icon svg { width: 18px; height: 18px; }

    .input-container input {
      width: 100%;
      height: 50px;
      padding: 0 16px;
      background: #f9fafb;
      border: 1.5px solid var(--border);
      border-radius: 18px;
      font-size: 15px;
      color: var(--text-main);
      transition: all 0.2s;
    }

    .input-container:has(.input-icon) input {
      padding-left: 48px;
    }

    .input-container input:focus {
      outline: none;
      border-color: var(--primary);
      background: #fff;
      box-shadow: 0 0 0 4px rgba(193, 18, 31, 0.1);
    }

    .toggle-password {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      color: rgba(17, 24, 39, 0.7);
      padding: 6px;
      cursor: pointer;
      display: grid;
      place-items: center;
    }

    .toggle-password svg {
      width: 18px;
      height: 18px;
    }

    .gender-selection {
      display: flex;
      gap: 8px;
    }

    .gender-pill {
      flex: 1;
      cursor: pointer;
      position: relative;
    }

    .gender-pill input {
      position: absolute;
      opacity: 0;
    }

    .gender-pill span {
      display: block;
      padding: 10px;
      text-align: center;
      background: #f9fafb;
      border: 1.5px solid var(--border);
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      transition: all 0.2s;
    }

    .gender-pill input:checked + span {
      background: #fff;
      border-color: var(--primary);
      color: var(--primary);
    }

    .register-button {
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
      box-shadow: 0 8px 16px -4px rgba(193, 18, 31, 0.4);
      margin: 12px 0 20px;
    }

    .register-button:hover:not(:disabled) {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }

    .divider {
      margin: 16px 0;
      display: flex;
      align-items: center;
      text-align: center;
      color: var(--text-muted);
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1.5px solid var(--border);
    }

    .divider span { padding: 0 10px; }

    .social-row {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      margin-bottom: 24px;
      height: 74px;
      margin-top: 12px;
    }

    .google-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      overflow: visible;
    }

    #googleBtn {
      transform: scale(1.35);
      transform-origin: top center;
      width: 100%;
      display: flex;
      justify-content: center;
      margin: 0;
    }

    :host ::ng-deep #googleBtn iframe {
      width: 100% !important;
      height: 54px !important;
      display: block !important;
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

    @media (max-width: 540px) {
      .auth-card { border-radius: 0; max-width: none; height: 100vh; }
      .auth-container { padding: 0; }
      .background-overlay { display: none; }

      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RegisterComponent implements AfterViewInit {

  firstName = '';
  lastName = '';
  phone = '';
  email = '';
  password = '';
  confirmPassword = '';
  gender = 'Nam';
  showPassword = signal(false);
  loading = signal(false);

  private router = inject(Router);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  private googleInitRetries = 0;

  togglePass(): void {
    this.showPassword.update(v => !v);
  }

  ngAfterViewInit(): void {
    /** * Đảm bảo kiểm tra google tồn tại trước khi khởi tạo 
     * để tránh lỗi crash khi SDK chưa tải kịp.
     */
    setTimeout(() => {
      this.initGoogle();
    }, 800);
  }

  private initGoogle(): void {
    const g = (window as any).google;
    if (!g || !g.accounts || !g.accounts.id) {
      return;
    }

    try {
      const googleBtnEl = document.getElementById('googleBtn');
      const wrapperEl = googleBtnEl?.parentElement as HTMLElement | null;
      const width = this.getGoogleBtnWidth(wrapperEl);

      if (googleBtnEl) {
        (googleBtnEl as HTMLElement).style.transform = '';
      }

      if (width < 320 && this.googleInitRetries < 20) {
        this.googleInitRetries++;
        setTimeout(() => this.initGoogle(), 120);
        return;
      }

      g.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (resp: any) => console.log('Google Resp:', resp)
      });
      g.accounts.id.renderButton(googleBtnEl, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width,
        text: 'signup_with'
      });
    } catch (e) {
      console.warn('Google SDK Error:', e);
    }
  }

  private getGoogleBtnWidth(el: HTMLElement | null): number {
    const w = el?.getBoundingClientRect?.().width;
    if (typeof w === 'number' && isFinite(w) && w > 0) return Math.floor(w);
    return 520;
  }

  submit(): void {
    const firstName = String(this.firstName || '').trim();
    const lastName = String(this.lastName || '').trim();
    const fullName = [lastName, firstName].filter(Boolean).join(' ').trim();
    const phone = String(this.phone || '').trim();
    const email = String(this.email || '').trim().toLowerCase();

    if (!fullName || !email || !this.password || !phone) {
      this.toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.toast.error('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    this.loading.set(true);
    this.auth
      .register({
        fullName,
        username: email,
        phone,
        email,
        password: this.password,
        gender: this.gender
      })
      .subscribe({
        next: (res: any) => {
          this.loading.set(false);
          if (!res?.success) {
            this.toast.error(res?.message || 'Đăng ký thất bại.');
            return;
          }
          this.toast.success('Đăng ký thành công');
          this.router.navigateByUrl('/login');
        },
        error: (err: any) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message || 'Đăng ký thất bại.');
        }
      });
  }
}
