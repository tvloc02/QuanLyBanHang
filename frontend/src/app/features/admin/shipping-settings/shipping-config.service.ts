import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ProvinceShippingConfig {
  province: string;
  provinceBefore?: string; // Tên tỉnh trước sáp nhập
  distanceConfigs: DistanceConfig[];
}

export interface ProvinceInfo {
  currentName: string; // Tên hiện tại
  beforeMerge?: string; // Tên trước sáp nhập
  status: 'merged' | 'unchanged'; // Đã sáp nhập hay không
}

export interface DistanceConfig {
  minDistance: number;
  maxDistance: number;
  fee: number;
  shippingMethod: ShippingMethod;
}

export type ShippingMethod = 'FAST' | 'ECONOMY' | 'EXPRESS';

export type ProvinceConfigMode = 'before' | 'after';

export interface ShippingSettings {
  freeShippingThreshold: number;
  defaultFee: number;
  sameDayFee: number;
  expressFee: number;
  weekendFee: number;
  remoteFee: number;
}

@Injectable({
  providedIn: 'root'
})
export class ShippingConfigService {
  private readonly STORAGE_KEY_LEGACY = 'shipping_configs';
  private readonly STORAGE_KEY_AFTER = 'shipping_configs_after';
  private readonly STORAGE_KEY_BEFORE = 'shipping_configs_before';
  private readonly SETTINGS_KEY = 'shipping_settings';
  private readonly DISTANCE_TEMPLATE_KEY = 'shipping_distance_template';

  private shippingConfigsAfter$ = new BehaviorSubject<ProvinceShippingConfig[]>([]);
  private shippingConfigsBefore$ = new BehaviorSubject<ProvinceShippingConfig[]>([]);
  private distanceTemplate$ = new BehaviorSubject<DistanceConfig[]>([]);
  private settings$ = new BehaviorSubject<ShippingSettings>({
    freeShippingThreshold: 500000,
    defaultFee: 30000,
    sameDayFee: 50000,
    expressFee: 40000,
    weekendFee: 10000,
    remoteFee: 20000
  });

  // Danh sách 63 tỉnh thành Việt Nam với thông tin sáp nhập
  private readonly provincesInfo: ProvinceInfo[] = [
    // Các tỉnh đã sáp nhập
    { currentName: 'Hà Nội', beforeMerge: 'Hà Tây', status: 'merged' },
    { currentName: 'Đà Nẵng', beforeMerge: 'Quảng Nam', status: 'merged' },
    { currentName: 'Hải Phòng', beforeMerge: 'Hải Dương', status: 'merged' },
    { currentName: 'Cần Thơ', beforeMerge: 'Cần Thơ', status: 'unchanged' },
    
    // Các tỉnh còn lại (giữ nguyên tên)
    { currentName: 'An Giang', status: 'unchanged' },
    { currentName: 'Bà Rịa - Vũng Tàu', status: 'unchanged' },
    { currentName: 'Bắc Giang', status: 'unchanged' },
    { currentName: 'Bắc Kạn', status: 'unchanged' },
    { currentName: 'Bạc Liêu', status: 'unchanged' },
    { currentName: 'Bắc Ninh', status: 'unchanged' },
    { currentName: 'Bến Tre', status: 'unchanged' },
    { currentName: 'Bình Định', status: 'unchanged' },
    { currentName: 'Bình Dương', status: 'unchanged' },
    { currentName: 'Bình Phước', status: 'unchanged' },
    { currentName: 'Bình Thuận', status: 'unchanged' },
    { currentName: 'Cà Mau', status: 'unchanged' },
    { currentName: 'Cao Bằng', status: 'unchanged' },
    { currentName: 'Đắk Lắk', status: 'unchanged' },
    { currentName: 'Đắk Nông', status: 'unchanged' },
    { currentName: 'Điện Biên', status: 'unchanged' },
    { currentName: 'Đồng Nai', status: 'unchanged' },
    { currentName: 'Đồng Tháp', status: 'unchanged' },
    { currentName: 'Gia Lai', status: 'unchanged' },
    { currentName: 'Hà Giang', status: 'unchanged' },
    { currentName: 'Hà Nam', status: 'unchanged' },
    { currentName: 'Hà Tĩnh', status: 'unchanged' },
    { currentName: 'Hải Dương', status: 'unchanged' },
    { currentName: 'Hậu Giang', status: 'unchanged' },
    { currentName: 'Hòa Bình', status: 'unchanged' },
    { currentName: 'Hưng Yên', status: 'unchanged' },
    { currentName: 'Khánh Hòa', status: 'unchanged' },
    { currentName: 'Kiên Giang', status: 'unchanged' },
    { currentName: 'Kon Tum', status: 'unchanged' },
    { currentName: 'Lai Châu', status: 'unchanged' },
    { currentName: 'Lâm Đồng', status: 'unchanged' },
    { currentName: 'Lạng Sơn', status: 'unchanged' },
    { currentName: 'Lào Cai', status: 'unchanged' },
    { currentName: 'Long An', status: 'unchanged' },
    { currentName: 'Nam Định', status: 'unchanged' },
    { currentName: 'Nghệ An', status: 'unchanged' },
    { currentName: 'Ninh Bình', status: 'unchanged' },
    { currentName: 'Ninh Thuận', status: 'unchanged' },
    { currentName: 'Phú Thọ', status: 'unchanged' },
    { currentName: 'Phú Yên', status: 'unchanged' },
    { currentName: 'Quảng Bình', status: 'unchanged' },
    { currentName: 'Quảng Nam', status: 'unchanged' },
    { currentName: 'Quảng Ngãi', status: 'unchanged' },
    { currentName: 'Quảng Ninh', status: 'unchanged' },
    { currentName: 'Quảng Trị', status: 'unchanged' },
    { currentName: 'Sóc Trăng', status: 'unchanged' },
    { currentName: 'Sơn La', status: 'unchanged' },
    { currentName: 'Tây Ninh', status: 'unchanged' },
    { currentName: 'Thái Bình', status: 'unchanged' },
    { currentName: 'Thái Nguyên', status: 'unchanged' },
    { currentName: 'Thanh Hóa', status: 'unchanged' },
    { currentName: 'Thừa Thiên Huế', status: 'unchanged' },
    { currentName: 'Tiền Giang', status: 'unchanged' },
    { currentName: 'TP.HCM', status: 'unchanged' },
    { currentName: 'Trà Vinh', status: 'unchanged' },
    { currentName: 'Tuyên Quang', status: 'unchanged' },
    { currentName: 'Vĩnh Long', status: 'unchanged' },
    { currentName: 'Vĩnh Phúc', status: 'unchanged' },
    { currentName: 'Yên Bái', status: 'unchanged' }
  ];

  constructor() {
    this.loadFromStorage();
  }

  private normalizeShippingMethod(value: any): ShippingMethod {
    const v = (value ?? '').toString().trim().toUpperCase();
    if (v === 'FAST' || v === 'NHANH' || v === 'GIAO HANG NHANH' || v === 'GIAO_HANG_NHANH') return 'FAST';
    if (v === 'EXPRESS' || v === 'HOA TOC' || v === 'HỎA TỐC' || v === 'GIAO HANG HOA TOC' || v === 'GIAO_HANG_HOA_TOC') return 'EXPRESS';
    return 'ECONOMY';
  }

  private normalizeDistanceConfig(raw: any): DistanceConfig {
    return {
      minDistance: Number(raw?.minDistance ?? 0),
      maxDistance: Number(raw?.maxDistance ?? 0),
      fee: Number(raw?.fee ?? 0),
      shippingMethod: this.normalizeShippingMethod(raw?.shippingMethod ?? raw?.estimatedDays)
    };
  }

  private normalizeProvinceConfig(raw: any): ProvinceShippingConfig {
    return {
      province: raw?.province,
      provinceBefore: raw?.provinceBefore,
      distanceConfigs: Array.isArray(raw?.distanceConfigs) ? raw.distanceConfigs.map((d: any) => this.normalizeDistanceConfig(d)) : []
    };
  }

  // Getters
  getShippingConfigs(mode: ProvinceConfigMode = 'after'): Observable<ProvinceShippingConfig[]> {
    return (mode === 'before' ? this.shippingConfigsBefore$ : this.shippingConfigsAfter$).asObservable();
  }

  getShippingConfigsAfter(): Observable<ProvinceShippingConfig[]> {
    return this.shippingConfigsAfter$.asObservable();
  }

  getShippingConfigsBefore(): Observable<ProvinceShippingConfig[]> {
    return this.shippingConfigsBefore$.asObservable();
  }

  getSettings(): Observable<ShippingSettings> {
    return this.settings$.asObservable();
  }

  getDistanceTemplate(): Observable<DistanceConfig[]> {
    return this.distanceTemplate$.asObservable();
  }

  getProvinces(): string[] {
    return this.provincesInfo.map(p => p.currentName);
  }

  getProvincesInfo(): ProvinceInfo[] {
    return this.provincesInfo;
  }

  // CRUD operations
  addProvinceConfig(config: ProvinceShippingConfig, mode: ProvinceConfigMode = 'after'): void {
    const subject = mode === 'before' ? this.shippingConfigsBefore$ : this.shippingConfigsAfter$;
    const current = subject.value;
    const existingIndex = current.findIndex(c => c.province === config.province);
    
    if (existingIndex >= 0) {
      current[existingIndex] = config;
    } else {
      current.push(config);
    }
    
    subject.next(current);
    this.saveConfigsToStorage(mode);
  }

  updateProvinceConfig(province: string, config: ProvinceShippingConfig, mode: ProvinceConfigMode = 'after'): void {
    const subject = mode === 'before' ? this.shippingConfigsBefore$ : this.shippingConfigsAfter$;
    const current = subject.value;
    const index = current.findIndex(c => c.province === province);
    
    if (index >= 0) {
      current[index] = config;
      subject.next(current);
      this.saveConfigsToStorage(mode);
    }
  }

  deleteProvinceConfig(province: string, mode: ProvinceConfigMode = 'after'): void {
    const subject = mode === 'before' ? this.shippingConfigsBefore$ : this.shippingConfigsAfter$;
    const current = subject.value;
    const filtered = current.filter(c => c.province !== province);
    subject.next(filtered);
    this.saveConfigsToStorage(mode);
  }

  getProvinceConfig(province: string, mode: ProvinceConfigMode = 'after'): ProvinceShippingConfig | null {
    const current = (mode === 'before' ? this.shippingConfigsBefore$ : this.shippingConfigsAfter$).value;
    return current.find(c => c.province === province) || null;
  }

  // Settings operations
  updateSettings(settings: ShippingSettings): void {
    this.settings$.next(settings);
    this.saveSettingsToStorage();
  }

  updateDistanceTemplate(template: DistanceConfig[]): void {
    this.distanceTemplate$.next(template);
    this.saveDistanceTemplateToStorage();
  }

  // Calculate shipping fee
  calculateShippingFee(province: string, distance: number): number {
    const config = this.getProvinceConfig(province, 'after');
    if (!config) {
      return this.settings$.value.defaultFee;
    }

    const distanceConfig = config.distanceConfigs.find(
      d => distance >= d.minDistance && distance <= d.maxDistance
    );

    return distanceConfig ? distanceConfig.fee : this.settings$.value.defaultFee;
  }

  // Import/Export
  exportToCSV(): string {
    const configs = this.shippingConfigsAfter$.value;
    const settings = this.settings$.value;
    
    let csv = 'Province,Min Distance (km),Max Distance (km),Fee (VND),Shipping Method\n';
    
    configs.forEach(config => {
      config.distanceConfigs.forEach(distance => {
        csv += `"${config.province}",${distance.minDistance},${distance.maxDistance},${distance.fee},${distance.shippingMethod}\n`;
      });
    });

    // Add settings
    csv += '\nSettings\n';
    csv += `Free Shipping Threshold,${settings.freeShippingThreshold}\n`;
    csv += `Default Fee,${settings.defaultFee}\n`;
    csv += `Same Day Fee,${settings.sameDayFee}\n`;
    csv += `Express Fee,${settings.expressFee}\n`;
    csv += `Weekend Fee,${settings.weekendFee}\n`;
    csv += `Remote Fee,${settings.remoteFee}\n`;

    return csv;
  }

  private saveDistanceTemplateToStorage(): void {
    try {
      localStorage.setItem(this.DISTANCE_TEMPLATE_KEY, JSON.stringify(this.distanceTemplate$.value));
    } catch {
      // ignore
    }
  }

  importFromCSV(csvData: string): { success: boolean; message: string; imported: number } {
    try {
      const lines = csvData.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return { success: false, message: 'File CSV không hợp lệ', imported: 0 };
      }

      const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const provinceIndex = header.findIndex(h => h.toLowerCase().includes('province'));
      const minDistIndex = header.findIndex(h => h.toLowerCase().includes('min distance'));
      const maxDistIndex = header.findIndex(h => h.toLowerCase().includes('max distance'));
      const feeIndex = header.findIndex(h => h.toLowerCase().includes('fee'));
      const methodIndex = header.findIndex(h => h.toLowerCase().includes('shipping method'));
      const daysIndex = header.findIndex(h => h.toLowerCase().includes('estimated'));

      if (provinceIndex === -1 || minDistIndex === -1 || maxDistIndex === -1 || feeIndex === -1) {
        return { success: false, message: 'Thiếu các cột bắt buộc trong CSV', imported: 0 };
      }

      const importedConfigs: { [key: string]: ProvinceShippingConfig } = {};
      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        if (values.length < 4) continue;

        const province = values[provinceIndex];
        const minDistance = parseFloat(values[minDistIndex]) || 0;
        const maxDistance = parseFloat(values[maxDistIndex]) || 0;
        const fee = parseFloat(values[feeIndex]) || 0;
        const rawMethod = methodIndex >= 0 ? values[methodIndex] : (daysIndex >= 0 ? values[daysIndex] : 'ECONOMY');
        const shippingMethod = this.normalizeShippingMethod(rawMethod);

        if (!province) continue;

        if (!importedConfigs[province]) {
          importedConfigs[province] = {
            province,
            distanceConfigs: []
          };
        }

        importedConfigs[province].distanceConfigs.push({
          minDistance,
          maxDistance,
          fee,
          shippingMethod
        });

        importedCount++;
      }

      // Merge with existing configs
      Object.values(importedConfigs).forEach(config => {
        this.addProvinceConfig(config, 'after');
      });

      return { 
        success: true, 
        message: `Đã import thành công ${importedCount} cấu hình`, 
        imported: importedCount 
      };

    } catch (error) {
      return { 
        success: false, 
        message: 'Lỗi khi đọc file CSV: ' + (error as Error).message, 
        imported: 0 
      };
    }
  }

  // Storage operations
  private saveConfigsToStorage(mode: ProvinceConfigMode = 'after'): void {
    const key = mode === 'before' ? this.STORAGE_KEY_BEFORE : this.STORAGE_KEY_AFTER;
    const subject = mode === 'before' ? this.shippingConfigsBefore$ : this.shippingConfigsAfter$;
    localStorage.setItem(key, JSON.stringify(subject.value));
  }

  private saveSettingsToStorage(): void {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.settings$.value));
  }

  private loadFromStorage(): void {
    try {
      const storedAfter = localStorage.getItem(this.STORAGE_KEY_AFTER);
      if (storedAfter) {
        const parsed = JSON.parse(storedAfter);
        const normalized = Array.isArray(parsed) ? parsed.map((c: any) => this.normalizeProvinceConfig(c)) : [];
        this.shippingConfigsAfter$.next(normalized);
      }

      const storedBefore = localStorage.getItem(this.STORAGE_KEY_BEFORE);
      if (storedBefore) {
        const parsed = JSON.parse(storedBefore);
        const normalized = Array.isArray(parsed) ? parsed.map((c: any) => this.normalizeProvinceConfig(c)) : [];
        this.shippingConfigsBefore$.next(normalized);
      }

      // Backward-compat: legacy key -> after
      if (!storedAfter) {
        const legacy = localStorage.getItem(this.STORAGE_KEY_LEGACY);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          const normalized = Array.isArray(parsed) ? parsed.map((c: any) => this.normalizeProvinceConfig(c)) : [];
          this.shippingConfigsAfter$.next(normalized);
          this.saveConfigsToStorage('after');
        } else {
          this.initializeDefaultData();
        }
      }

      const storedSettings = localStorage.getItem(this.SETTINGS_KEY);
      if (storedSettings) {
        this.settings$.next(JSON.parse(storedSettings));
      }

      const storedTemplate = localStorage.getItem(this.DISTANCE_TEMPLATE_KEY);
      if (storedTemplate) {
        const parsedTpl = JSON.parse(storedTemplate);
        const normalizedTpl = Array.isArray(parsedTpl) ? parsedTpl.map((d: any) => this.normalizeDistanceConfig(d)) : [];
        this.distanceTemplate$.next(normalizedTpl);
      }
    } catch (error) {
      console.error('Error loading shipping config from storage:', error);
    }
  }

  private initializeDefaultData(): void {
    // Không tạo mock data, để trống để admin tự cấu hình
    this.shippingConfigsAfter$.next([]);
    this.shippingConfigsBefore$.next([]);
    this.saveConfigsToStorage('after');
    this.saveConfigsToStorage('before');
  }
}
