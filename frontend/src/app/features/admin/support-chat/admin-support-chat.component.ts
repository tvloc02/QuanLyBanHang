import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataService, SupportConversationResponse, SupportMessageResponse } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-support-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-support-chat.component.html',
  styleUrls: ['./admin-support-chat.component.scss']
})
export class AdminSupportChatComponent implements OnDestroy {
  loading = false;
  error = '';

  conversations: SupportConversationResponse[] = [];
  selected: SupportConversationResponse | null = null;

  messagesLoading = false;
  messages: SupportMessageResponse[] = [];

  input = '';
  sending = false;

  private pollTimer: any = null;

  constructor(private adminData: AdminDataService) {
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.clearPoll();
  }

  loadConversations(): void {
    this.loading = true;
    this.error = '';
    this.adminData.listSupportConversations().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách hội thoại.';
          return;
        }
        this.conversations = Array.isArray(res.data) ? res.data : [];
        if (!this.selected && this.conversations.length > 0) {
          this.select(this.conversations[0]);
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy hội thoại.';
      }
    });
  }

  private startPoll(): void {
    this.clearPoll();
    this.pollTimer = setInterval(() => {
      if (!this.selected?.id) return;
      this.loadMessages();
    }, 4000);
  }

  private clearPoll(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  select(c: SupportConversationResponse): void {
    this.selected = c;
    this.loadMessages();
    this.startPoll();
  }

  loadMessages(): void {
    if (!this.selected?.id) return;
    this.messagesLoading = true;
    this.adminData.listSupportMessages(this.selected.id).subscribe({
      next: (res: any) => {
        this.messagesLoading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải tin nhắn.';
          return;
        }
        this.messages = Array.isArray(res.data) ? res.data : [];
      },
      error: () => {
        this.messagesLoading = false;
        this.error = 'Không thể kết nối backend để lấy tin nhắn.';
      }
    });
  }

  send(): void {
    if (!this.selected?.id) return;
    const text = (this.input || '').trim();
    if (!text) return;

    this.sending = true;
    this.error = '';

    this.adminData.sendSupportMessage(this.selected.id, { message: text }).subscribe({
      next: (res: any) => {
        this.sending = false;
        if (!res?.success) {
          this.error = res?.message || 'Gửi tin nhắn thất bại.';
          return;
        }
        const msg = res.data as SupportMessageResponse;
        if (msg) {
          this.messages = [...this.messages, msg];
        }
        this.input = '';
        this.loadConversations();
      },
      error: () => {
        this.sending = false;
        this.error = 'Không thể gửi tin nhắn.';
      }
    });
  }

  closeConversation(): void {
    if (!this.selected?.id) return;
    this.sending = true;
    this.error = '';

    this.adminData.closeSupportConversation(this.selected.id).subscribe({
      next: (res: any) => {
        this.sending = false;
        if (!res?.success) {
          this.error = res?.message || 'Đóng hội thoại thất bại.';
          return;
        }
        this.clearPoll();
        this.selected = null;
        this.messages = [];
        this.loadConversations();
      },
      error: () => {
        this.sending = false;
        this.error = 'Không thể đóng hội thoại.';
      }
    });
  }

  displayConvTitle(c: SupportConversationResponse): string {
    if (c.userId) return `User #${c.userId}`;
    if (c.guestToken) return `Khách (${c.guestToken.slice(0, 6)}...)`;
    return `Hội thoại #${c.id}`;
  }
}
