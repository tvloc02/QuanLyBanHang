import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AdminBranchResponse, AdminDataService } from '../../../core/services/admin-data.service';
import {
  DeliveryDistanceTier,
  DeliveryMethod,
  DeliveryPricingConfig,
  DeliveryZone,
  ShippingConfigService
} from './shipping-config.service';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Component({
  selector: 'app-admin-shipping-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-shipping-settings.component.html',
  styleUrls: ['./admin-shipping-settings.component.scss']
})
export class AdminShippingSettingsComponent implements OnInit, OnDestroy {
  private readonly subs = new Subscription();

  deliveryPricing: DeliveryPricingConfig | null = null;
  saving = false;
  branchesLoading = false;
  branchesError = '';
  branches: AdminBranchResponse[] = [];

  readonly zoneMeta: Array<{ zone: DeliveryZone; key: keyof DeliveryPricingConfig; label: string; description: string }> = [
    {
      zone: 'SAME_PROVINCE',
      key: 'sameProvince',
      label: 'Khách cùng tỉnh với chi nhánh',
      description: 'Áp dụng khi tỉnh/thành của địa chỉ giao hàng trùng tỉnh/thành của kho chi nhánh.'
    },
    {
      zone: 'DIFFERENT_PROVINCE',
      key: 'differentProvince',
      label: 'Khách khác tỉnh với chi nhánh',
      description: 'Áp dụng khi địa chỉ giao hàng và chi nhánh ở khác tỉnh/thành.'
    }
  ];

  readonly methodMeta: Array<{ method: DeliveryMethod; label: string; badge: string }> = [
    { method: 'ECONOMY', label: 'Giao tiết kiệm', badge: 'Tiết kiệm' },
    { method: 'FAST', label: 'Giao nhanh', badge: 'Nhanh' }
  ];

  constructor(
    private shippingService: ShippingConfigService,
    private adminData: AdminDataService
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.shippingService.getDeliveryPricing().subscribe((cfg) => {
        this.deliveryPricing = JSON.parse(JSON.stringify(cfg));
      })
    );
    this.loadBranches();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private loadBranches(): void {
    this.branchesLoading = true;
    this.branchesError = '';
    this.adminData.getBranches().subscribe({
      next: (res: ApiResponse<AdminBranchResponse[]>) => {
        this.branchesLoading = false;
        this.branches = res?.success && Array.isArray(res.data) ? res.data : [];
      },
      error: () => {
        this.branchesLoading = false;
        this.branches = [];
        this.branchesError = 'Không tải được danh sách chi nhánh để đối chiếu địa chỉ giao hàng.';
      }
    });
  }

  get configuredBranchCount(): number {
    return this.branches.filter((branch) => this.hasBranchAddress(branch)).length;
  }

  get geoReadyBranchCount(): number {
    return this.branches.filter((branch) => this.hasBranchCoordinates(branch)).length;
  }

  getZoneConfig(zone: keyof DeliveryPricingConfig): Record<DeliveryMethod, DeliveryDistanceTier[]> {
    return this.ensurePricing()[zone];
  }

  getMethodTiers(zone: keyof DeliveryPricingConfig, method: DeliveryMethod): DeliveryDistanceTier[] {
    return this.getZoneConfig(zone)[method];
  }

  addTier(zone: keyof DeliveryPricingConfig, method: DeliveryMethod): void {
    const tiers = this.getMethodTiers(zone, method);
    const last = tiers[tiers.length - 1] || { minDistanceKm: 0, maxDistanceKm: 0, minDays: 0, maxDays: 0, fee: 0 };
    const nextMin = Math.max(0, Number(last.maxDistanceKm || 0));
    tiers.push({
      minDistanceKm: nextMin,
      maxDistanceKm: nextMin + 100,
      minDays: Math.max(0, Number(last.minDays || 0)),
      maxDays: Math.max(0, Number(last.maxDays || last.minDays || 0)),
      fee: Math.max(0, Number(last.fee || 0))
    });
  }

  removeTier(zone: keyof DeliveryPricingConfig, method: DeliveryMethod, index: number): void {
    const tiers = this.getMethodTiers(zone, method);
    if (tiers.length <= 1) return;
    tiers.splice(index, 1);
  }

  updateTierField(
    zone: keyof DeliveryPricingConfig,
    method: DeliveryMethod,
    index: number,
    field: keyof DeliveryDistanceTier,
    value: unknown
  ): void {
    const tiers = this.getMethodTiers(zone, method);
    const tier = tiers[index];
    if (!tier) return;
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? Math.max(0, field === 'fee' || field === 'minDistanceKm' || field === 'maxDistanceKm' ? parsed : Math.round(parsed)) : 0;
    (tier as any)[field] = safe;
    if (field === 'minDistanceKm' && tier.maxDistanceKm < tier.minDistanceKm) {
      tier.maxDistanceKm = tier.minDistanceKm;
    }
    if (field === 'maxDistanceKm' && tier.minDistanceKm > tier.maxDistanceKm) {
      tier.minDistanceKm = tier.maxDistanceKm;
    }
    if (field === 'minDays' && tier.maxDays < tier.minDays) {
      tier.maxDays = tier.minDays;
    }
    if (field === 'maxDays' && tier.minDays > tier.maxDays) {
      tier.minDays = tier.maxDays;
    }
  }

  save(): void {
    if (this.saving) return;
    this.saving = true;
    try {
      this.shippingService.updateDeliveryPricing(this.ensurePricing());
      alert('Đã lưu cấu hình phí vận chuyển cho trang giỏ hàng.');
    } finally {
      this.saving = false;
    }
  }

  hasBranchAddress(branch: AdminBranchResponse | null | undefined): boolean {
    if (!branch) return false;
    return !![
      branch.address,
      branch.ward,
      branch.district,
      branch.province
    ].find((value) => String(value || '').trim());
  }

  hasBranchCoordinates(branch: AdminBranchResponse | null | undefined): boolean {
    if (!branch) return false;
    return typeof branch.latitude === 'number' && typeof branch.longitude === 'number';
  }

  formatBranchAddress(branch: AdminBranchResponse | null | undefined): string {
    if (!branch) return '-';
    const parts = [branch.address, branch.ward, branch.district, branch.province]
      .map((value) => String(value || '').trim())
      .filter((value) => !!value);
    return parts.length ? parts.join(', ') : 'Chưa khai báo địa chỉ';
  }

  private ensurePricing(): DeliveryPricingConfig {
    if (this.deliveryPricing) return this.deliveryPricing;
    this.deliveryPricing = this.shippingService.getDeliveryPricingSnapshot();
    return this.deliveryPricing;
  }
}
