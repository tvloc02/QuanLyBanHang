import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LocationService } from '../../core/services/location.service';
import { UserDataService, UserMeResponse } from '../../core/services/user-data.service';

import * as L from 'leaflet';

type AddressMode = 'DEPTH3' | 'VN2';

type ProfileSection = 'profile' | 'bank' | 'address' | 'password' | 'notifications';

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

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  loading = false;
  saving = false;
  error = '';
  success = '';

  toastVisible = false;
  toastType: 'success' | 'error' = 'success';
  toastMessage = '';
  private toastTimer: number | null = null;

  me: UserMeResponse | null = null;

  activeSection: ProfileSection = 'profile';

  avatarPreviewUrl: string | null = null;
  private avatarObjectUrl: string | null = null;

  gender: 'male' | 'female' | 'other' | '' = '';
  dobDay = '';
  dobMonth = '';
  dobYear = '';

  notifyEmailSystem = true;
  notifyEmailOrders = true;
  notifyEmailPromos = false;
  notifyEmailSurvey = true;

  notifySmsSystem = true;
  notifySmsPromos = false;

  notifyZaloSystem = true;
  notifyZaloPromos = true;

  readonly dobDays: string[] = Array.from({ length: 31 }, (_, i) => String(i + 1));
  readonly dobMonths: string[] = Array.from({ length: 12 }, (_, i) => String(i + 1));
  readonly dobYears: string[] = (() => {
    const y = new Date().getFullYear();
    const out: string[] = [];
    for (let i = y; i >= 1900; i--) out.push(String(i));
    return out;
  })();

  addressMode: AddressMode = 'DEPTH3';

  addressLoading = false;
  addressError = '';

  depth3Provinces: ProvinceNode[] = [];
  depth3ProvinceOptions: string[] = [];
  depth3DistrictOptions: string[] = [];
  depth3WardOptions: string[] = [];

  vn2Loading = false;
  vn2ProvinceOptions: Vn2Province[] = [];
  vn2CommuneOptions: Vn2Commune[] = [];
  private pendingVn2CommuneName = '';

  mapOpen = false;
  mapError = '';

  private map: L.Map | null = null;
  private mapMarker: L.Marker | null = null;
  private pendingLatLng: L.LatLng | null = null;

  private readonly mapPinIcon: L.DivIcon = L.divIcon({
    className: '',
    html: `
      <div style="position: relative; width: 22px; height: 30px;">
        <div style="position:absolute; left:50%; top:0; width:18px; height:18px; background:#c1121f; border:2px solid #fff; border-radius:9999px; transform:translateX(-50%); box-shadow:0 3px 10px rgba(0,0,0,0.35);"></div>
        <div style="position:absolute; left:50%; top:16px; width:0; height:0; border-left:7px solid transparent; border-right:7px solid transparent; border-top:12px solid #c1121f; transform:translateX(-50%); filter:drop-shadow(0 2px 2px rgba(0,0,0,0.25));"></div>
      </div>
    `.trim(),
    iconSize: [22, 30],
    iconAnchor: [11, 30]
  });

  @ViewChild('mapContainer')
  private mapContainer?: ElementRef<HTMLDivElement>;

  form = this.fb.group({
    fullName: ['', [Validators.required]],
    phone: ['', [Validators.required]],

    gender: [''],
    dobDay: [''],
    dobMonth: [''],
    dobYear: [''],

    province: [''],
    district: [''],
    ward: [''],
    addressDetail: [''],
    latitude: [null as number | null],
    longitude: [null as number | null],

    depth3ProvinceName: [''],
    depth3DistrictName: [''],
    depth3WardName: [''],

    vn2ProvinceCode: [''],
    vn2CommuneCode: ['']
  });

  constructor(
    private fb: FormBuilder,
    private userData: UserDataService,
    private locations: LocationService
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadAddressDepth3();
    this.loadVn2Provinces();
    this.configureLeafletDefaultIcon();
  }

  ngOnDestroy(): void {
    this.destroyMap();
    this.cleanupAvatarObjectUrl();
    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  private showToast(type: 'success' | 'error', message: string, durationMs = 3000): void {
    this.toastType = type;
    this.toastMessage = String(message || '').trim();
    this.toastVisible = true;

    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }

    this.toastTimer = window.setTimeout(() => {
      this.toastVisible = false;
    }, durationMs);
  }

  setSection(section: ProfileSection): void {
    this.activeSection = section;
  }

  get avatarInitial(): string {
    const fromName = String(this.form.value.fullName || '').trim();
    const fromUser = String(this.me?.username || '').trim();
    const s = fromName || fromUser;
    return (s ? s[0] : 'U').toUpperCase();
  }

  onAvatarSelected(ev: Event): void {
    const input = ev?.target as HTMLInputElement | null;
    const file = input?.files?.[0] || null;
    if (!file) return;

    this.cleanupAvatarObjectUrl();
    this.avatarObjectUrl = URL.createObjectURL(file);
    this.avatarPreviewUrl = this.avatarObjectUrl;
  }

  setAddressMode(mode: AddressMode): void {
    this.addressMode = mode;
    this.addressError = '';
    this.applyAddressModeToForm();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.success = '';

    this.userData.getMe().subscribe({
      next: (res) => {
        this.loading = false;
        this.me = res?.data || null;
        const d = res?.data;
        this.form.patchValue({
          fullName: d?.fullName || '',
          phone: d?.phone || '',
          province: d?.province || '',
          district: d?.district || '',
          ward: d?.ward || '',
          addressDetail: d?.addressDetail || '',
          latitude: typeof d?.latitude === 'number' ? d!.latitude! : null,
          longitude: typeof d?.longitude === 'number' ? d!.longitude! : null
        });

        const dist = String(d?.district || '').trim();
        this.addressMode = dist ? 'DEPTH3' : 'VN2';
        this.applyAddressModeToForm();
      },
      error: (err) => {
        this.loading = false;
        this.showToast('error', err?.error?.message || 'Không thể tải thông tin tài khoản.');
      }
    });
  }

  save(): void {
    this.success = '';
    this.error = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showToast('error', 'Vui lòng nhập đầy đủ họ tên và số điện thoại.');
      return;
    }

    this.saving = true;
    const v = this.form.value;

    // Build province/district/ward strings based on the chosen mode.
    let province = (v.province || '') as string;
    let district = (v.district || '') as string;
    let ward = (v.ward || '') as string;

    if (this.addressMode === 'DEPTH3') {
      province = String(v.depth3ProvinceName || '').trim() || province;
      district = String(v.depth3DistrictName || '').trim() || district;
      ward = String(v.depth3WardName || '').trim() || ward;
    } else {
      const prov = this.vn2ProvinceOptions.find((x) => x.code === String(v.vn2ProvinceCode || ''));
      const com = this.vn2CommuneOptions.find((x) => x.code === String(v.vn2CommuneCode || ''));
      province = String(prov?.name || '').trim() || province;
      district = '';
      ward = String(com?.name || '').trim() || ward;
    }

    this.userData
      .updateMe({
        fullName: v.fullName || null,
        phone: v.phone || null,
        province: province || null,
        district: district || null,
        ward: ward || null,
        addressDetail: v.addressDetail || null,
        latitude: typeof v.latitude === 'number' ? v.latitude : null,
        longitude: typeof v.longitude === 'number' ? v.longitude : null
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.me = res?.data || null;
          const d = res?.data;
          this.form.patchValue({
            province: d?.province || null,
            district: d?.district || null,
            ward: d?.ward || null,
            addressDetail: d?.addressDetail || null,
            latitude: typeof d?.latitude === 'number' ? d!.latitude! : null,
            longitude: typeof d?.longitude === 'number' ? d!.longitude! : null
          });
          const dist = String(d?.district || '').trim();
          this.addressMode = dist ? 'DEPTH3' : 'VN2';
          this.applyAddressModeToForm();
          this.showToast('success', 'Đã lưu thông tin.');
        },
        error: (err) => {
          this.saving = false;
          this.showToast('error', err?.error?.message || 'Không thể lưu thông tin.');
        }
      });
  }

  onDepth3ProvinceChange(name: string): void {
    const provName = String(name || '').trim();
    const prov = this.depth3Provinces.find((p) => p.name === provName);
    this.depth3DistrictOptions = (prov?.districts || []).map((d) => d.name);
    this.depth3WardOptions = [];
    this.form.patchValue({
      depth3ProvinceName: provName,
      depth3DistrictName: '',
      depth3WardName: ''
    });
  }

  onDepth3DistrictChange(name: string): void {
    const provName = String(this.form.value.depth3ProvinceName || '').trim();
    const distName = String(name || '').trim();
    const prov = this.depth3Provinces.find((p) => p.name === provName);
    const dist = prov?.districts?.find((d) => d.name === distName);
    this.depth3WardOptions = (dist?.wards || []).map((w) => w.name);
    this.form.patchValue({
      depth3DistrictName: distName,
      depth3WardName: ''
    });
  }

  onDepth3WardChange(name: string): void {
    this.form.patchValue({ depth3WardName: String(name || '').trim() });
  }

  onVn2ProvinceChange(code: string): void {
    const c = String(code || '').trim();
    this.form.patchValue({ vn2ProvinceCode: c, vn2CommuneCode: '' });
    this.vn2CommuneOptions = [];
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

        if (this.pendingVn2CommuneName) {
          const com = this.bestMatchByName(this.vn2CommuneOptions, this.pendingVn2CommuneName);
          this.pendingVn2CommuneName = '';
          if (com) {
            this.form.patchValue({ vn2CommuneCode: com.code, ward: com.name, district: '' });
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
    const com = this.vn2CommuneOptions.find((x) => x.code === c) || null;
    this.form.patchValue({
      vn2CommuneCode: c,
      ward: com ? com.name : this.form.value.ward || '',
      district: ''
    });
  }

  useCurrentLocation(): void {
    this.error = '';
    this.success = '';
    if (!navigator.geolocation?.getCurrentPosition) {
      this.showToast('error', 'Trình duyệt không hỗ trợ lấy vị trí.');
      return;
    }

    this.addressLoading = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos?.coords?.latitude);
        const lng = Number(pos?.coords?.longitude);
        this.form.patchValue({ latitude: lat, longitude: lng });
        this.locations.reverseGeocode(lat, lng).subscribe({
          next: (res) => {
            this.addressLoading = false;
            const data = (res as any)?.data || {};
            this.applyReverseGeocode(data);
          },
          error: () => {
            this.addressLoading = false;
          }
        });
      },
      () => {
        this.addressLoading = false;
        this.showToast('error', 'Không lấy được vị trí hiện tại. Vui lòng cấp quyền truy cập vị trí.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
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

  private applyMapPick(latlng: L.LatLng): void {
    const lat = Number(latlng.lat);
    const lng = Number(latlng.lng);
    this.form.patchValue({ latitude: lat, longitude: lng });

    this.addressLoading = true;
    this.locations.reverseGeocode(lat, lng).subscribe({
      next: (res) => {
        this.addressLoading = false;
        const data = (res as any)?.data || {};
        this.applyReverseGeocode(data);
      },
      error: () => {
        this.addressLoading = false;
      }
    });
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
    this.form.patchValue({ latitude: lat, longitude: lng });

    this.addressLoading = true;
    this.locations.reverseGeocode(lat, lng).subscribe({
      next: (res) => {
        this.addressLoading = false;
        const data = (res as any)?.data || {};
        this.applyReverseGeocode(data);
      },
      error: () => {
        this.addressLoading = false;
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

    if (displayName) {
      this.form.patchValue({ addressDetail: displayName });
    }

    if (this.addressMode === 'VN2') {
      const prov = this.bestMatchByName(this.vn2ProvinceOptions, rawProvince);
      if (prov) {
        this.pendingVn2CommuneName = rawWard || rawDistrict;
        this.form.patchValue({ province: prov.name, district: '', vn2ProvinceCode: prov.code, vn2CommuneCode: '' });
        this.onVn2ProvinceChange(prov.code);
      } else {
        this.form.patchValue({ province: rawProvince, district: '', ward: rawWard || rawDistrict });
      }
      return;
    }

    const provinceName = this.bestMatch(this.depth3ProvinceOptions, rawProvince) || rawProvince;
    this.form.patchValue({ province: provinceName });
    this.onDepth3ProvinceChange(provinceName);

    const distName = this.bestMatch(this.depth3DistrictOptions, rawDistrict) || rawDistrict;
    this.form.patchValue({ district: distName });
    this.onDepth3DistrictChange(distName);

    const wardName = this.bestMatch(this.depth3WardOptions, rawWard) || rawWard;
    this.form.patchValue({ ward: wardName });
    this.onDepth3WardChange(wardName);
  }

  private bestMatch(options: string[], value: string): string {
    const q = String(value || '').trim();
    if (!q) return '';
    const ql = q.toLowerCase();
    const exact = options.find((x) => x.toLowerCase() === ql);
    if (exact) return exact;
    const inc = options.find((x) => x.toLowerCase().includes(ql));
    if (inc) return inc;
    const rev = options.find((x) => ql.includes(x.toLowerCase()));
    return rev || '';
  }

  private bestMatchByName<T extends { name: string }>(options: T[], value: string): T | null {
    const q = String(value || '').trim();
    if (!q) return null;
    const ql = q.toLowerCase();
    const exact = options.find((x) => String(x?.name || '').toLowerCase() === ql);
    if (exact) return exact;
    const inc = options.find((x) => String(x?.name || '').toLowerCase().includes(ql));
    if (inc) return inc;
    const rev = options.find((x) => ql.includes(String(x?.name || '').toLowerCase()));
    return rev || null;
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;
    if (this.map) return;

    const fallback = new L.LatLng(10.7769, 106.7009);
    const lat = this.form.value.latitude;
    const lng = this.form.value.longitude;
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
      this.applyMapPick(e.latlng);
    });

    window.setTimeout(() => {
      this.map?.invalidateSize();
    }, 50);
  }

  private tryCenterToCurrentLocation(): void {
    if (!this.map) return;
    const lat = this.form.value.latitude;
    const lng = this.form.value.longitude;
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
      this.mapMarker = L.marker(latlng, { draggable: false, icon: this.mapPinIcon }).addTo(this.map);
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

  private cleanupAvatarObjectUrl(): void {
    if (this.avatarObjectUrl) {
      try {
        URL.revokeObjectURL(this.avatarObjectUrl);
      } catch {
      }
    }
    this.avatarObjectUrl = null;
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

  private loadAddressDepth3(): void {
    this.addressError = '';
    this.locations.getVnDepth3().subscribe({
      next: (res) => {
        const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
        this.depth3Provinces = this.normalizeDepth3(rows);
        this.depth3ProvinceOptions = this.depth3Provinces.map((p) => p.name);
        this.applyAddressModeToForm();
      },
      error: () => {
        this.depth3Provinces = [];
        this.depth3ProvinceOptions = [];
        this.addressError = 'Không thể tải danh sách địa chỉ (3 cấp).';
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
        this.applyAddressModeToForm();
      },
      error: () => {
        this.vn2ProvinceOptions = [];
      }
    });
  }

  private applyAddressModeToForm(): void {
    const province = String(this.form.value.province || '').trim();
    const district = String(this.form.value.district || '').trim();
    const ward = String(this.form.value.ward || '').trim();

    if (this.addressMode === 'DEPTH3') {
      // Try best-effort re-select dropdowns from current saved strings.
      const prov = this.depth3Provinces.find((p) => p.name === province) || null;
      this.depth3DistrictOptions = (prov?.districts || []).map((d) => d.name);

      const dist = prov?.districts?.find((d) => d.name === district) || null;
      this.depth3WardOptions = (dist?.wards || []).map((w) => w.name);

      this.form.patchValue({
        depth3ProvinceName: prov ? prov.name : province,
        depth3DistrictName: dist ? dist.name : district,
        depth3WardName: ward
      });
      return;
    }

    const vn2Prov = this.vn2ProvinceOptions.find((p) => p.name === province) || null;
    this.form.patchValue({
      vn2ProvinceCode: vn2Prov ? vn2Prov.code : '',
      vn2CommuneCode: ''
    });
    if (vn2Prov) {
      this.pendingVn2CommuneName = ward;
      this.onVn2ProvinceChange(vn2Prov.code);
    }
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
}
