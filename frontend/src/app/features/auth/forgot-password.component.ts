import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-container">
      <div class="background-overlay"></div>

      <div class="auth-card">
        <div class="auth-header">
          <div class="brand-section">
            <h1 class="brand-name"><span class="brand-lo">Lo</span><span class="brand-vin">Vin</span></h1>
            <p class="brand-tagline">Nâng tầm phong cách của bạn</p>
          </div>
          <a routerLink="/sale" class="back-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Trang chủ
          </a>
        </div>

        <div class="auth-body">
          <h2 class="form-title">Quên mật khẩu</h2>
          <p class="form-subtitle">Nhập email hoặc số điện thoại để nhận hướng dẫn đặt lại mật khẩu</p>

          <div class="form-group">
            <label>Email / Số điện thoại</label>
            <div class="input-container">
              <span class="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </span>
              <input
                type="text"
                [(ngModel)]="contact"
                placeholder="vd: email@gmail.com hoặc 09xxxxxxxx"
                (keyup.enter)="submit()"
              />
            </div>
          </div>

          <button class="primary-button" type="button" (click)="submit()" [disabled]="loading()">
            <span *ngIf="!loading()">Gửi hướng dẫn</span>
            <span *ngIf="loading()" class="loader"></span>
          </button>

          <div class="auth-footer">
            <a routerLink="/login">Quay lại đăng nhập</a>
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

    .brand-lo { color: var(--text-main); }
    .brand-vin { color: var(--primary); }

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
      margin-bottom: 16px;
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
      padding: 0 16px 0 48px;
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

    .primary-button {
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
    }

    .primary-button:hover:not(:disabled) {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }

    .primary-button:disabled {
      opacity: 0.65;
      cursor: not-allowed;
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

    .auth-footer {
      margin-top: 16px;
      text-align: center;
      font-size: 14px;
      color: var(--text-muted);
    }

    .auth-footer a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 700;
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
      .auth-header, .auth-body {
        padding-left: 24px;
        padding-right: 24px;
      }
    }
  `]
})
export class ForgotPasswordComponent {
  contact = '';
  loading = signal(false);

  private router = inject(Router);
  private toast = inject(ToastService);

  submit(): void {
    const v = (this.contact || '').trim();
    if (!v) {
      this.toast.error('Vui lòng nhập email hoặc số điện thoại.');
      return;
    }

    this.loading.set(true);
    setTimeout(() => {
      this.loading.set(false);
      this.toast.success('Nếu thông tin hợp lệ, hướng dẫn đặt lại mật khẩu sẽ được gửi trong ít phút.');
      this.router.navigateByUrl('/login');
    }, 600);
  }
}
