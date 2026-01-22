import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataService, AdminMailSettingsResponse } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-mail-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-mail-settings.component.html',
  styleUrls: ['./admin-mail-settings.component.scss']
})
export class AdminMailSettingsComponent {
  loading = false;
  saving = false;
  error = '';

  settings: AdminMailSettingsResponse | null = null;

  form = {
    enabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    clearPassword: false,
    fromEmail: '',
    fromName: '',
    useTls: true
  };

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.adminData.getMailSettings().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải cấu hình mail.';
          return;
        }
        this.settings = res.data || null;
        this.form.enabled = !!this.settings?.enabled;
        this.form.smtpHost = this.settings?.smtpHost || '';
        this.form.smtpPort = (this.settings?.smtpPort as any) ?? 587;
        this.form.smtpUsername = this.settings?.smtpUsername || '';
        this.form.smtpPassword = '';
        this.form.clearPassword = false;
        this.form.fromEmail = this.settings?.fromEmail || '';
        this.form.fromName = this.settings?.fromName || '';
        this.form.useTls = this.settings?.useTls !== false;
      },
      error: (err: any) => {
        this.loading = false;

        if (err?.status === 0) {
          this.error = 'Không thể kết nối backend để lấy cấu hình mail. Vui lòng kiểm tra backend đang chạy ở http://localhost:8081.';
          return;
        }

        const msg = err?.error?.message || err?.message;
        if (typeof msg === 'string' && msg.trim()) {
          this.error = msg;
          return;
        }

        this.error = `Không thể tải cấu hình mail (HTTP ${err?.status ?? 'unknown'}).`;
      }
    });
  }

  save(): void {
    this.saving = true;
    this.error = '';

    const payload: any = {
      enabled: !!this.form.enabled,
      smtpHost: this.form.smtpHost,
      smtpPort: this.form.smtpPort,
      smtpUsername: this.form.smtpUsername,
      fromEmail: this.form.fromEmail,
      fromName: this.form.fromName,
      useTls: !!this.form.useTls
    };

    const pwd = (this.form.smtpPassword || '').trim();
    if (pwd) {
      payload.smtpPassword = pwd;
    } else if (this.form.clearPassword) {
      payload.smtpPassword = '';
    }

    this.adminData.updateMailSettings(payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (!res?.success) {
          this.error = res?.message || 'Lưu cấu hình mail thất bại.';
          return;
        }
        this.settings = res.data || null;
        this.form.smtpPassword = '';
        this.form.clearPassword = false;
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err?.error?.message || err?.message || 'Không thể lưu cấu hình mail.';
        this.error = msg;
      }
    });
  }
}
