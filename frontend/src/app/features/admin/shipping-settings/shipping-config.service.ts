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

export type ShippingCarrier = 'GHTK_EXPRESS';

export type DeliveryZone = 'SAME_PROVINCE' | 'DIFFERENT_PROVINCE';

export type DeliveryMethod = 'ECONOMY' | 'FAST';

export interface DeliveryDistanceTier {
  minDistanceKm: number;
  maxDistanceKm: number;
  minDays: number;
  maxDays: number;
  fee: number;
}

export interface DeliveryPricingConfig {
  sameProvince: Record<DeliveryMethod, DeliveryDistanceTier[]>;
  differentProvince: Record<DeliveryMethod, DeliveryDistanceTier[]>;
}

export type ExpressOriginGroup = 'HN_HCM' | 'OTHER_32';

export type ExpressLane = 'NOI_TINH' | 'NOI_MIEN' | 'LIEN_MIEN_GAN' | 'LIEN_MIEN_XA' | 'DAC_BIET_TIEU_CHUAN' | 'DAC_BIET_NHANH';

export type WardType = 'PHUONG' | 'XA';

export interface ExpressLanePrice {
  baseFee: number;
  baseWeightKg: number;
  extraPerHalfKg: number;
}

export interface ExpressTemplateConfig {
  originGroup: ExpressOriginGroup;
  lanes: Record<ExpressLane, Record<WardType, ExpressLanePrice>>;
}

export interface ShippingCarrierConfig {
  carrier: ShippingCarrier;
  express: {
    hnHcm: ExpressTemplateConfig;
    other32: ExpressTemplateConfig;
  };
}

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
  private readonly SETTINGS_KEY_CAMEL = 'shippingSettings';
  private readonly DISTANCE_TEMPLATE_KEY = 'shipping_distance_template';
  private readonly CARRIER_CONFIG_KEY = 'shipping_carrier_config_v1';
  private readonly DELIVERY_PRICING_KEY = 'shipping_delivery_pricing_v1';
  private readonly LEGACY_DISTANCE_SHIPPINGS_KEY = 'distanceShippings';

  private shippingConfigsAfter$ = new BehaviorSubject<ProvinceShippingConfig[]>([]);
  private shippingConfigsBefore$ = new BehaviorSubject<ProvinceShippingConfig[]>([]);
  private distanceTemplate$ = new BehaviorSubject<DistanceConfig[]>([]);
  private carrierConfig$ = new BehaviorSubject<ShippingCarrierConfig>({
    carrier: 'GHTK_EXPRESS',
    express: {
      hnHcm: {
        originGroup: 'HN_HCM',
        lanes: {
          NOI_TINH: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } },
          NOI_MIEN: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } },
          LIEN_MIEN_GAN: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } },
          LIEN_MIEN_XA: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } },
          DAC_BIET_TIEU_CHUAN: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } },
          DAC_BIET_NHANH: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } }
        }
      },
      other32: {
        originGroup: 'OTHER_32',
        lanes: {
          NOI_TINH: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } },
          NOI_MIEN: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } },
          LIEN_MIEN_GAN: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } },
          LIEN_MIEN_XA: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } },
          DAC_BIET_TIEU_CHUAN: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } },
          DAC_BIET_NHANH: { PHUONG: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0, extraPerHalfKg: 0 } }
        }
      }
    }
  });
  private settings$ = new BehaviorSubject<ShippingSettings>({
    freeShippingThreshold: 500000,
    defaultFee: 30000,
    sameDayFee: 50000,
    expressFee: 40000,
    weekendFee: 10000,
    remoteFee: 20000
  });
  private deliveryPricing$ = new BehaviorSubject<DeliveryPricingConfig>({
    sameProvince: {
      ECONOMY: [{ minDistanceKm: 0, maxDistanceKm: 0, minDays: 0, maxDays: 0, fee: 0 }],
      FAST: [{ minDistanceKm: 0, maxDistanceKm: 0, minDays: 0, maxDays: 0, fee: 0 }]
    },
    differentProvince: {
      ECONOMY: [{ minDistanceKm: 0, maxDistanceKm: 0, minDays: 0, maxDays: 0, fee: 0 }],
      FAST: [{ minDistanceKm: 0, maxDistanceKm: 0, minDays: 0, maxDays: 0, fee: 0 }]
    }
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

  getCarrierConfig(): Observable<ShippingCarrierConfig> {
    return this.carrierConfig$.asObservable();
  }

  updateCarrierConfig(cfg: ShippingCarrierConfig): void {
    this.carrierConfig$.next(cfg);
    this.saveCarrierConfigToStorage();
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

  getDeliveryPricing(): Observable<DeliveryPricingConfig> {
    return this.deliveryPricing$.asObservable();
  }

  getDeliveryPricingSnapshot(): DeliveryPricingConfig {
    return JSON.parse(JSON.stringify(this.deliveryPricing$.value));
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

  updateDeliveryPricing(config: DeliveryPricingConfig): void {
    const normalized = this.normalizeDeliveryPricing(config);
    this.deliveryPricing$.next(normalized);
    this.saveDeliveryPricingToStorage();
  }

  normalizeProvinceName(value: unknown): string {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    const compact = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^thanh pho\s+/g, '')
      .replace(/^tp\.?\s*/g, '')
      .replace(/^tinh\s+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (compact === 'ho chi minh' || compact === 'hcm' || compact === 'sai gon') return 'ho chi minh';
    return compact;
  }

  isSameProvince(branchProvince: unknown, customerProvince: unknown): boolean {
    const a = this.normalizeProvinceName(branchProvince);
    const b = this.normalizeProvinceName(customerProvince);
    return !!a && !!b && a === b;
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

  private saveCarrierConfigToStorage(): void {
    try {
      localStorage.setItem(this.CARRIER_CONFIG_KEY, JSON.stringify(this.carrierConfig$.value));
    } catch {
      // ignore
    }
  }

  private saveDeliveryPricingToStorage(): void {
    try {
      localStorage.setItem(this.DELIVERY_PRICING_KEY, JSON.stringify(this.deliveryPricing$.value));
    } catch {
      // ignore
    }
  }

  private normalizeDeliveryDistanceTier(raw: any, fallback: DeliveryDistanceTier): DeliveryDistanceTier {
    const minDistanceKm = Number(raw?.minDistanceKm ?? raw?.minDistance ?? 0);
    const maxDistanceKm = Number(raw?.maxDistanceKm ?? raw?.distanceKm ?? raw?.maxDistance ?? 0);
    const minDays = Number(raw?.minDays);
    const maxDays = Number(raw?.maxDays);
    const fee = Number(raw?.fee);
    const safeMin = Number.isFinite(minDistanceKm) ? Math.max(0, minDistanceKm) : fallback.minDistanceKm;
    const safeMaxBase = Number.isFinite(maxDistanceKm) ? Math.max(0, maxDistanceKm) : fallback.maxDistanceKm;
    const safeMax = Math.max(safeMin, safeMaxBase);
    const safeMinDays = Number.isFinite(minDays) ? Math.max(0, Math.round(minDays)) : fallback.minDays;
    const safeMaxDays = Number.isFinite(maxDays) ? Math.max(0, Math.round(maxDays)) : fallback.maxDays;
    return {
      minDistanceKm: safeMin,
      maxDistanceKm: safeMax,
      minDays: Math.min(safeMinDays, safeMaxDays),
      maxDays: Math.max(safeMinDays, safeMaxDays),
      fee: Number.isFinite(fee) ? Math.max(0, fee) : fallback.fee
    };
  }

  private normalizeDeliveryTierList(raw: any, fallback: DeliveryDistanceTier[]): DeliveryDistanceTier[] {
    const baseFallback = fallback.length ? fallback : [{ minDistanceKm: 0, maxDistanceKm: 0, minDays: 0, maxDays: 0, fee: 0 }];
    const rows = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    const normalized = rows.map((row, index) => this.normalizeDeliveryDistanceTier(row, baseFallback[Math.min(index, baseFallback.length - 1)]));
    return (normalized.length ? normalized : baseFallback.map((row) => ({ ...row })))
      .sort((a, b) => a.minDistanceKm - b.minDistanceKm || a.maxDistanceKm - b.maxDistanceKm);
  }

  private normalizeDeliveryPricing(raw: any): DeliveryPricingConfig {
    const fallback = this.deliveryPricing$.value;
    return {
      sameProvince: {
        ECONOMY: this.normalizeDeliveryTierList(raw?.sameProvince?.ECONOMY, fallback.sameProvince.ECONOMY),
        FAST: this.normalizeDeliveryTierList(raw?.sameProvince?.FAST, fallback.sameProvince.FAST)
      },
      differentProvince: {
        ECONOMY: this.normalizeDeliveryTierList(raw?.differentProvince?.ECONOMY, fallback.differentProvince.ECONOMY),
        FAST: this.normalizeDeliveryTierList(raw?.differentProvince?.FAST, fallback.differentProvince.FAST)
      }
    };
  }

  private hasConfiguredDeliveryPricing(cfg: DeliveryPricingConfig | null | undefined): boolean {
    if (!cfg) return false;
    return (['sameProvince', 'differentProvince'] as const).some((zone) =>
      (['ECONOMY', 'FAST'] as const).some((method) =>
        (cfg[zone][method] || []).some((tier) =>
          Number(tier?.fee || 0) > 0 || Number(tier?.minDays || 0) > 0 || Number(tier?.maxDays || 0) > 0
        )
      )
    );
  }

  private buildLegacyFallbackPricing(): DeliveryPricingConfig | null {
    let settings: ShippingSettings | null = null;
    let distanceShippings: any[] = [];

    try {
      const rawSettings = localStorage.getItem(this.SETTINGS_KEY) || localStorage.getItem(this.SETTINGS_KEY_CAMEL);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed && typeof parsed === 'object') {
          settings = {
            freeShippingThreshold: Number(parsed.freeShippingThreshold ?? 500000) || 500000,
            defaultFee: Number(parsed.defaultFee ?? 30000) || 30000,
            sameDayFee: Number(parsed.sameDayFee ?? 50000) || 50000,
            expressFee: Number(parsed.expressFee ?? 40000) || 40000,
            weekendFee: Number(parsed.weekendFee ?? 10000) || 10000,
            remoteFee: Number(parsed.remoteFee ?? 20000) || 20000
          };
        }
      }
    } catch {
      settings = null;
    }

    try {
      const rawDistance = localStorage.getItem(this.LEGACY_DISTANCE_SHIPPINGS_KEY);
      if (rawDistance) {
        const parsed = JSON.parse(rawDistance);
        distanceShippings = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      distanceShippings = [];
    }

    if (!settings && distanceShippings.length === 0) {
      return null;
    }

    const safeSettings = settings || this.settings$.value;
    const baseEconomy = distanceShippings.length
      ? distanceShippings.map((row) => ({
          minDistanceKm: Math.max(0, Number(row?.minDistance ?? 0)),
          maxDistanceKm: Math.max(0, Number(row?.maxDistance ?? row?.minDistance ?? 0)),
          minDays: Math.max(0, Math.round(Number(row?.estimatedDays ?? 0))),
          maxDays: Math.max(0, Math.round(Number(row?.estimatedDays ?? 0))),
          fee: Math.max(0, Number(row?.fee ?? safeSettings.defaultFee ?? 0))
        }))
      : [{
          minDistanceKm: 0,
          maxDistanceKm: 9999,
          minDays: 2,
          maxDays: 3,
          fee: Math.max(0, Number(safeSettings.defaultFee || 0))
        }];

    const economySame = this.normalizeDeliveryTierList(baseEconomy, this.deliveryPricing$.value.sameProvince.ECONOMY);
    const economyDifferent = this.normalizeDeliveryTierList(
      baseEconomy.map((tier) => ({
        ...tier,
        fee: Math.max(Number(tier.fee || 0), Number(safeSettings.defaultFee || 0) + Number(safeSettings.remoteFee || 0))
      })),
      this.deliveryPricing$.value.differentProvince.ECONOMY
    );

    const fastSame = this.normalizeDeliveryTierList(
      baseEconomy.map((tier) => ({
        ...tier,
        minDays: 0,
        maxDays: Math.max(0, Math.min(Number(tier.maxDays || 0), 1)),
        fee: Math.max(Number(tier.fee || 0), Number(safeSettings.sameDayFee || safeSettings.expressFee || 0))
      })),
      this.deliveryPricing$.value.sameProvince.FAST
    );

    const fastDifferent = this.normalizeDeliveryTierList(
      baseEconomy.map((tier) => ({
        ...tier,
        minDays: 1,
        maxDays: Math.max(1, Math.min(Number(tier.maxDays || 0), 2)),
        fee: Math.max(
          Number(tier.fee || 0),
          Number(safeSettings.expressFee || 0),
          Number(safeSettings.defaultFee || 0) + Number(safeSettings.remoteFee || 0)
        )
      })),
      this.deliveryPricing$.value.differentProvince.FAST
    );

    return {
      sameProvince: {
        ECONOMY: economySame,
        FAST: fastSame
      },
      differentProvince: {
        ECONOMY: economyDifferent,
        FAST: fastDifferent
      }
    };
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

      const storedSettings = localStorage.getItem(this.SETTINGS_KEY) || localStorage.getItem(this.SETTINGS_KEY_CAMEL);
      if (storedSettings) {
        this.settings$.next(JSON.parse(storedSettings));
      }

      const storedTemplate = localStorage.getItem(this.DISTANCE_TEMPLATE_KEY);
      if (storedTemplate) {
        const parsedTpl = JSON.parse(storedTemplate);
        const normalizedTpl = Array.isArray(parsedTpl) ? parsedTpl.map((d: any) => this.normalizeDistanceConfig(d)) : [];
        this.distanceTemplate$.next(normalizedTpl);
      }

      const storedCarrier = localStorage.getItem(this.CARRIER_CONFIG_KEY);
      if (storedCarrier) {
        const parsed = JSON.parse(storedCarrier);
        if (parsed && typeof parsed === 'object') {
          this.carrierConfig$.next(parsed as ShippingCarrierConfig);
        }
      } else {
        this.saveCarrierConfigToStorage();
      }

      const storedDeliveryPricing = localStorage.getItem(this.DELIVERY_PRICING_KEY);
      if (storedDeliveryPricing) {
        const parsed = JSON.parse(storedDeliveryPricing);
        const normalized = this.normalizeDeliveryPricing(parsed);
        if (this.hasConfiguredDeliveryPricing(normalized)) {
          this.deliveryPricing$.next(normalized);
        } else {
          const legacyFallback = this.buildLegacyFallbackPricing();
          this.deliveryPricing$.next(legacyFallback || normalized);
          if (legacyFallback) this.saveDeliveryPricingToStorage();
        }
      } else {
        const legacyFallback = this.buildLegacyFallbackPricing();
        if (legacyFallback) {
          this.deliveryPricing$.next(legacyFallback);
        }
        this.saveDeliveryPricingToStorage();
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
