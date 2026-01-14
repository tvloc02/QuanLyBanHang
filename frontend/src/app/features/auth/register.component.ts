import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
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
          <div class="title">Đăng ký</div>
          <div class="sub">Tạo tài khoản để lưu voucher, theo dõi đơn hàng và nhận ưu đãi.</div>

          <div class="grid2">
            <div class="field">
              <div class="label">Họ</div>
              <div class="input-wrap">
                <span class="icon" aria-hidden="true">👤</span>
                <input class="input" [(ngModel)]="lastName" placeholder="Nhập họ" />
              </div>
            </div>
            <div class="field">
              <div class="label">Tên</div>
              <div class="input-wrap">
                <span class="icon" aria-hidden="true">👤</span>
                <input class="input" [(ngModel)]="firstName" placeholder="Nhập tên" />
              </div>
            </div>
          </div>

          <div class="field">
            <div class="label">SĐT</div>
            <div class="input-wrap">
              <span class="icon" aria-hidden="true">☎</span>
              <input class="input" [(ngModel)]="phone" inputmode="tel" placeholder="Nhập số điện thoại" />
            </div>
          </div>

          <div class="grid2">
            <div class="field">
              <div class="label">Email</div>
              <div class="input-wrap">
                <span class="icon" aria-hidden="true">✉</span>
                <input class="input" [(ngModel)]="email" inputmode="email" placeholder="Nhập email" />
              </div>
            </div>
            <div class="field">
              <div class="label">Ngày sinh</div>
              <div class="input-wrap">
                <span class="icon" aria-hidden="true">📅</span>
                <input class="input" type="date" [(ngModel)]="dob" />
              </div>
            </div>
          </div>

          <div class="field">
            <div class="label">Giới tính</div>
            <div class="gender">
              <label class="pill"><input type="radio" name="gender" [(ngModel)]="gender" [value]="'Nữ'" /> Nữ</label>
              <label class="pill"><input type="radio" name="gender" [(ngModel)]="gender" [value]="'Nam'" /> Nam</label>
              <label class="pill"><input type="radio" name="gender" [(ngModel)]="gender" [value]="'Khác'" /> Khác</label>
            </div>
          </div>

          <div class="field">
            <div class="label">Mật khẩu</div>
            <div class="input-wrap">
              <span class="icon" aria-hidden="true">🔒</span>
              <input class="input" [type]="showPassword ? 'text' : 'password'" [(ngModel)]="password" placeholder="Nhập mật khẩu" />
              <button type="button" class="icon-btn" (click)="showPassword = !showPassword" aria-label="Toggle password">
                {{ showPassword ? 'Ẩn' : 'Hiện' }}
              </button>
            </div>
          </div>

          <div class="field">
            <div class="label">Xác nhận mật khẩu</div>
            <div class="input-wrap">
              <span class="icon" aria-hidden="true">🔒</span>
              <input class="input" [type]="showPassword2 ? 'text' : 'password'" [(ngModel)]="confirmPassword" placeholder="Nhập lại mật khẩu" />
              <button type="button" class="icon-btn" (click)="showPassword2 = !showPassword2" aria-label="Toggle password confirm">
                {{ showPassword2 ? 'Ẩn' : 'Hiện' }}
              </button>
            </div>
          </div>

          <div class="terms">
            Bằng việc đăng ký, bạn đồng ý với
            <a routerLink="/" class="link">Điều khoản</a>
            và
            <a routerLink="/" class="link">Chính sách</a>
            của chúng tôi.
          </div>

          <button type="button" class="btn" (click)="submit()">Đăng ký</button>

          <div class="divider"><span>Đã có tài khoản?</span></div>

          <a class="ghost" routerLink="/login">Đăng nhập</a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-shell {
        position: relative;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 34px 16px;
        background: var(--fh-bg);
      }
      .auth-modal {
        position: relative;
        width: min(680px, 100%);
        background: rgba(255, 255, 255, 0.78);
        backdrop-filter: blur(14px);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 22px 55px rgba(0, 0, 0, 0.16);
        border: 1px solid rgba(0, 0, 0, 0.06);
      }
      .auth-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 18px;
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
        padding: 20px 22px 22px;
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
        font-size: 20px;
        margin: 0 0 6px;
        letter-spacing: 0.2px;
        color: #111;
      }
      .sub {
        color: #6b7280;
        font-size: 12px;
        line-height: 1.55;
        margin-bottom: 16px;
      }

      .grid2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
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

      .gender {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.75);
        font-size: 12px;
        font-weight: 800;
        color: rgba(17, 24, 39, 0.9);
      }

      .pill input {
        width: 14px;
        height: 14px;
      }

      .terms {
        margin: 8px 0 12px;
        font-size: 11px;
        color: #6b7280;
        line-height: 1.5;
      }
      .link {
        color: var(--fh-primary);
        text-decoration: none;
        font-weight: 1000;
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
        box-shadow: 0 10px 22px rgba(193, 18, 31, 0.24);
      }
      .btn:hover {
        filter: brightness(0.98);
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

      @media (max-width: 680px) {
        .grid2 {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 420px) {
        .auth-col {
          padding: 18px 16px 18px;
        }
      }
    `
  ]
})
export class RegisterComponent {
  firstName = '';
  lastName = '';
  phone = '';
  email = '';
  dob = '';
  gender: 'Nữ' | 'Nam' | 'Khác' = 'Nữ';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showPassword2 = false;

  constructor(private router: Router) {}

  submit(): void {
    this.router.navigateByUrl('/login');
  }
}
