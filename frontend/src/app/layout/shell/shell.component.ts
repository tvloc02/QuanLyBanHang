import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AiChatWidgetComponent } from '../../shared/ai-chat/ai-chat-widget.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { HeaderComponent } from '../../shared/header/header.component';
import { environment } from '../../../environments/environment';
import { HomeSectionResponse } from '../../core/services/admin-data.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterOutlet, RouterLink, HeaderComponent, FooterComponent, AiChatWidgetComponent],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent {
  popupOpen = false;
  popupTitle = '';
  popupImageUrl = '';
  popupRoute = '';

  private readonly popupSessionKey = 'fh_news_popup_seen';

  constructor(private http: HttpClient) {
    this.loadEntryPopupIfNeeded();
  }

  closePopup(): void {
    this.popupOpen = false;
    try {
      sessionStorage.setItem(this.popupSessionKey, '1');
    } catch {
      // ignore
    }
  }

  private loadEntryPopupIfNeeded(): void {
    try {
      if (sessionStorage.getItem(this.popupSessionKey) === '1') return;
    } catch {
      // ignore
    }

    const url = `${environment.apiBaseUrl}/api/home-sections`;
    this.http.get<{ success: boolean; data: HomeSectionResponse[] }>(url).subscribe({
      next: (res) => {
        if (!res?.success) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        const sec = rows.find((s) => String(s?.sectionKey || '').toUpperCase() === 'NEWS_BANNER') || null;
        if (!sec || sec.enabled === false) return;

        const items = Array.isArray(sec.items) ? sec.items : [];
        const it = items.find((x: any) => x && x.enabled !== false && String(x.code || '').toUpperCase() === 'PRIMARY_POPUP') as any;
        if (!it) return;
        const img = String(it.imageUrl || '').trim();
        if (!img) return;

        this.popupTitle = String(it.title || 'Thông báo');
        this.popupImageUrl = img;
        this.popupRoute = String(it.route || '').trim();
        this.popupOpen = true;
      },
      error: () => {
        // ignore
      }
    });
  }
}
