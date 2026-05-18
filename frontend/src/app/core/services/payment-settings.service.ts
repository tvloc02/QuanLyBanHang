import { Injectable } from '@angular/core';

export interface AdminPaymentSettings {
  enabled: boolean;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountHolder: string;
  branchName?: string | null;
  note?: string | null;
  updatedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PaymentSettingsService {
  private readonly storageKey = 'admin_payment_settings';

  getSettings(): AdminPaymentSettings {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return this.normalize(parsed);
    } catch {
      return this.normalize(null);
    }
  }

  saveSettings(value: Partial<AdminPaymentSettings>): AdminPaymentSettings {
    const normalized = this.normalize({
      ...this.getSettings(),
      ...value,
      updatedAt: new Date().toISOString()
    });
    localStorage.setItem(this.storageKey, JSON.stringify(normalized));
    return normalized;
  }

  getQrImageUrl(amount: number, transferContent: string): string {
    const settings = this.getSettings();
    if (!settings.enabled || !settings.bankName || !settings.accountNumber || !settings.accountHolder) return '';

    const qrBankId = settings.bankBin || this.resolveBankQrId(settings.bankName);
    if (qrBankId) {
      return `https://img.vietqr.io/image/${qrBankId}-${encodeURIComponent(settings.accountNumber)}-compact2.png?amount=${Math.max(0, Math.round(amount))}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(settings.accountHolder)}`;
    }

    const fallbackPayload = [
      `Ngân hàng: ${settings.bankName}`,
      `Số TK: ${settings.accountNumber}`,
      `Chủ TK: ${settings.accountHolder}`,
      `Số tiền: ${Math.max(0, Math.round(amount))}`,
      `Nội dung: ${transferContent}`
    ].join('\n');
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(fallbackPayload)}`;
  }

  resolveBankQrId(bankName: string): string {
    const normalized = String(bankName || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');

    const bankMap: Array<{ keys: string[]; value: string }> = [
      { keys: ['vietcombank', 'vcb', 'ngoai thuong'], value: 'vietcombank' },
      { keys: ['vietinbank', 'ctg', 'cong thuong'], value: 'vietinbank' },
      { keys: ['bidv', 'dau tu va phat trien'], value: 'bidv' },
      { keys: ['agribank', 'nong nghiep'], value: 'agribank' },
      { keys: ['mbbank', 'mb bank', 'quan doi'], value: 'mbbank' },
      { keys: ['techcombank', 'ky thuong'], value: 'techcombank' },
      { keys: ['acb', 'a chau'], value: 'acb' },
      { keys: ['tpbank', 'tien phong'], value: 'tpbank' },
      { keys: ['sacombank', 'sai gon thuong tin'], value: 'sacombank' },
      { keys: ['vpbank', 'viet nam thinh vuong'], value: 'vpbank' },
      { keys: ['shb', 'sai gon ha noi'], value: 'shb' },
      { keys: ['hdbank', 'phat trien tphcm'], value: 'hdbank' },
      { keys: ['ocb', 'phuong dong'], value: 'ocb' },
      { keys: ['seabank', 'dong nam a'], value: 'seabank' }
    ];

    return bankMap.find((item) => item.keys.some((key) => normalized.includes(key)))?.value || '';
  }

  private normalize(value: any): AdminPaymentSettings {
    return {
      enabled: value?.enabled !== false,
      bankName: String(value?.bankName || '').trim(),
      bankBin: String(value?.bankBin || '').trim(),
      accountNumber: String(value?.accountNumber || '').trim(),
      accountHolder: String(value?.accountHolder || '').trim(),
      branchName: String(value?.branchName || '').trim() || null,
      note: String(value?.note || '').trim() || null,
      updatedAt: value?.updatedAt ? String(value.updatedAt) : null
    };
  }
}
