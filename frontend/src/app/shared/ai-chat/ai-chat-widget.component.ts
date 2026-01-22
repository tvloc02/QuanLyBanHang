import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ChatResponse {
  provider?: string | null;
  answer?: string | null;
}

interface ChatQuotaResponse {
  authenticated: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

type ChatMsg = {
  role: 'user' | 'ai';
  text: string;
};

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ai-chat-widget.component.html',
  styleUrls: ['./ai-chat-widget.component.scss']
})
export class AiChatWidgetComponent {
  open = false;
  sending = false;
  error = '';
  input = '';
  messages: ChatMsg[] = [];

  quotaLoading = false;
  quotaLimit = 5;
  quotaRemaining: number | null = null;
  quotaResetAt: number | null = null;

  @ViewChild('wrap')
  wrap?: ElementRef<HTMLElement>;

  @ViewChild('list')
  list?: ElementRef<HTMLElement>;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  toggle(): void {
    this.open = !this.open;
    this.error = '';
    if (this.open) {
      this.refreshQuota();
      this.scrollToBottom();
    }
  }

  close(): void {
    this.open = false;
    this.error = '';
  }

  goLogin(): void {
    this.router.navigateByUrl('/login');
  }

  isGuestLimited(): boolean {
    return !this.isAuthenticated();
  }

  canSend(): boolean {
    if (this.sending) return false;
    if (!this.isGuestLimited()) return true;
    if (this.quotaRemaining == null) return true;
    return this.quotaRemaining > 0;
  }

  refreshQuota(): void {
    if (!this.isGuestLimited()) {
      this.quotaRemaining = null;
      this.quotaResetAt = null;
      return;
    }

    this.quotaLoading = true;
    const url = `${environment.apiBaseUrl}/api/chat/quota`;
    this.http.get<ApiResponse<ChatQuotaResponse>>(url).subscribe({
      next: (res) => {
        this.quotaLoading = false;
        const d = res?.data;
        if (!d) return;
        if (d.authenticated) {
          this.quotaRemaining = null;
          this.quotaResetAt = null;
          return;
        }
        this.quotaLimit = d.limit || 5;
        this.quotaRemaining = typeof d.remaining === 'number' ? d.remaining : null;
        this.quotaResetAt = typeof d.resetAt === 'number' ? d.resetAt : null;
      },
      error: () => {
        this.quotaLoading = false;
      }
    });
  }

  send(): void {
    this.error = '';

    if (!this.canSend()) {
      this.error = 'Bạn đã dùng hết lượt chat hôm nay. Vui lòng thử lại sau.';
      return;
    }

    const text = (this.input || '').trim();
    if (!text) return;

    this.messages.push({ role: 'user', text });
    this.input = '';
    this.sending = true;
    this.scrollToBottom();

    const url = `${environment.apiBaseUrl}/api/chat`;
    this.http
      .post<ApiResponse<ChatResponse>>(url, { message: text })
      .subscribe({
        next: (res) => {
          const ans = res?.data?.answer || '';
          this.messages.push({ role: 'ai', text: ans });
          this.sending = false;

          if (this.isGuestLimited() && this.quotaRemaining != null) {
            this.quotaRemaining = Math.max(0, this.quotaRemaining - 1);
          }

          this.scrollToBottom();
        },
        error: (err) => {
          this.sending = false;
          const msg = err?.error?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.';
          this.error = msg;
          if (err?.status === 429) {
            this.refreshQuota();
          }
          this.scrollToBottom();
        }
      });
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.list?.nativeElement;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }, 0);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.open) return;

    const target = event.target as Node | null;
    const host = this.wrap?.nativeElement;
    if (target && host && host.contains(target)) return;

    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
