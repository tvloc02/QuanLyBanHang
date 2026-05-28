import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { HomeSectionResponse } from '../../core/services/admin-data.service';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

type NewsBanner = {
  enabled: boolean;
  title: string;
  imageUrl: string;
  route: string;
  description: string;
};

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss']
})
export class NewsComponent implements OnInit {
  loading = false;
  error = '';

  banners: NewsBanner[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadBanner();
  }

  private loadBanner(): void {
    this.loading = true;
    this.error = '';

    const url = `${environment.apiBaseUrl}/api/home-sections`;
    this.http.get<ApiResponse<HomeSectionResponse[]>>(url).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.applyBanner(rows);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private applyBanner(rows: HomeSectionResponse[]): void {
    const sec = rows.find((s) => String(s?.sectionKey || '').toUpperCase() === 'NEWS_BANNER') || null;
    if (!sec || sec.enabled === false) {
      this.banners = [];
      return;
    }

    const items = Array.isArray(sec.items) ? sec.items : [];

    const out: NewsBanner[] = [];
    for (const it of items) {
      if (!it || it.enabled === false) continue;
      const imageUrl = String((it as any)?.imageUrl || '').trim();
      if (!imageUrl) continue;
      out.push({
        enabled: true,
        title: String((it as any)?.title || 'Tin tức'),
        description: String((it as any)?.description || ''),
        imageUrl,
        route: String((it as any)?.route || '/news')
      });
    }
    this.banners = out;
  }
}
