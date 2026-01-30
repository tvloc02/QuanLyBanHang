import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      <div
        class="toast"
        *ngFor="let t of toast.toasts()"
        [class.toast--success]="t.type === 'success'"
        [class.toast--error]="t.type === 'error'"
        [class.toast--info]="t.type === 'info'"
        (click)="toast.dismiss(t.id)"
        role="status"
      >
        <div class="toast__message">{{ t.message }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 9999;
        pointer-events: none;
      }

      .toast-stack {
        display: grid;
        gap: 10px;
        max-width: 360px;
      }

      .toast {
        pointer-events: auto;
        cursor: pointer;
        border-radius: 12px;
        padding: 12px 14px;
        background: rgba(17, 24, 39, 0.92);
        color: #fff;
        box-shadow: 0 16px 30px -12px rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.08);
        transform: translateX(0);
        animation: toastIn 0.18s ease-out;
      }

      .toast__message {
        font-size: 14px;
        font-weight: 600;
        line-height: 1.35;
      }

      .toast--success {
        background: rgba(22, 163, 74, 0.92);
      }

      .toast--error {
        background: rgba(220, 38, 38, 0.92);
      }

      .toast--info {
        background: rgba(37, 99, 235, 0.92);
      }

      @keyframes toastIn {
        from {
          opacity: 0;
          transform: translateX(8px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @media (max-width: 480px) {
        :host {
          right: 10px;
          left: 10px;
        }
        .toast-stack {
          max-width: none;
        }
      }
    `
  ]
})
export class ToastContainerComponent {
  toast = inject(ToastService);
}
