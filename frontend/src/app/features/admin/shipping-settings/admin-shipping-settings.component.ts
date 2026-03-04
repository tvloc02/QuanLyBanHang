import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  ShippingConfigService, 
  ProvinceInfo, 
  ProvinceShippingConfig, 
  DistanceConfig, 
  ShippingMethod,
  ShippingSettings
} from './shipping-config.service';
import { LocationService } from '../../../core/services/location.service';

import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-shipping-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-shipping-settings.component.html',
  styleUrls: ['./admin-shipping-settings.component.scss']
})
export class AdminShippingSettingsComponent implements OnInit {
  
  // Data
  shippingConfigs: ProvinceShippingConfig[] = [];
  settings: ShippingSettings;
  provincesInfo: ProvinceInfo[] = [];
  provinceConfigs: ProvinceShippingConfig[] = [];
  
  // Form data
  selectedProvince: ProvinceInfo | null = null;
  editingConfig: ProvinceShippingConfig | null = null;
  newDistanceConfig: DistanceConfig = {
    minDistance: 0,
    maxDistance: 0,
    fee: 0,
    shippingMethod: 'ECONOMY'
  };
  
  // Import/Export
  importStatus: { success: boolean; message: string; imported?: number } | null = null;
  isImporting = false;
  
  // UI state
  showAddDistanceForm = false;
  editingDistanceIndex: number | null = null;
  expandedProvinces: Set<string> = new Set();
  searchTerm = '';
  statusFilter = 'ALL';
  filteredProvinces: ProvinceInfo[] = [];
  nameMode: 'after' | 'before' = 'after';
  isConfigModalOpen = false;
  isSyncModalOpen = false;
  isFormulaModalOpen = false;
  formulaIntraProvince = '';
  formulaInterProvince = '';
  distanceTemplate: DistanceConfig[] = [];
  loading = false;
  isSaving = false;

  readonly shippingMethodOptions: Array<{ value: ShippingMethod; label: string }> = [
    { value: 'FAST', label: 'Giao hàng nhanh' },
    { value: 'ECONOMY', label: 'Giao hàng tiết kiệm' },
    { value: 'EXPRESS', label: 'Hỏa tốc' }
  ];

  constructor(
    private shippingService: ShippingConfigService,
    private locations: LocationService
  ) {
    this.settings = {
      freeShippingThreshold: 500000,
      defaultFee: 30000,
      sameDayFee: 50000,
      expressFee: 40000,
      weekendFee: 10000,
      remoteFee: 20000
    };
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  ngOnInit(): void {
    this.loadData();
    this.shippingService.getDistanceTemplate().subscribe(template => {
      this.distanceTemplate = (template || []).slice().sort((a, b) => a.minDistance - b.minDistance);
      this.ensureAllProvinceConfigsMatchTemplate();
    });
  }

  loadData(): void {
    this.loading = true;
    this.loadConfigsByMode(this.nameMode);
    this.loadProvincesByMode(this.nameMode);
  }

  private getCurrentConfigMode(): 'before' | 'after' {
    return this.nameMode === 'before' ? 'before' : 'after';
  }

  private loadConfigsByMode(mode: 'after' | 'before'): void {
    this.shippingService.getShippingConfigs(mode === 'before' ? 'before' : 'after').subscribe(configs => {
      this.shippingConfigs = configs;
      this.provinceConfigs = configs;
      this.applyFilters();
      this.loading = false;
    });
  }

  private loadProvincesByMode(mode: 'after' | 'before'): void {
    if (mode === 'after') {
      // Sau sáp nhập: lấy danh sách 34 tỉnh/thành từ VN2
      this.locations.getVn2Provinces().subscribe({
        next: (res) => {
          const provincesRaw = (res as any)?.data?.provinces;
          const items: any[] = Array.isArray(provincesRaw) ? provincesRaw : [];
          this.provincesInfo = items
            .map((p) => String(p?.name || '').trim())
            .filter(Boolean)
            .map((name) => ({ currentName: name, status: 'unchanged' as const }));
          this.applyFilters();
        },
        error: () => {
          this.provincesInfo = [];
          this.applyFilters();
        }
      });
      return;
    }

    // Trước sáp nhập: lấy danh sách 63 tỉnh/thành từ Depth3
    this.locations.getVnDepth3().subscribe({
      next: (res) => {
        const rows: any[] = Array.isArray((res as any)?.data) ? (res as any).data : [];
        this.provincesInfo = rows
          .map((p) => String(p?.name || '').trim())
          .filter(Boolean)
          .map((name) => ({ currentName: name, status: 'unchanged' as const }));
        this.applyFilters();
      },
      error: () => {
        this.provincesInfo = [];
        this.applyFilters();
      }
    });
  }

  // Filter methods
  filterProvinces(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.applyFilters();
  }

  filterByStatus(status: string): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.provincesInfo];
    
    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(province =>
        province.currentName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (province.beforeMerge && province.beforeMerge.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (this.statusFilter !== 'ALL') {
      const hasConfig = (province: ProvinceInfo) => 
        this.provinceConfigs.some(config => config.province === province.currentName);
      
      if (this.statusFilter === 'CONFIGURED') {
        filtered = filtered.filter(hasConfig);
      } else if (this.statusFilter === 'UNCONFIGURED') {
        filtered = filtered.filter(province => !hasConfig(province));
      }
    }
    
    this.filteredProvinces = filtered;
  }

  setNameMode(mode: 'after' | 'before'): void {
    this.nameMode = mode;
    this.searchTerm = '';
    this.statusFilter = 'ALL';
    this.closeConfig();
    this.loadConfigsByMode(mode);
    this.loadProvincesByMode(mode);
  }

  openConfigModal(): void {
    this.isConfigModalOpen = true;
    this.showAddDistanceForm = false;
    this.editingDistanceIndex = null;
    this.resetDistanceForm();
  }

  closeConfigModal(): void {
    this.isConfigModalOpen = false;
    this.showAddDistanceForm = false;
    this.resetDistanceForm();
  }

  getConfigForCurrentProvinceName(currentName: string): ProvinceShippingConfig | null {
    return this.provinceConfigs.find(c => c.province === currentName) || null;
  }

  getDistanceTemplateColumns(): DistanceConfig[] {
    return this.distanceTemplate || [];
  }

  getFeeForProvinceSegment(provinceName: string, segmentIndex: number): number {
    const cfg = this.getConfigForCurrentProvinceName(provinceName);
    if (!cfg) return 0;
    return cfg.distanceConfigs?.[segmentIndex]?.fee ?? 0;
  }

  setFeeForProvinceSegment(provinceName: string, segmentIndex: number, feeValue: number): void {
    const province = this.provincesInfo.find(p => p.currentName === provinceName);
    if (!province) return;

    const normalizedFee = Number.isFinite(feeValue as any) ? Number(feeValue) : 0;

    const existingConfig = this.getConfigForCurrentProvinceName(provinceName);
    const baseConfig: ProvinceShippingConfig = existingConfig
      ? { ...existingConfig, distanceConfigs: existingConfig.distanceConfigs.map(d => ({ ...d })) }
      : {
          province: province.currentName,
          provinceBefore: province.beforeMerge,
          distanceConfigs: []
        };

    this.ensureConfigMatchesTemplate(baseConfig);

    if (!baseConfig.distanceConfigs[segmentIndex]) return;
    baseConfig.distanceConfigs[segmentIndex].fee = normalizedFee;

    const mode = this.getCurrentConfigMode();
    this.shippingService.addProvinceConfig(baseConfig, mode);
    this.shippingService.getShippingConfigs(mode).subscribe(configs => {
      this.provinceConfigs = configs;
      this.applyFilters();
    });
  }

  private ensureConfigMatchesTemplate(config: ProvinceShippingConfig): void {
    const template = this.distanceTemplate || [];
    if (!config.distanceConfigs) config.distanceConfigs = [];

    for (let i = 0; i < template.length; i++) {
      const tpl = template[i];
      const existing = config.distanceConfigs[i];
      if (existing) {
        config.distanceConfigs[i] = {
          ...existing,
          minDistance: tpl.minDistance,
          maxDistance: tpl.maxDistance,
          shippingMethod: tpl.shippingMethod
        };
      } else {
        config.distanceConfigs[i] = {
          minDistance: tpl.minDistance,
          maxDistance: tpl.maxDistance,
          shippingMethod: tpl.shippingMethod,
          fee: 0
        };
      }
    }

    if (config.distanceConfigs.length > template.length) {
      config.distanceConfigs = config.distanceConfigs.slice(0, template.length);
    }
  }

  private ensureAllProvinceConfigsMatchTemplate(): void {
    const template = this.distanceTemplate || [];
    if (template.length === 0) return;

    const current = this.provinceConfigs || [];
    for (const cfg of current) {
      const nextCfg: ProvinceShippingConfig = { ...cfg, distanceConfigs: (cfg.distanceConfigs || []).map(d => ({ ...d })) };
      this.ensureConfigMatchesTemplate(nextCfg);
      this.shippingService.addProvinceConfig(nextCfg, this.getCurrentConfigMode());
    }
  }

  getDisplayedProvinceName(province: ProvinceInfo): string {
    return province.currentName;
  }

  // Get filtered provinces with config
  getFilteredProvincesWithConfig(): ProvinceShippingConfig[] {
    return this.provinceConfigs.filter(config =>
      this.filteredProvinces.some(province => province.currentName === config.province)
    );
  }

  // Get filtered provinces without config
  getFilteredProvincesWithoutConfig(): ProvinceInfo[] {
    return this.filteredProvinces.filter(province =>
      !this.provinceConfigs.some(config => config.province === province.currentName)
    );
  }

  // Province selection
  selectProvince(province: ProvinceInfo): void {
    this.selectedProvince = province;
    const existingConfig = this.provinceConfigs.find(config => config.province === province.currentName);
    
    if (existingConfig) {
      this.editingConfig = { ...existingConfig };
    } else {
      this.editingConfig = {
        province: province.currentName,
        provinceBefore: province.beforeMerge,
        distanceConfigs: []
      };
    }
    
    this.showAddDistanceForm = false;
    this.resetDistanceForm();
  }

  // Close config
  closeConfig(): void {
    this.selectedProvince = null;
    this.editingConfig = null;
    this.showAddDistanceForm = false;
    this.resetDistanceForm();
    this.isConfigModalOpen = false;
  }

  // Distance config methods
  addDistanceConfig(): void {
    // Modal cấu hình khoảng cách chung: chỉ cập nhật template
    const tpl = this.distanceTemplate ? this.distanceTemplate.map(d => ({ ...d })) : [];
    
    // Validation
    if (this.newDistanceConfig.minDistance < 0 || 
        this.newDistanceConfig.maxDistance < 0 || 
        this.newDistanceConfig.minDistance >= this.newDistanceConfig.maxDistance) {
      alert('Vui lòng nhập khoảng cách và phí hợp lệ');
      return;
    }

    const nextItem: DistanceConfig = {
      minDistance: this.newDistanceConfig.minDistance,
      maxDistance: this.newDistanceConfig.maxDistance,
      shippingMethod: this.newDistanceConfig.shippingMethod,
      fee: 0
    };

    if (this.editingDistanceIndex !== null) {
      tpl[this.editingDistanceIndex] = nextItem;
    } else {
      tpl.push(nextItem);
    }

    tpl.sort((a, b) => a.minDistance - b.minDistance);
    this.shippingService.updateDistanceTemplate(tpl);
    
    this.resetDistanceForm();
  }

  editDistanceConfig(index: number): void {
    const config = this.distanceTemplate[index];
    if (!config) return;
    this.newDistanceConfig = { ...config };
    this.editingDistanceIndex = index;
    this.showAddDistanceForm = true;
  }

  deleteDistanceConfig(index: number): void {
    const tpl = this.distanceTemplate ? this.distanceTemplate.map(d => ({ ...d })) : [];
    if (!tpl[index]) return;
    if (confirm('Bạn có chắc muốn xóa cấu hình khoảng cách này?')) {
      tpl.splice(index, 1);
      this.shippingService.updateDistanceTemplate(tpl);
    }
  }

  resetDistanceForm(): void {
    this.newDistanceConfig = {
      minDistance: 0,
      maxDistance: 0,
      fee: 0,
      shippingMethod: 'ECONOMY'
    };
    this.editingDistanceIndex = null;
    this.showAddDistanceForm = false;
  }

  // Save province config
  saveProvinceConfig(): void {
    if (!this.editingConfig || !this.selectedProvince) return;
    
    this.isSaving = true;
    
    setTimeout(() => {
      this.shippingService.addProvinceConfig(this.editingConfig!);
      this.shippingService.getShippingConfigs().subscribe(configs => {
        this.provinceConfigs = configs;
      });
      this.isSaving = false;
      alert('Lưu cấu hình thành công!');
    }, 500);
  }

  // Delete province config
  deleteProvinceConfig(provinceName: string): void {
    if (confirm(`Bạn có chắc muốn xóa cấu hình của tỉnh ${provinceName}?`)) {
      this.shippingService.deleteProvinceConfig(provinceName);
      this.shippingService.getShippingConfigs().subscribe(configs => {
        this.provinceConfigs = configs;
      });
      
      if (this.selectedProvince?.currentName === provinceName) {
        this.closeConfig();
      }
    }
  }

  clearPricesForProvince(provinceName: string): void {
    const province = this.provincesInfo.find(p => p.currentName === provinceName);
    if (!province) return;

    if (!confirm(`Bạn có chắc muốn xóa giá (đặt về 0) cho tỉnh ${provinceName}?`)) {
      return;
    }

    const existingConfig = this.getConfigForCurrentProvinceName(provinceName);
    const nextConfig: ProvinceShippingConfig = existingConfig
      ? { ...existingConfig, distanceConfigs: (existingConfig.distanceConfigs || []).map(d => ({ ...d, fee: 0 })) }
      : {
          province: province.currentName,
          provinceBefore: province.beforeMerge,
          distanceConfigs: []
        };

    // Ensure config has same segments as template (ranges + methods), but fees cleared.
    this.ensureConfigMatchesTemplate(nextConfig);
    nextConfig.distanceConfigs = nextConfig.distanceConfigs.map(d => ({ ...d, fee: 0 }));

    const mode = this.getCurrentConfigMode();
    this.shippingService.addProvinceConfig(nextConfig, mode);
    this.shippingService.getShippingConfigs(mode).subscribe(configs => {
      this.provinceConfigs = configs;
      this.applyFilters();
    });
  }

  openSyncModal(): void {
    this.isSyncModalOpen = true;
  }

  closeSyncModal(): void {
    this.isSyncModalOpen = false;
  }

  openFormulaModal(): void {
    this.isFormulaModalOpen = true;
  }

  closeFormulaModal(): void {
    this.isFormulaModalOpen = false;
  }

  async syncConfigs(direction: 'before_to_after' | 'after_to_before'): Promise<void> {
    const fromMode = direction === 'before_to_after' ? 'before' : 'after';
    const toMode = direction === 'before_to_after' ? 'after' : 'before';

    if (!confirm(`Bạn có chắc muốn đồng bộ cấu hình từ ${fromMode === 'before' ? 'Trước sáp nhập (63)' : 'Sau sáp nhập (34)'} sang ${toMode === 'before' ? 'Trước sáp nhập (63)' : 'Sau sáp nhập (34)'}?\n\nLưu ý: hiện chỉ đồng bộ theo các tỉnh trùng tên.`)) {
      return;
    }

    try {
      const fromConfigs = await firstValueFrom(this.shippingService.getShippingConfigs(fromMode));
      const toConfigs = await firstValueFrom(this.shippingService.getShippingConfigs(toMode));
      const toSet = new Set((toConfigs || []).map(c => c.province));

      let synced = 0;
      for (const cfg of fromConfigs || []) {
        if (!cfg?.province) continue;
        if (!toSet.has(cfg.province)) continue;

        const nextCfg: ProvinceShippingConfig = {
          ...cfg,
          distanceConfigs: (cfg.distanceConfigs || []).map(d => ({ ...d }))
        };
        this.ensureConfigMatchesTemplate(nextCfg);
        this.shippingService.addProvinceConfig(nextCfg, toMode);
        synced++;
      }

      if (this.getCurrentConfigMode() === toMode) {
        this.loadConfigsByMode(this.nameMode);
      }

      alert(`Đồng bộ xong: ${synced} tỉnh (theo tên trùng).`);
      this.closeSyncModal();
    } catch (e: any) {
      alert(e?.message || 'Đồng bộ thất bại');
    }
  }

  // Import/Export methods
  exportToExcel(): void {
    try {
      const template = this.getDistanceTemplateColumns();

      const tplRows = template.map((t, idx) => ({
        index: idx + 1,
        minDistance: t.minDistance,
        maxDistance: t.maxDistance,
        shippingMethod: t.shippingMethod
      }));

      const provinces = (this.provincesInfo || []).map(p => p.currentName);
      const segCount = template.length;

      const segLabels = template.map((t) => {
        const methodLabel = t.shippingMethod === 'FAST' ? 'FAST' : (t.shippingMethod === 'EXPRESS' ? 'EXPRESS' : 'ECONOMY');
        return `${t.minDistance}-${t.maxDistance} KM (${methodLabel})`;
      });

      const feeRows = provinces.map((province, idx) => {
        const row: any = { index: idx + 1, province };
        for (let i = 0; i < segCount; i++) {
          row[segLabels[i]] = this.getFeeForProvinceSegment(province, i);
        }
        return row;
      });

      const wb = XLSX.utils.book_new();
      const wsFees = XLSX.utils.json_to_sheet(feeRows);
      const wsTpl = XLSX.utils.json_to_sheet(tplRows);

      const wsProvinces = XLSX.utils.json_to_sheet(
        provinces.map((name, idx) => ({ index: idx + 1, province: name }))
      );

      const wsDistanceUnits = XLSX.utils.json_to_sheet([
        { value: 'km', label: 'Kilomet' },
        { value: 'm', label: 'Met' }
      ]);

      const wsShippingMethods = XLSX.utils.json_to_sheet([
        { value: 'FAST', label: 'Giao hàng nhanh' },
        { value: 'ECONOMY', label: 'Giao hàng tiết kiệm' },
        { value: 'EXPRESS', label: 'Hỏa tốc' }
      ]);

      XLSX.utils.book_append_sheet(wb, wsFees, 'Fees');
      XLSX.utils.book_append_sheet(wb, wsTpl, 'DistanceTemplate');
      XLSX.utils.book_append_sheet(wb, wsProvinces, 'Provinces');
      XLSX.utils.book_append_sheet(wb, wsDistanceUnits, 'DistanceUnits');
      XLSX.utils.book_append_sheet(wb, wsShippingMethods, 'ShippingMethods');

      const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const filename = `shipping_settings_${this.nameMode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      this.downloadBlob(blob, filename);
    } catch (e: any) {
      alert(e?.message || 'Không thể xuất Excel');
    }
  }

  onExcelInputClick(): void {
    const fileInput = document.getElementById('excelFile') as HTMLInputElement;
    fileInput?.click();
  }

  async onExcelSelected(event: any): Promise<void> {
    const file: File | null = event?.target?.files?.[0] || null;
    if (!file) return;

    this.isImporting = true;
    this.importStatus = null;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });

      const tplSheet = wb.Sheets['DistanceTemplate'] || wb.Sheets[wb.SheetNames[0]];
      if (!tplSheet) throw new Error('Không tìm thấy sheet DistanceTemplate');

      const tpl = XLSX.utils.sheet_to_json<any>(tplSheet, { defval: '' });
      const nextTemplate: DistanceConfig[] = (tpl || [])
        .map((r: any) => ({
          minDistance: Number(r.minDistance ?? r['MinDistance'] ?? r['min_distance'] ?? 0),
          maxDistance: Number(r.maxDistance ?? r['MaxDistance'] ?? r['max_distance'] ?? 0),
          shippingMethod: (String(r.shippingMethod ?? r['ShippingMethod'] ?? r['shipping_method'] ?? 'ECONOMY').trim().toUpperCase() as ShippingMethod) || 'ECONOMY',
          fee: 0
        }))
        .map((r: DistanceConfig) => {
          const method = (String(r.shippingMethod || 'ECONOMY').trim().toUpperCase() as ShippingMethod) || 'ECONOMY';
          const normalizedMethod: ShippingMethod = method === 'FAST' || method === 'EXPRESS' || method === 'ECONOMY' ? method : 'ECONOMY';
          return {
            ...r,
            shippingMethod: normalizedMethod
          };
        })
        .filter((r: DistanceConfig) => Number.isFinite(r.minDistance) && Number.isFinite(r.maxDistance) && r.minDistance < r.maxDistance);

      this.shippingService.updateDistanceTemplate(nextTemplate);

      const feesSheet = wb.Sheets['Fees'] || null;
      let imported = 0;
      let skipped = 0;
      if (feesSheet) {
        const feeRows = XLSX.utils.sheet_to_json<any>(feesSheet, { defval: '' });
        for (const r of feeRows || []) {
          const provinceName = String(r.province ?? r['Province'] ?? '').trim();
          if (!provinceName) continue;

          const province = this.provincesInfo.find(p => p.currentName === provinceName);
          if (!province) {
            skipped++;
            continue;
          }
          const cfg: ProvinceShippingConfig = {
            province: province.currentName,
            provinceBefore: province.beforeMerge,
            distanceConfigs: nextTemplate.map((t, idx) => ({
              minDistance: t.minDistance,
              maxDistance: t.maxDistance,
              shippingMethod: t.shippingMethod,
              fee: (() => {
                const methodLabel = t.shippingMethod === 'FAST' ? 'FAST' : (t.shippingMethod === 'EXPRESS' ? 'EXPRESS' : 'ECONOMY');
                const rangeKey = `${t.minDistance}-${t.maxDistance} KM (${methodLabel})`;
                const v = (r[rangeKey] ?? r[`segment_${idx + 1}`] ?? 0);
                return Number.isFinite(Number(v)) ? Number(v) : 0;
              })()
            }))
          };

          this.shippingService.addProvinceConfig(cfg, this.getCurrentConfigMode());
          imported++;
        }
      }

      this.shippingService.getShippingConfigs(this.getCurrentConfigMode()).subscribe(configs => {
        this.provinceConfigs = configs;
        this.applyFilters();
      });

      const suffix = skipped > 0 ? ` (Bỏ qua: ${skipped} tỉnh không hợp lệ theo mode hiện tại)` : '';
      this.importStatus = { success: true, message: `Nhập Excel thành công!${suffix}`, imported };
    } catch (e: any) {
      this.importStatus = { success: false, message: e?.message || 'Nhập Excel thất bại' };
    } finally {
      this.isImporting = false;
      if (event?.target) event.target.value = '';
      setTimeout(() => {
        this.importStatus = null;
      }, 3000);
    }
  }

  // UI helpers
  toggleProvinceExpansion(province: string): void {
    if (this.expandedProvinces.has(province)) {
      this.expandedProvinces.delete(province);
    } else {
      this.expandedProvinces.add(province);
    }
  }

  isProvinceExpanded(province: string): boolean {
    return this.expandedProvinces.has(province);
  }

  getConfigForProvince(province: string): ProvinceShippingConfig | null {
    return this.shippingConfigs.find(c => c.province === province) || null;
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  // Utility methods
  getProvincesWithConfig(): ProvinceShippingConfig[] {
    return this.provinceConfigs;
  }

  getProvincesWithoutConfig(): ProvinceInfo[] {
    return this.provincesInfo.filter(province =>
      !this.provinceConfigs.some(config => config.province === province.currentName)
    );
  }

  getProvinceInfoByName(provinceName: string): ProvinceInfo {
    return this.provincesInfo.find(p => p.currentName === provinceName) || {
      currentName: provinceName,
      status: 'unchanged'
    };
  }

  // Get total distance configs for filtered provinces
  getTotalDistanceConfigs(): number {
    return this.getFilteredProvincesWithConfig().reduce((sum, config) => sum + config.distanceConfigs.length, 0);
  }

  // Save general settings
  saveSettings(): void {
    this.shippingService.updateSettings(this.settings);
    alert('Lưu cài đặt chung thành công!');
  }
}
