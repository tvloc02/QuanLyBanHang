import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';

/**
 * Mock environment and service for Canvas preview.
 * Remove these when integrating into your actual project.
 */
const environment = {
  apiBaseUrl: 'https://api.fashionhub.com',
  googleClientId: '6325124587-example.apps.googleusercontent.com'
};

class AuthService {
  register(data: any) {
    return of({ success: true, message: 'Đăng ký thành công' });
  }
}

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
            <h1 class="brand-name">FASHION<span>HUB</span></h1>
            <p class="brand-tagline">Khởi đầu phong cách mới</p>
          </div>
          <a routerLink="/" class="back-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </a>
        </div>

        <div class="auth-body">
          <h2 class="form-title">Tạo Tài Khoản</h2>
          <p class="form-subtitle">Tham gia cùng chúng tôi để nhận ưu đãi đặc quyền</p>

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
              </div>
            </div>
            <div class="form-group">
              <label>Xác nhận</label>
              <div class="input-container">
                <input [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="confirmPassword" placeholder="Nhập lại" />
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

          <div class="error-message" *ngIf="error()">
            {{ error() }}
          </div>

          <button class="register-button" (click)="submit()" [disabled]="loading()">
            <span *ngIf="!loading()">Đăng Ký Ngay</span>
            <span *ngIf="loading()" class="loader"></span>
          </button>

          <div class="divider">
            <span>Hoặc đăng ký nhanh với</span>
          </div>

          <div class="social-row">
            <button class="facebook-btn" (click)="socialAction()">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
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
      justify-content: center;
      align-items: flex-start;
      padding: 30px 20px; /* Đẩy lên trên hơn để cân đối với header */
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
      max-width: 540px; /* Tăng chiều rộng để thoải mái hơn */
      background: var(--bg-card);
      border-radius: 28px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
      overflow: hidden;
      animation: fadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeInScale {
      from { opacity: 0; transform: scale(0.98) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .auth-header {
      padding: 24px 32px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand-name {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin: 0;
      color: var(--text-main);
    }

    .brand-name span { color: var(--primary); }

    .brand-tagline {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 1px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
      padding: 16px 32px 32px;
    }

    .form-title {
      font-size: 24px;
      font-weight: 850;
      color: var(--text-main);
      margin: 0 0 2px;
    }

    .form-subtitle {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 20px;
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
      font-weight: 700;
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
      left: 14px;
      color: var(--text-muted);
      display: flex;
    }

    .input-icon svg { width: 16px; height: 16px; }

    .input-container input {
      width: 100%;
      height: 46px;
      padding: 0 16px;
      background: #f9fafb;
      border: 1.5px solid var(--border);
      border-radius: 14px;
      font-size: 14px;
      color: var(--text-main);
      transition: all 0.2s;
    }

    .input-container:has(.input-icon) input {
      padding-left: 42px;
    }

    .input-container input:focus {
      outline: none;
      border-color: var(--primary);
      background: #fff;
      box-shadow: 0 0 0 4px rgba(193, 18, 31, 0.1);
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
      height: 50px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 14px;
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
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
      align-items: center;
    }

    .facebook-btn {
      width: 100%;
      height: 42px;
      background: var(--facebook);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
    }

    .google-wrapper {
      width: 100%;
      height: 42px;
      display: flex;
      justify-content: center;
      overflow: hidden;
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
  error = signal('');

  private router = inject(Router);
  private http = inject(HttpClient);

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
      g.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (resp: any) => console.log('Google Resp:', resp)
      });
      g.accounts.id.renderButton(document.getElementById('googleBtn'), {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        width: 220, // Kích thước phù hợp cho 2 cột
        text: 'signup_with'
      });
    } catch (e) {
      console.warn('Google SDK Error:', e);
    }
  }

  socialAction(): void {
    this.error.set('Hệ thống đang được bảo trì.');
  }

  submit(): void {
    this.error.set('');
    if (!this.email || !this.password || !this.phone) {
      this.error.set('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    this.loading.set(true);
    setTimeout(() => {
      this.loading.set(false);
      this.router.navigateByUrl('/login');
    }, 1500);
  }
}