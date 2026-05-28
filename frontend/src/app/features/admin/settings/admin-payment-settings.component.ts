import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminPaymentSettings, PaymentSettingsService } from '../../../core/services/payment-settings.service';

@Component({
  selector: 'app-admin-payment-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-payment-settings.component.html',
  styleUrls: ['./admin-payment-settings.component.scss']
})
export class AdminPaymentSettingsComponent {
  loading = false;
  saving = false;
  message = '';
  error = '';
  settings: AdminPaymentSettings | null = null;

  form = {
    enabled: true,
    bankName: '',
    bankBin: '',
    accountNumber: '',
    accountHolder: '',
    branchName: '',
    note: ''
  };

  constructor(private paymentSettings: PaymentSettingsService) {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.message = '';
    this.settings = this.paymentSettings.getSettings();
    this.form.enabled = this.settings.enabled;
    this.form.bankName = this.settings.bankName || '';
    this.form.bankBin = this.settings.bankBin || '';
    this.form.accountNumber = this.settings.accountNumber || '';
    this.form.accountHolder = this.settings.accountHolder || '';
    this.form.branchName = this.settings.branchName || '';
    this.form.note = this.settings.note || '';
    this.loading = false;
  }

  save(): void {
    if (!this.form.bankName.trim() || !this.form.accountNumber.trim() || !this.form.accountHolder.trim()) {
      this.error = 'Vui lòng nhập đủ ngân hàng, số tài khoản và chủ tài khoản.';
      this.message = '';
      return;
    }

    this.saving = true;
    this.error = '';
    this.message = '';

    this.settings = this.paymentSettings.saveSettings({
      enabled: !!this.form.enabled,
      bankName: this.form.bankName.trim(),
      bankBin: this.form.bankBin.trim(),
      accountNumber: this.form.accountNumber.trim(),
      accountHolder: this.form.accountHolder.trim(),
      branchName: this.form.branchName.trim() || null,
      note: this.form.note.trim() || null
    });

    this.saving = false;
    this.message = 'Đã lưu cấu hình thanh toán thành công.';
  }

  get previewTransferContent(): string {
    return 'THANH TOAN DH12345678';
  }

  get previewQrUrl(): string {
    return this.paymentSettings.getQrImageUrl(819000, this.previewTransferContent);
  }
}
