import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
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

type SupportSender = 'CUSTOMER' | 'STAFF';

interface SupportConversationResponse {
  id?: number | null;
  userId?: number | null;
  guestToken?: string | null;
  status?: 'OPEN' | 'CLOSED' | null;
  assignedStaffId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastMessageAt?: string | null;
}

interface SupportMessageResponse {
  id?: number | null;
  conversationId?: number | null;
  senderType?: SupportSender | null;
  senderUserId?: number | null;
  message?: string | null;
  createdAt?: string | null;
}

type SupportMsg = {
  sender: SupportSender;
  text: string;
  createdAt?: string | null;
};

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ai-chat-widget.component.html',
  styleUrls: ['./ai-chat-widget.component.scss']
})
export class AiChatWidgetComponent implements OnDestroy {
  open = false;
  supportOpen = false;
  sending = false;
  error = '';
  input = '';
  messages: ChatMsg[] = [];

  supportSending = false;
  supportError = '';
  supportInput = '';
  supportMessages: SupportMsg[] = [];
  supportConversation: SupportConversationResponse | null = null;
  private supportPollTimer: any = null;

  private readonly supportGuestTokenKey = 'supportChatGuestToken';

  quotaLoading = false;
  quotaLimit = 5;
  quotaRemaining: number | null = null;
  quotaResetAt: number | null = null;

  @ViewChild('wrap')
  wrap?: ElementRef<HTMLElement>;

  @ViewChild('list')
  list?: ElementRef<HTMLElement>;

  @ViewChild('supportList')
  supportList?: ElementRef<HTMLElement>;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnDestroy(): void {
    this.clearSupportPoll();
  }

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  sendSupport(): void {
    this.supportError = '';

    const text = (this.supportInput || '').trim();
    if (!text) return;

    this.supportMessages.push({ sender: 'CUSTOMER', text, createdAt: new Date().toISOString() });
    this.supportInput = '';
    this.supportSending = true;
    this.scrollSupportToBottom();

    const url = `${environment.apiBaseUrl}/api/support-chat/messages`;
    const guestToken = this.getSupportGuestToken();
    this.http
      .post<ApiResponse<SupportMessageResponse>>(url, { guestToken, message: text })
      .subscribe({
        next: (res) => {
          this.supportSending = false;
          if (!res?.success) {
            this.supportError = res?.message || 'Không thể gửi tin nhắn.';
            return;
          }
          const m = res?.data;
          if (m?.message) {
            this.supportMessages = this.supportMessages.slice(0, -1).concat([{ sender: 'CUSTOMER', text: m.message, createdAt: m.createdAt }]);
          }
          this.scrollSupportToBottom();
        },
        error: (err) => {
          this.supportSending = false;
          const msg = err?.error?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.';
          this.supportError = msg;
          this.scrollSupportToBottom();
        }
      });
  }

  toggle(): void {
    this.open = !this.open;
    this.error = '';
    if (this.open) {
      this.refreshQuota();
      this.scrollToBottom();
    }
  }

  toggleSupport(): void {
    this.supportOpen = !this.supportOpen;
    this.supportError = '';
    if (this.supportOpen) {
      this.open = false;
      this.ensureSupportConversation();
    } else {
      this.clearSupportPoll();
    }
  }

  close(): void {
    this.open = false;
    this.error = '';
  }

  closeSupport(): void {
    this.supportOpen = false;
    this.supportError = '';
    this.clearSupportPoll();
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

  onSupportInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendSupport();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.list?.nativeElement;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }, 0);
  }

  private scrollSupportToBottom(): void {
    setTimeout(() => {
      const el = this.supportList?.nativeElement;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }, 0);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.open && !this.supportOpen) return;

    const target = event.target as Node | null;
    const host = this.wrap?.nativeElement;
    if (target && host && host.contains(target)) return;

    this.close();
    this.closeSupport();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
    this.closeSupport();
  }

  private ensureSupportConversation(): void {
    this.supportError = '';
    const url = `${environment.apiBaseUrl}/api/support-chat/start`;
    const guestToken = this.getSupportGuestToken();
    this.http.post<ApiResponse<SupportConversationResponse>>(url, { guestToken }).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.supportError = res?.message || 'Không thể bắt đầu chat với nhân viên.';
          return;
        }
        this.supportConversation = res.data || null;
        const token = this.supportConversation?.guestToken;
        if (token) {
          this.setSupportGuestToken(token);
        }
        this.refreshSupportMessages();
        this.startSupportPoll();
        this.scrollSupportToBottom();
      },
      error: () => {
        this.supportError = 'Không thể kết nối backend để chat với nhân viên.';
      }
    });
  }

  private refreshSupportMessages(): void {
    const guestToken = this.getSupportGuestToken();
    const url = `${environment.apiBaseUrl}/api/support-chat/messages${guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : ''}`;
    this.http.get<ApiResponse<SupportMessageResponse[]>>(url).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.supportError = res?.message || 'Không thể tải tin nhắn.';
          return;
        }
        const list = Array.isArray(res.data) ? res.data : [];
        this.supportMessages = list
          .filter((m) => !!m?.message)
          .map((m) => ({
            sender: (m.senderType || 'CUSTOMER') as SupportSender,
            text: m.message || '',
            createdAt: m.createdAt
          }));
        this.scrollSupportToBottom();
      },
      error: () => {
        this.supportError = 'Không thể tải tin nhắn.';
      }
    });
  }

  private startSupportPoll(): void {
    this.clearSupportPoll();
    this.supportPollTimer = setInterval(() => {
      if (!this.supportOpen) return;
      this.refreshSupportMessages();
    }, 5000);
  }

  private clearSupportPoll(): void {
    if (this.supportPollTimer) {
      clearInterval(this.supportPollTimer);
      this.supportPollTimer = null;
    }
  }

  private getSupportGuestToken(): string {
    if (this.isAuthenticated()) return '';
    try {
      return localStorage.getItem(this.supportGuestTokenKey) || '';
    } catch {
      return '';
    }
  }

  private setSupportGuestToken(token: string): void {
    if (!token) return;
    try {
      localStorage.setItem(this.supportGuestTokenKey, token);
    } catch {
      // ignore
    }
  }
}
