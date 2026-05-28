import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataService, HomeSectionResponse } from '../../../core/services/admin-data.service';

type BannerItemForm = {
  enabled: boolean;
  title: string;
  description: string;
  imageUrl: string;
  route: string;
  primaryPopup: boolean;
};

@Component({
  selector: 'app-admin-news-banner-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-news-banner-settings.component.html',
  styleUrls: ['./admin-news-banner-settings.component.scss']
})
export class AdminNewsBannerSettingsComponent {
  loading = false;
  saving = false;
  error = '';
  success = '';

  private readonly sectionKey = 'NEWS_BANNER';

  section: HomeSectionResponse | null = null;

  form = {
    enabled: true,
    title: 'Banner tin tức',
    items: [] as BannerItemForm[]
  };

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  addItem(): void {
    this.form.items.push({
      enabled: true,
      title: 'Tin tức',
      description: '',
      imageUrl: '',
      route: '/news',
      primaryPopup: false
    });
  }

  removeItem(i: number): void {
    this.form.items.splice(i, 1);
    if (this.form.items.length === 0) {
      this.addItem();
    }
  }

  up(i: number): void {
    if (i <= 0) return;
    const a = this.form.items[i - 1];
    this.form.items[i - 1] = this.form.items[i];
    this.form.items[i] = a;
  }

  down(i: number): void {
    if (i >= this.form.items.length - 1) return;
    const a = this.form.items[i + 1];
    this.form.items[i + 1] = this.form.items[i];
    this.form.items[i] = a;
  }

  setPrimary(i: number): void {
    for (let idx = 0; idx < this.form.items.length; idx++) {
      this.form.items[idx].primaryPopup = idx === i;
    }
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.success = '';

    this.adminData.getHomeSections().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải cấu hình banner tin tức.';
          return;
        }

        const rows = Array.isArray(res?.data) ? (res.data as HomeSectionResponse[]) : [];
        const key = this.sectionKey;
        const sec = rows.find((s) => String(s?.sectionKey || '').toUpperCase() === key) || null;

        this.section = sec;
        this.form.enabled = sec?.enabled !== false;
        this.form.title = String(sec?.title || 'Banner tin tức');

        const items = Array.isArray(sec?.items) ? sec!.items! : [];
        const mapped = items
          .map((it) => {
            const code = String((it as any)?.code || '').toUpperCase();
            return {
              enabled: it?.enabled !== false,
              title: String(it?.title || 'Tin tức'),
              description: String(it?.description || ''),
              imageUrl: String(it?.imageUrl || ''),
              route: String(it?.route || '/news'),
              primaryPopup: code === 'PRIMARY_POPUP'
            } as BannerItemForm;
          });

        this.form.items = mapped.length
          ? mapped
          : [
              {
                enabled: true,
                title: 'Tin tức',
                description: '',
                imageUrl: '',
                route: '/news',
                primaryPopup: false
              }
            ];

        // Ensure only one primary
        const primaryIndex = this.form.items.findIndex((x) => x.primaryPopup);
        if (primaryIndex >= 0) {
          this.setPrimary(primaryIndex);
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy cấu hình banner tin tức.';
      }
    });
  }

  save(): void {
    const hasAnyImage = (this.form.items || []).some((x) => String(x?.imageUrl || '').trim());
    if (!hasAnyImage) {
      this.error = 'Vui lòng nhập URL hình banner (ít nhất 1 banner).';
      this.success = '';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const payload = {
      title: String(this.form.title || '').trim() || null,
      enabled: !!this.form.enabled,
      items: (this.form.items || []).map((x) => {
        const imageUrl = String(x?.imageUrl || '').trim();
        const title = String(x?.title || '').trim();
        const route = String(x?.route || '').trim();

        return {
          enabled: !!x.enabled,
          itemType: 'LINK',
          title: title || null,
          imageUrl: imageUrl || null,
          route: route || '/news',
          description: String(x?.description || '').trim() || null,
          refId: null,
          code: x.primaryPopup ? 'PRIMARY_POPUP' : null,
          note: null,
          buttonText: null
        };
      })
    };

    this.adminData.updateHomeSection(this.sectionKey, payload as any).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (!res?.success) {
          this.error = res?.message || 'Lưu cấu hình banner tin tức thất bại.';
          return;
        }
        this.success = 'Đã lưu cấu hình.';
        this.load();
      },
      error: (err: any) => {
        this.saving = false;
        this.error = err?.error?.message || 'Không thể lưu cấu hình banner tin tức.';
      }
    });
  }
}
