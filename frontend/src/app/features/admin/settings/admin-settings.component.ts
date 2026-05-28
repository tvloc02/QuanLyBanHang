import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAiSettingsResponse, AdminDataService } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent {
  loading = false;
  saving = false;
  error = '';

  ai: AdminAiSettingsResponse | null = null;

  form = {
    defaultProvider: 'gemini',
    geminiApiKey: '',
    openaiApiKey: '',
    clearGemini: false,
    clearOpenai: false
  };

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.adminData.getAiSettings().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải cấu hình AI.';
          return;
        }
        this.ai = res.data || null;
        this.form.defaultProvider = (this.ai?.defaultProvider || 'gemini') as 'gemini' | 'openai';
        this.form.geminiApiKey = '';
        this.form.openaiApiKey = '';
        this.form.clearGemini = false;
        this.form.clearOpenai = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy cấu hình AI.';
      }
    });
  }

  save(): void {
    this.saving = true;
    this.error = '';

    const payload: any = {
      defaultProvider: this.form.defaultProvider
    };

    const gemini = this.form.geminiApiKey.trim();
    const openai = this.form.openaiApiKey.trim();

    if (gemini) {
      payload.geminiApiKey = gemini;
    } else if (this.form.clearGemini) {
      payload.geminiApiKey = '';
    }

    if (openai) {
      payload.openaiApiKey = openai;
    } else if (this.form.clearOpenai) {
      payload.openaiApiKey = '';
    }

    this.adminData.updateAiSettings(payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (!res?.success) {
          this.error = res?.message || 'Lưu cấu hình AI thất bại.';
          return;
        }
        this.ai = res.data || null;
        this.form.geminiApiKey = '';
        this.form.openaiApiKey = '';
        this.form.clearGemini = false;
        this.form.clearOpenai = false;
      },
      error: () => {
        this.saving = false;
        this.error = 'Không thể lưu cấu hình AI.';
      }
    });
  }
}
