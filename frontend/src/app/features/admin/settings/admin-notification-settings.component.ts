import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataService, AdminNotificationSettingsResponse } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-notification-settings.component.html',
  styleUrls: ['./admin-notification-settings.component.scss']
})
export class AdminNotificationSettingsComponent {
  loading = false;
  saving = false;
  error = '';

  settings: AdminNotificationSettingsResponse | null = null;

  form = {
    enabled: true,
    notifyNewOrder: true,
    notifyOrderStatus: true,
    notifyLowStock: false
  };

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.adminData.getNotificationSettings().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải cấu hình thông báo.';
          return;
        }
        this.settings = res.data || null;
        this.form.enabled = this.settings?.enabled !== false;
        this.form.notifyNewOrder = this.settings?.notifyNewOrder !== false;
        this.form.notifyOrderStatus = this.settings?.notifyOrderStatus !== false;
        this.form.notifyLowStock = !!this.settings?.notifyLowStock;
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy cấu hình thông báo.';
      }
    });
  }

  save(): void {
    this.saving = true;
    this.error = '';

    const payload: any = {
      enabled: !!this.form.enabled,
      notifyNewOrder: !!this.form.notifyNewOrder,
      notifyOrderStatus: !!this.form.notifyOrderStatus,
      notifyLowStock: !!this.form.notifyLowStock
    };

    this.adminData.updateNotificationSettings(payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (!res?.success) {
          this.error = res?.message || 'Lưu cấu hình thông báo thất bại.';
          return;
        }
        this.settings = res.data || null;
      },
      error: () => {
        this.saving = false;
        this.error = 'Không thể lưu cấu hình thông báo.';
      }
    });
  }
}
