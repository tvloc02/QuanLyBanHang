import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminBranchResponse, AdminBranchStockResponse, AdminDataService, AdminUserResponse } from '../../../core/services/admin-data.service';
import { environment } from '../../../../environments/environment';
import { LocationService } from '../../../core/services/location.service';

import * as L from 'leaflet';

type AddressMode = 'before_merge' | 'after_merge';

interface WardNode {
  name: string;
}

interface DistrictNode {
  name: string;
  wards: WardNode[];
}

interface ProvinceNode {
  name: string;
  districts: DistrictNode[];
}

interface Vn2Province {
  code: string;
  name: string;
}

interface Vn2Commune {
  code: string;
  name: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ProductResponse {
  id: number;
  sku?: string;
  name: string;
  stock?: number;
}

@Component({
  selector: 'app-admin-branches',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-branches.component.html',
  styleUrls: ['./admin-branches.component.scss']
})
export class AdminBranchesComponent {
  loading = false;
  error = '';
  rows: AdminBranchResponse[] = [];

  q = '';

  pageSizeOptions = [20, 50, 100, 500];
  pageSize = 20;
  pageIndex = 0;

  managerOptions: AdminUserResponse[] = [];
  managerQ = '';

  private addressDataAll: ProvinceNode[] = [];
  provinceOptions: string[] = [];
  districtOptions: string[] = [];
  wardOptions: string[] = [];

  addressMode: AddressMode = 'before_merge';

  vn2Loading = false;
  vn2ProvinceOptions: Vn2Province[] = [];
  vn2CommuneOptions: Vn2Commune[] = [];
  vn2ProvinceCode = '';
  vn2CommuneCode = '';
  private pendingVn2CommuneName = '';
  private pendingVn2CommuneCode = '';

  private savedDepth3Address: { province: string; district: string; ward: string } = { province: '', district: '', ward: '' };
  private savedVn2Address: { provinceCode: string; communeCode: string; provinceName: string; wardName: string } = {
    provinceCode: '',
    communeCode: '',
    provinceName: '',
    wardName: ''
  };

  mapOpen = false;
  mapError = '';

  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private mapMarker: L.Marker | null = null;
  private pendingLatLng: L.LatLng | null = null;

  createOpen = false;
  createLoading = false;
  form: {
    id?: number;
    code: string;
    name: string;
    managerUserIds: number[];
    address?: string | null;
    province?: string | null;
    district?: string | null;
    ward?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    active: boolean;
  } = {
    code: '',
    name: '',
    managerUserIds: [],
    address: '',
    province: '',
    district: '',
    ward: '',
    latitude: null,
    longitude: null,
    active: true
  };

  editOpen = false;
  editLoading = false;

  stocksOpen = false;
  stocksLoading = false;
  stocksError = '';
  stocksBranch: AdminBranchResponse | null = null;
  products: ProductResponse[] = [];
  productQ = '';
  private initialStockByProductId = new Map<number, number>();
  stockDraftByProductId = new Map<number, number>();

  constructor(
    private adminData: AdminDataService,
    private http: HttpClient,
    private locations: LocationService
  ) {
    this.loadManagers();
    this.loadAddressDepth3();
    this.loadVn2Provinces();
    this.configureLeafletDefaultIcon();
    this.load();
  }

  get filteredManagerOptions(): AdminUserResponse[] {
    const q = String(this.managerQ || '').trim().toLowerCase();
    const rows = this.managerOptions || [];
    if (!q) return rows;
    return rows.filter((u) => {
      const hay = `${u.id} ${u.fullName || ''} ${u.username || ''} ${u.email || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  isManagerChecked(userId: number): boolean {
    const ids = Array.isArray(this.form.managerUserIds) ? this.form.managerUserIds : [];
    return ids.includes(userId);
  }

  toggleManager(userId: number, checked: boolean): void {
    const ids = Array.isArray(this.form.managerUserIds) ? [...this.form.managerUserIds] : [];
    const idx = ids.indexOf(userId);
    if (checked) {
      if (idx === -1) ids.push(userId);
    } else {
      if (idx >= 0) ids.splice(idx, 1);
    }
    this.form.managerUserIds = ids;
  }

  get managerPickerSummary(): string {
    const ids = Array.isArray(this.form.managerUserIds) ? this.form.managerUserIds : [];
    if (!ids.length) return 'Chưa chọn quản lý';
    const names = ids
      .map((id) => this.managerOptions.find((u) => u.id === id))
      .filter(Boolean)
      .map((u) => String((u as any)?.fullName || (u as any)?.username || (u as any)?.email || '').trim())
      .filter(Boolean);
    if (!names.length) return `${ids.length} quản lý`;
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  }

  get totalBranches(): number {
    return (this.rows || []).length;
  }

  get activeBranches(): number {
    return (this.rows || []).filter((r) => r && r.active !== false).length;
  }

  get inactiveBranches(): number {
    return (this.rows || []).filter((r) => r && r.active === false).length;
  }

  get canPickDistrict(): boolean {
    return !!String(this.form.province || '').trim();
  }

  get canPickWard(): boolean {
    return this.canPickDistrict && !!String(this.form.district || '').trim();
  }

  onAddressModeChange(mode: AddressMode): void {
    const prevMode = this.addressMode;
    this.addressMode = mode;
    if (mode === 'after_merge') {
      this.districtOptions = [];
      this.wardOptions = [];

      if (prevMode === 'before_merge') {
        this.savedDepth3Address = {
          province: String(this.form.province || '').trim(),
          district: String(this.form.district || '').trim(),
          ward: String(this.form.ward || '').trim()
        };
      }

      if (this.savedVn2Address.provinceCode) {
        this.pendingVn2CommuneCode = this.savedVn2Address.communeCode;
        this.pendingVn2CommuneName = this.savedVn2Address.wardName;
        this.onVn2ProvinceChange(this.savedVn2Address.provinceCode);
        if (this.savedVn2Address.provinceName) {
          this.form.province = this.savedVn2Address.provinceName;
        }
        return;
      }

      if (!this.vn2ProvinceCode) {
        const prov = this.bestMatchByName(this.vn2ProvinceOptions, String(this.form.province || '').trim());
        if (prov) {
          this.pendingVn2CommuneName = String(this.form.ward || this.form.district || '').trim();
          this.onVn2ProvinceChange(prov.code);
        }
      }
      return;
    }

    if (prevMode === 'after_merge') {
      this.savedVn2Address = {
        provinceCode: String(this.vn2ProvinceCode || '').trim(),
        communeCode: String(this.vn2CommuneCode || '').trim(),
        provinceName: String(this.form.province || '').trim(),
        wardName: String(this.form.ward || '').trim()
      };
    }

    if (this.savedDepth3Address.province || this.savedDepth3Address.district || this.savedDepth3Address.ward) {
      this.form.province = this.savedDepth3Address.province;
      this.form.district = this.savedDepth3Address.district;
      this.form.ward = this.savedDepth3Address.ward;
    }

    this.applyAddressOptionsFromForm();
  }

  private loadManagers(): void {
    this.adminData.getUsers().subscribe({
      next: (res: ApiResponse<AdminUserResponse[]>) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.managerOptions = rows.filter((u) => {
          const rolesRaw = Array.isArray((u as any)?.roles) ? (u as any).roles : [];
          const roles = rolesRaw
            .map((r: any) => String(r || '').trim().toUpperCase())
            .filter((x: string) => !!x)
            .map((x: string) => (x.startsWith('ROLE_') ? x.slice('ROLE_'.length) : x));
          return roles.includes('MANAGER');
        });
      },
      error: () => {
        this.managerOptions = [];
      }
    });
  }

  private loadVn2Provinces(): void {
    this.locations.getVn2Provinces().subscribe({
      next: (res) => {
        const provincesRaw = (res as any)?.data?.provinces;
        const items = Array.isArray(provincesRaw) ? provincesRaw : [];
        this.vn2ProvinceOptions = items
          .map((x: any) => ({ code: String(x?.code || '').trim(), name: String(x?.name || '').trim() }))
          .filter((x: Vn2Province) => !!x.code && !!x.name)
          .sort((a: Vn2Province, b: Vn2Province) => a.name.localeCompare(b.name));

        this.applyVn2ModeToForm();
      },
      error: () => {
        this.vn2ProvinceOptions = [];
      }
    });
  }

  private loadAddressDepth3(): void {
    this.locations.getVnDepth3().subscribe({
      next: (res) => {
        const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
        this.addressDataAll = this.normalizeDepth3(rows);
        this.provinceOptions = this.addressDataAll.map((p) => p.name);
        this.applyAddressOptionsFromForm();
      },
      error: () => {
        this.addressDataAll = [];
        this.provinceOptions = [];
        this.districtOptions = [];
        this.wardOptions = [];
      }
    });
  }

  private normalizeDepth3(data: any[]): ProvinceNode[] {
    if (!Array.isArray(data)) return [];
    return data
      .map((p: any) => {
        const pName = String(p?.name || '').trim();
        const districtsRaw = Array.isArray(p?.districts) ? p.districts : [];
        const districts: DistrictNode[] = districtsRaw
          .map((d: any) => {
            const dName = String(d?.name || '').trim();
            const wardsRaw = Array.isArray(d?.wards) ? d.wards : [];
            const wards: WardNode[] = wardsRaw
              .map((w: any) => ({ name: String(w?.name || '').trim() }))
              .filter((w: WardNode) => !!w.name);
            return { name: dName, wards };
          })
          .filter((d: DistrictNode) => !!d.name);
        return { name: pName, districts };
      })
      .filter((p: ProvinceNode) => !!p.name);
  }

  onProvinceChange(name: string): void {
    const provName = String(name || '').trim();
    this.form.province = provName;
    const prov = this.addressDataAll.find((p) => p.name === provName);
    this.districtOptions = (prov?.districts || []).map((d) => d.name);
    this.wardOptions = [];
    this.form.district = '';
    this.form.ward = '';
  }

  onVn2ProvinceChange(code: string): void {
    const c = String(code || '').trim();
    this.vn2ProvinceCode = c;
    this.vn2CommuneCode = '';
    this.vn2CommuneOptions = [];

    const preserveWard = !!String(this.pendingVn2CommuneName || this.pendingVn2CommuneCode).trim();

    const prov = this.vn2ProvinceOptions.find((x) => x.code === c) || null;
    this.form.province = prov ? prov.name : this.form.province || '';
    this.form.district = '';
    if (!preserveWard) {
      this.form.ward = '';
    }

    if (!c) return;

    this.vn2Loading = true;
    this.locations.getVn2CommunesByProvince(c).subscribe({
      next: (res) => {
        this.vn2Loading = false;
        const communesRaw = (res as any)?.data?.communes;
        const items = Array.isArray(communesRaw) ? communesRaw : [];
        this.vn2CommuneOptions = items
          .map((x: any) => ({ code: String(x?.code || '').trim(), name: String(x?.name || '').trim() }))
          .filter((x: Vn2Commune) => !!x.code && !!x.name)
          .sort((a: Vn2Commune, b: Vn2Commune) => a.name.localeCompare(b.name));

        if (this.pendingVn2CommuneCode) {
          const codeWanted = this.pendingVn2CommuneCode;
          this.pendingVn2CommuneCode = '';
          const com = this.vn2CommuneOptions.find((x) => x.code === codeWanted) || null;
          if (com) {
            this.vn2CommuneCode = com.code;
            this.form.ward = com.name;
            this.form.district = '';
            this.pendingVn2CommuneName = '';
            return;
          }
        }

        if (this.pendingVn2CommuneName) {
          const com = this.bestMatchByName(this.vn2CommuneOptions, this.pendingVn2CommuneName);
          this.pendingVn2CommuneName = '';
          if (com) {
            this.vn2CommuneCode = com.code;
            this.form.ward = com.name;
            this.form.district = '';
          }
        }
      },
      error: () => {
        this.vn2Loading = false;
        this.vn2CommuneOptions = [];
      }
    });
  }

  onVn2CommuneChange(code: string): void {
    const c = String(code || '').trim();
    this.vn2CommuneCode = c;
    const com = this.vn2CommuneOptions.find((x) => x.code === c) || null;
    this.form.ward = com ? com.name : this.form.ward || '';
    this.form.district = '';
  }

  onDistrictChange(name: string): void {
    const provName = String(this.form.province || '').trim();
    const distName = String(name || '').trim();
    this.form.district = distName;
    const prov = this.addressDataAll.find((p) => p.name === provName);
    const dist = prov?.districts?.find((d) => d.name === distName);
    this.wardOptions = (dist?.wards || []).map((w) => w.name);
    this.form.ward = '';
  }

  onWardChange(name: string): void {
    this.form.ward = String(name || '').trim();
  }

  private applyAddressOptionsFromForm(): void {
    if (this.addressMode === 'after_merge') {
      this.districtOptions = [];
      this.wardOptions = [];
      return;
    }
    const provName = String(this.form.province || '').trim();
    const distName = String(this.form.district || '').trim();
    const prov = this.addressDataAll.find((p) => p.name === provName);
    this.districtOptions = (prov?.districts || []).map((d) => d.name);
    const dist = prov?.districts?.find((d) => d.name === distName);
    this.wardOptions = (dist?.wards || []).map((w) => w.name);
  }

  private applyVn2ModeToForm(): void {
    if (this.addressMode !== 'after_merge') return;
    if (!this.vn2ProvinceOptions.length) return;

    if (!this.vn2ProvinceCode) {
      const prov = this.bestMatchByName(this.vn2ProvinceOptions, String(this.form.province || '').trim());
      if (prov) {
        this.pendingVn2CommuneName = String(this.form.ward || '').trim();
        this.onVn2ProvinceChange(prov.code);
      }
    }
  }

  openMapPicker(): void {
    this.mapError = '';
    this.mapOpen = true;
    this.pendingLatLng = null;

    window.setTimeout(() => {
      this.initMap();
      this.tryCenterToCurrentLocation();
    }, 0);
  }

  closeMapPicker(): void {
    this.mapOpen = false;
    this.destroyMap();
  }

  confirmMapPicker(): void {
    this.mapError = '';
    if (!this.pendingLatLng) {
      this.mapError = 'Vui lòng chọn 1 vị trí trên bản đồ.';
      return;
    }

    const lat = Number(this.pendingLatLng.lat);
    const lng = Number(this.pendingLatLng.lng);
    this.form.latitude = lat;
    this.form.longitude = lng;

    this.locations.reverseGeocode(lat, lng).subscribe({
      next: (res) => {
        const data = (res as any)?.data || {};
        this.applyReverseGeocode(data);
      },
      error: () => {
      }
    });

    this.closeMapPicker();
  }

  private applyReverseGeocode(data: any): void {
    const addr = (data as any)?.address || {};
    const rawProvince = String(addr.state || addr.city || addr['ISO3166-2-lvl4'] || '').trim();
    const rawDistrict = String(addr.county || addr.city_district || '').trim();
    const rawWard = String(addr.suburb || addr.village || addr.quarter || addr.town || '').trim();
    const displayName = String((data as any)?.display_name || '').trim();

    if (displayName && !String(this.form.address || '').trim()) {
      this.form.address = displayName;
    }

    if (this.addressMode === 'after_merge') {
      const prov = this.bestMatchByName(this.vn2ProvinceOptions, rawProvince);
      if (prov) {
        this.vn2ProvinceCode = prov.code;
        this.form.province = prov.name;
        this.pendingVn2CommuneName = rawWard || rawDistrict;
        this.onVn2ProvinceChange(prov.code);
      } else {
        this.form.province = rawProvince;
        this.form.district = '';
        this.form.ward = rawWard || rawDistrict;
      }
      return;
    }

    const province = this.bestMatch(this.provinceOptions, rawProvince) || rawProvince;
    if (province) {
      this.form.province = province;
      this.onProvinceChange(province);
    }

    const district = this.bestMatch(this.districtOptions, rawDistrict) || rawDistrict;
    if (district) {
      this.form.district = district;
      this.onDistrictChange(district);
    }

    const ward = this.bestMatch(this.wardOptions, rawWard) || rawWard;
    if (ward) {
      this.form.ward = ward;
      this.onWardChange(ward);
    }
  }

  private bestMatch(options: string[], value: string): string {
    const q = String(value || '').trim();
    if (!q) return '';
    const ql = q.toLowerCase();
    const exact = (options || []).find((x) => String(x || '').toLowerCase() === ql);
    if (exact) return exact;
    const inc = (options || []).find((x) => String(x || '').toLowerCase().includes(ql));
    if (inc) return inc;
    const rev = (options || []).find((x) => ql.includes(String(x || '').toLowerCase()));
    return rev || '';
  }

  private bestMatchByName<T extends { name: string }>(options: T[], value: string): T | null {
    const q = String(value || '').trim();
    if (!q) return null;
    const ql = q.toLowerCase();
    const exact = (options || []).find((x) => String(x?.name || '').toLowerCase() === ql);
    if (exact) return exact;
    const inc = (options || []).find((x) => String(x?.name || '').toLowerCase().includes(ql));
    if (inc) return inc;
    const rev = (options || []).find((x) => ql.includes(String(x?.name || '').toLowerCase()));
    return rev || null;
  }

  private configureLeafletDefaultIcon(): void {
    try {
      (L.Icon.Default as any).mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });
    } catch {
    }
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;
    if (this.map) return;

    const fallback = new L.LatLng(10.7769, 106.7009);
    const lat = this.form.latitude;
    const lng = this.form.longitude;
    const start = typeof lat === 'number' && typeof lng === 'number' ? new L.LatLng(lat, lng) : fallback;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: start,
      zoom: 13,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.setMapMarker(start);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.setMapMarker(e.latlng);
    });

    window.setTimeout(() => {
      this.map?.invalidateSize();
    }, 50);
  }

  private tryCenterToCurrentLocation(): void {
    if (!this.map) return;
    const lat = this.form.latitude;
    const lng = this.form.longitude;
    if (typeof lat === 'number' && typeof lng === 'number') return;

    const geo = (globalThis as any)?.navigator?.geolocation;
    if (!geo?.getCurrentPosition) return;

    geo.getCurrentPosition(
      (pos: GeolocationPosition) => {
        const clat = Number(pos?.coords?.latitude);
        const clng = Number(pos?.coords?.longitude);
        if (!Number.isFinite(clat) || !Number.isFinite(clng)) return;
        const ll = new L.LatLng(clat, clng);
        this.map?.setView(ll, 15);
        this.setMapMarker(ll);
      },
      () => {
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  private setMapMarker(latlng: L.LatLng): void {
    this.pendingLatLng = latlng;
    if (!this.map) return;
    if (!this.mapMarker) {
      this.mapMarker = L.marker(latlng, { draggable: false }).addTo(this.map);
    } else {
      this.mapMarker.setLatLng(latlng);
    }
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.off();
      this.map.remove();
    }
    this.map = null;
    this.mapMarker = null;
    this.pendingLatLng = null;
  }

  formatManagers(r: AdminBranchResponse): string {
    const names = (r as any)?.managerNames as any;
    if (Array.isArray(names) && names.length) {
      return names.filter((x: any) => !!String(x || '').trim()).join(', ');
    }

    if (r.managerName) return r.managerName;

    const idsRaw = (r as any)?.managerUserIds;
    const ids = Array.isArray(idsRaw) ? idsRaw.map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x)) : [];
    if (ids.length) {
      const resolved = ids
        .map((id) => this.managerOptions.find((u) => u.id === id))
        .filter(Boolean)
        .map((u) => String((u as any)?.fullName || (u as any)?.username || (u as any)?.email || '').trim())
        .filter(Boolean);
      if (resolved.length) return resolved.join(', ');
      return ids.map((id) => '#' + id).join(', ');
    }

    if (r.managerUserId) {
      const u = this.managerOptions.find((x) => x.id === r.managerUserId) || null;
      const label = u ? String(u.fullName || u.username || u.email || '').trim() : '';
      return label || '#' + r.managerUserId;
    }

    return '-';
  }

  formatAddress(r: AdminBranchResponse): string {
    if (!r) return '-';
    const parts: string[] = [];
    const push = (v: any) => {
      const s = (v ?? '').toString().trim();
      if (s) parts.push(s);
    };
    push((r as any).address);
    push((r as any).ward);
    push((r as any).district);
    push((r as any).province);
    return parts.length ? parts.join(', ') : '-';
  }

  get totalRecords(): number {
    return this.filteredRows.length;
  }

  get rangeStart(): number {
    if (this.totalRecords <= 0) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get rangeEnd(): number {
    if (this.totalRecords <= 0) return 0;
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalRecords);
  }

  get totalPages(): number {
    if (this.pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  get currentPage(): number {
    const idx = Math.max(0, Math.min(this.pageIndex, this.totalPages - 1));
    return idx + 1;
  }

  get pagedRows(): AdminBranchResponse[] {
    const rows = this.filteredRows;
    const idx = Math.max(0, Math.min(this.pageIndex, this.totalPages - 1));
    const start = idx * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  onPageSizeChange(size: number): void {
    const s = Number(size);
    this.pageSize = !Number.isFinite(s) || s <= 0 ? 20 : s;
    this.pageIndex = 0;
  }

  prevPage(): void {
    if (this.pageIndex <= 0) return;
    this.pageIndex -= 1;
  }

  nextPage(): void {
    const maxIdx = this.totalPages - 1;
    if (this.pageIndex >= maxIdx) return;
    this.pageIndex += 1;
  }

  onSearchChange(): void {
    this.pageIndex = 0;
  }

  get filteredRows(): AdminBranchResponse[] {
    const q = (this.q || '').trim().toLowerCase();
    if (!q) return this.rows;
    return (this.rows || []).filter((r) => {
      const hay = `${r.id} ${r.code || ''} ${r.name || ''} ${r.managerName || ''} ${r.address || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.adminData.getBranches().subscribe({
      next: (res: ApiResponse<AdminBranchResponse[]>) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách chi nhánh.';
          return;
        }
        this.rows = Array.isArray(res.data) ? res.data : [];
        this.pageIndex = 0;
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy chi nhánh.';
      }
    });
  }

  openCreate(): void {
    this.addressMode = 'before_merge';
    this.vn2ProvinceCode = '';
    this.vn2CommuneCode = '';
    this.vn2CommuneOptions = [];
    this.form = {
      code: '',
      name: '',
      managerUserIds: [],
      address: '',
      province: '',
      district: '',
      ward: '',
      latitude: null,
      longitude: null,
      active: true
    };
    this.applyAddressOptionsFromForm();
    this.managerQ = '';
    this.createOpen = true;
  }

  cancelCreate(): void {
    this.createOpen = false;
  }

  submitCreate(): void {
    if (!this.form.code?.trim()) {
      this.error = 'Vui lòng nhập mã chi nhánh.';
      return;
    }
    if (!this.form.name?.trim()) {
      this.error = 'Vui lòng nhập tên chi nhánh.';
      return;
    }

    this.createLoading = true;
    this.error = '';
    this.adminData
      .createBranch({
        code: this.form.code.trim(),
        name: this.form.name.trim(),
        managerUserIds: Array.isArray(this.form.managerUserIds) && this.form.managerUserIds.length ? this.form.managerUserIds : null,
        address: (this.form.address || '').trim() || null,
        province: (this.form.province || '').trim() || null,
        district: (this.form.district || '').trim() || null,
        ward: (this.form.ward || '').trim() || null,
        latitude: this.form.latitude ?? null,
        longitude: this.form.longitude ?? null,
        active: this.form.active
      })
      .subscribe({
        next: (res: ApiResponse<AdminBranchResponse>) => {
          this.createLoading = false;
          if (!res?.success) {
            this.error = res?.message || 'Tạo chi nhánh thất bại.';
            return;
          }
          this.createOpen = false;
          this.load();
        },
        error: () => {
          this.createLoading = false;
          this.error = 'Không thể tạo chi nhánh. Vui lòng thử lại.';
        }
      });
  }

  onEdit(row: AdminBranchResponse): void {
    const idsRaw = (row as any)?.managerUserIds;
    const ids = Array.isArray(idsRaw) ? idsRaw.map((x: any) => Number(x)).filter((x: any) => Number.isFinite(x)) : [];

    const rowProvince = String((row as any)?.province || '').trim();
    const rowDistrict = String((row as any)?.district || '').trim();
    const rowWard = String((row as any)?.ward || '').trim();
    const hasProvinceInVn2 = !!this.bestMatchByName(this.vn2ProvinceOptions, rowProvince);
    this.addressMode = !rowDistrict && !!rowWard && hasProvinceInVn2 ? 'after_merge' : 'before_merge';

    this.vn2ProvinceCode = '';
    this.vn2CommuneCode = '';
    this.vn2CommuneOptions = [];
    this.form = {
      id: row.id,
      code: row.code || '',
      name: row.name || '',
      managerUserIds: ids,
      address: row.address ?? '',
      province: rowProvince,
      district: rowDistrict,
      ward: rowWard,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      active: row.active !== false
    };

    if (this.addressMode === 'after_merge') {
      this.applyVn2ModeToForm();
    } else {
      this.applyAddressOptionsFromForm();
    }
    this.managerQ = '';
    this.editOpen = true;
  }

  cancelEdit(): void {
    this.editOpen = false;
  }

  submitEdit(): void {
    if (!this.form.id) return;
    if (!this.form.code?.trim()) {
      this.error = 'Vui lòng nhập mã chi nhánh.';
      return;
    }
    if (!this.form.name?.trim()) {
      this.error = 'Vui lòng nhập tên chi nhánh.';
      return;
    }

    this.editLoading = true;
    this.error = '';
    this.adminData
      .updateBranch(this.form.id, {
        code: this.form.code.trim(),
        name: this.form.name.trim(),
        managerUserIds: Array.isArray(this.form.managerUserIds) && this.form.managerUserIds.length ? this.form.managerUserIds : null,
        address: (this.form.address || '').trim() || null,
        province: (this.form.province || '').trim() || null,
        district: (this.form.district || '').trim() || null,
        ward: (this.form.ward || '').trim() || null,
        latitude: this.form.latitude ?? null,
        longitude: this.form.longitude ?? null,
        active: this.form.active
      })
      .subscribe({
        next: (res: ApiResponse<AdminBranchResponse>) => {
          this.editLoading = false;
          if (!res?.success) {
            this.error = res?.message || 'Cập nhật chi nhánh thất bại.';
            return;
          }
          this.editOpen = false;
          this.load();
        },
        error: () => {
          this.editLoading = false;
          this.error = 'Không thể cập nhật chi nhánh. Vui lòng thử lại.';
        }
      });
  }

  onDelete(row: AdminBranchResponse): void {
    if (!row?.id) return;
    const ok = confirm(`Xóa chi nhánh ${row.code || row.name || ('#' + row.id)}?`);
    if (!ok) return;

    this.error = '';
    this.adminData.deleteBranch(row.id).subscribe({
      next: (res: ApiResponse<string>) => {
        if (!res?.success) {
          this.error = res?.message || 'Xóa chi nhánh thất bại.';
          return;
        }
        this.load();
      },
      error: () => {
        this.error = 'Không thể xóa chi nhánh. Vui lòng thử lại.';
      }
    });
  }

  openStocks(row: AdminBranchResponse): void {
    this.stocksOpen = true;
    this.stocksLoading = true;
    this.stocksError = '';
    this.stocksBranch = row;
    this.products = [];
    this.productQ = '';
    this.initialStockByProductId.clear();
    this.stockDraftByProductId.clear();

    const productsUrl = `${environment.apiBaseUrl}/api/products`;
    const stocksUrl = `${environment.apiBaseUrl}/api/admin/branches/${row.id}/stocks`;

    let productsDone = false;
    let stocksDone = false;

    const finish = () => {
      if (productsDone && stocksDone) {
        this.stocksLoading = false;
      }
    };

    this.http.get<ApiResponse<ProductResponse[]>>(productsUrl).subscribe({
      next: (res: ApiResponse<ProductResponse[]>) => {
        productsDone = true;
        if (!res?.success) {
          this.stocksError = res?.message || 'Không thể tải danh sách sản phẩm.';
          finish();
          return;
        }
        this.products = Array.isArray(res.data) ? res.data : [];
        for (const p of this.products) {
          if (p?.id != null && !this.stockDraftByProductId.has(p.id)) {
            this.stockDraftByProductId.set(p.id, 0);
          }
        }
        finish();
      },
      error: () => {
        productsDone = true;
        this.stocksError = 'Không thể kết nối backend để lấy sản phẩm.';
        finish();
      }
    });

    this.http.get<ApiResponse<AdminBranchStockResponse[]>>(stocksUrl).subscribe({
      next: (res: ApiResponse<AdminBranchStockResponse[]>) => {
        stocksDone = true;
        if (!res?.success) {
          this.stocksError = res?.message || 'Không thể tải tồn kho chi nhánh.';
          finish();
          return;
        }
        const stocks = Array.isArray(res.data) ? res.data : [];
        for (const s of stocks) {
          const pid = Number((s as any)?.productId);
          const st = Number((s as any)?.stock ?? 0);
          if (Number.isFinite(pid)) {
            this.initialStockByProductId.set(pid, Number.isFinite(st) ? st : 0);
            this.stockDraftByProductId.set(pid, Number.isFinite(st) ? st : 0);
          }
        }
        finish();
      },
      error: () => {
        stocksDone = true;
        this.stocksError = 'Không thể kết nối backend để lấy tồn kho chi nhánh.';
        finish();
      }
    });
  }

  closeStocks(): void {
    this.stocksOpen = false;
    this.stocksBranch = null;
  }

  get filteredProducts(): ProductResponse[] {
    const q = (this.productQ || '').trim().toLowerCase();
    if (!q) return this.products;
    return (this.products || []).filter((p) => {
      const hay = `${p.id} ${p.sku || ''} ${p.name || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  getDraftStock(productId: number): number {
    return this.stockDraftByProductId.get(productId) ?? 0;
  }

  setDraftStock(productId: number, v: any): void {
    const n = Number(v);
    const value = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    this.stockDraftByProductId.set(productId, value);
  }

  saveStocks(): void {
    if (!this.stocksBranch?.id) return;

    const changed: Array<{ productId: number; stock: number }> = [];
    for (const [pid, stock] of this.stockDraftByProductId.entries()) {
      const prev = this.initialStockByProductId.get(pid) ?? 0;
      if (stock !== prev) {
        changed.push({ productId: pid, stock });
      }
    }

    if (changed.length === 0) {
      this.closeStocks();
      return;
    }

    this.stocksLoading = true;
    this.stocksError = '';
    this.adminData.upsertBranchStocks(this.stocksBranch.id, changed).subscribe({
      next: (res: ApiResponse<AdminBranchStockResponse[]>) => {
        this.stocksLoading = false;
        if (!res?.success) {
          this.stocksError = res?.message || 'Lưu tồn kho thất bại.';
          return;
        }
        this.closeStocks();
        this.load();
      },
      error: () => {
        this.stocksLoading = false;
        this.stocksError = 'Không thể lưu tồn kho. Vui lòng thử lại.';
      }
    });
  }
}
