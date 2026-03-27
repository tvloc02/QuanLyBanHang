import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  ShippingConfigService, 
  ShippingCarrierConfig,
  ExpressOriginGroup,
  ExpressLane,
  WardType
} from './shipping-config.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-shipping-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-shipping-settings.component.html',
  styleUrls: ['./admin-shipping-settings.component.scss']
})
export class AdminShippingSettingsComponent implements OnInit, OnDestroy {
  private readonly subs = new Subscription();

  private readonly SAMPLE: ShippingCarrierConfig = {
    carrier: 'GHTK_EXPRESS',
    express: {
      hnHcm: {
        originGroup: 'HN_HCM',
        lanes: {
          NOI_TINH: { PHUONG: { baseFee: 22000, baseWeightKg: 3, extraPerHalfKg: 2500 }, XA: { baseFee: 30000, baseWeightKg: 3, extraPerHalfKg: 2500 } },
          NOI_MIEN: { PHUONG: { baseFee: 30000, baseWeightKg: 0.5, extraPerHalfKg: 2500 }, XA: { baseFee: 35000, baseWeightKg: 0.5, extraPerHalfKg: 2500 } },
          LIEN_MIEN_GAN: { PHUONG: { baseFee: 30000, baseWeightKg: 0.5, extraPerHalfKg: 5000 }, XA: { baseFee: 37000, baseWeightKg: 0.5, extraPerHalfKg: 5000 } },
          LIEN_MIEN_XA: { PHUONG: { baseFee: 32000, baseWeightKg: 0.5, extraPerHalfKg: 5000 }, XA: { baseFee: 40000, baseWeightKg: 0.5, extraPerHalfKg: 5000 } },
          DAC_BIET_TIEU_CHUAN: { PHUONG: { baseFee: 30000, baseWeightKg: 0.5, extraPerHalfKg: 5000 }, XA: { baseFee: 40000, baseWeightKg: 0.5, extraPerHalfKg: 5000 } },
          DAC_BIET_NHANH: { PHUONG: { baseFee: 40000, baseWeightKg: 0.5, extraPerHalfKg: 10000 }, XA: { baseFee: 50000, baseWeightKg: 0.5, extraPerHalfKg: 10000 } }
        }
      },
      other32: {
        originGroup: 'OTHER_32',
        lanes: {
          NOI_TINH: { PHUONG: { baseFee: 30000, baseWeightKg: 3, extraPerHalfKg: 2500 }, XA: { baseFee: 30000, baseWeightKg: 3, extraPerHalfKg: 2500 } },
          NOI_MIEN: { PHUONG: { baseFee: 30000, baseWeightKg: 0.5, extraPerHalfKg: 2500 }, XA: { baseFee: 35000, baseWeightKg: 0.5, extraPerHalfKg: 2500 } },
          LIEN_MIEN_GAN: { PHUONG: { baseFee: 30000, baseWeightKg: 0.5, extraPerHalfKg: 5000 }, XA: { baseFee: 37000, baseWeightKg: 0.5, extraPerHalfKg: 5000 } },
          LIEN_MIEN_XA: { PHUONG: { baseFee: 32000, baseWeightKg: 0.5, extraPerHalfKg: 5000 }, XA: { baseFee: 40000, baseWeightKg: 0.5, extraPerHalfKg: 5000 } },
          DAC_BIET_TIEU_CHUAN: { PHUONG: { baseFee: 0, baseWeightKg: 0.5, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0.5, extraPerHalfKg: 0 } },
          DAC_BIET_NHANH: { PHUONG: { baseFee: 0, baseWeightKg: 0.5, extraPerHalfKg: 0 }, XA: { baseFee: 0, baseWeightKg: 0.5, extraPerHalfKg: 0 } }
        }
      }
    }
  };

  carrierConfig: ShippingCarrierConfig | null = null;
  carrierSaving = false;

  readonly carrierOptions: Array<{ value: ShippingCarrierConfig['carrier']; label: string }> = [
    { value: 'GHTK_EXPRESS', label: 'GHTK Express' }
  ];

  readonly expressLaneMeta: Array<{ lane: ExpressLane; label: string; hint: string }> = [
    { lane: 'NOI_TINH', label: 'Nội tỉnh', hint: 'Áp dụng nội tỉnh (HN hoặc TP.HCM / hoặc tỉnh thường)' },
    { lane: 'NOI_MIEN', label: 'Nội miền', hint: 'MB→MB / MT→MT / MN→MN' },
    { lane: 'LIEN_MIEN_GAN', label: 'Liên miền gần (2)', hint: 'Theo bảng giá Express' },
    { lane: 'LIEN_MIEN_XA', label: 'Liên miền xa (3)', hint: 'Theo bảng giá Express' },
    { lane: 'DAC_BIET_TIEU_CHUAN', label: 'Đặc biệt - Tiêu chuẩn (4)', hint: 'HN↔TP.HCM / HN→Đà Nẵng / HCM→Đà Nẵng' },
    { lane: 'DAC_BIET_NHANH', label: 'Đặc biệt - Nhanh (5)', hint: 'HN↔TP.HCM / HN→Đà Nẵng / HCM→Đà Nẵng' }
  ];

  readonly wardTypeMeta: Array<{ type: WardType; label: string }> = [
    { type: 'PHUONG', label: 'Phường' },
    { type: 'XA', label: 'Xã' }
  ];

  constructor(private shippingService: ShippingConfigService) {}

  ngOnInit(): void {
    this.subs.add(
      this.shippingService.getCarrierConfig().subscribe(cfg => {
        this.carrierConfig = cfg ? JSON.parse(JSON.stringify(cfg)) : null;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private ensureCarrierConfig(): ShippingCarrierConfig {
    const cfg = this.carrierConfig;
    if (cfg) return cfg;
    const fallback: ShippingCarrierConfig = {
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
    };
    this.carrierConfig = fallback;
    return fallback;
  }

  onCarrierChanged(value: ShippingCarrierConfig['carrier']): void {
    const cfg = this.ensureCarrierConfig();
    cfg.carrier = value;
  }

  getExpressPrice(origin: ExpressOriginGroup, lane: ExpressLane, wardType: WardType, field: 'baseFee' | 'baseWeightKg' | 'extraPerHalfKg'): number | null {
    const cfg = this.ensureCarrierConfig();
    const tpl = origin === 'HN_HCM' ? cfg.express.hnHcm : cfg.express.other32;
    const v = (tpl?.lanes as any)?.[lane]?.[wardType]?.[field];
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n === 0 ? null : n;
  }

  getExpressPlaceholder(origin: ExpressOriginGroup, lane: ExpressLane, wardType: WardType, field: 'baseFee' | 'baseWeightKg' | 'extraPerHalfKg'): number {
    const tpl = origin === 'HN_HCM' ? this.SAMPLE.express.hnHcm : this.SAMPLE.express.other32;
    const v = (tpl?.lanes as any)?.[lane]?.[wardType]?.[field];
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  setExpressPrice(origin: ExpressOriginGroup, lane: ExpressLane, wardType: WardType, field: 'baseFee' | 'baseWeightKg' | 'extraPerHalfKg', value: unknown): void {
    const cfg = this.ensureCarrierConfig();
    const tpl = origin === 'HN_HCM' ? cfg.express.hnHcm : cfg.express.other32;
    const n = Number(value);
    const safe = Number.isFinite(n) ? Math.max(0, n) : 0;
    (tpl.lanes as any)[lane] = (tpl.lanes as any)[lane] || {};
    (tpl.lanes as any)[lane][wardType] = (tpl.lanes as any)[lane][wardType] || { baseFee: 0, baseWeightKg: 0.5, extraPerHalfKg: 0 };
    (tpl.lanes as any)[lane][wardType][field] = safe;
  }

  saveCarrierConfig(): void {
    if (this.carrierSaving) return;
    const cfg = this.ensureCarrierConfig();
    this.carrierSaving = true;
    try {
      this.shippingService.updateCarrierConfig(cfg);
      alert('Đã lưu bảng giá vận chuyển.');
    } finally {
      this.carrierSaving = false;
    }
  }
}
