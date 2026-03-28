import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../../core/services/location.service';
import { UserDataService, UserMeResponse } from '../../core/services/user-data.service';

import * as L from 'leaflet';

type ProfileSection = 'profile' | 'bank' | 'address' | 'password' | 'notifications' | 'voucher';

interface Vn2Province {
  code: string;
  name: string;
}

interface Vn2Commune {
  code: string;
  name: string;
}

interface Address {
  id: number;
  name: string;
  phone: string;
  address: string;
  type?: string;
  isPrimary?: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
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

  // Voucher properties
  vouchers: any[] = [];
  voucherFilter: 'all' | 'available' | 'used' | 'expired' = 'all';
  voucherCode = '';
  voucherLoading = false;
  voucherError = '';
  voucherSuccess = '';

  get filteredVouchers(): any[] {
    if (!this.vouchers || this.voucherFilter === 'all') return this.vouchers || [];
    return this.vouchers.filter(v => v.status === this.voucherFilter.toUpperCase());
  }

  get safeFilteredVouchers(): any[] {
    return this.filteredVouchers || [];
  }

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

  addressLoading = false;
  addressError = '';
  showAddAddressForm = false;
  addresses: Address[] = [];
  newAddress: Partial<Address> = {
    name: '',
    phone: '',
    address: '',
    type: '',
    isPrimary: false
  };

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

    vn2ProvinceCode: [''],
    vn2CommuneCode: ['']
  });

  constructor(
    private fb: FormBuilder,
    private userData: UserDataService,
    private locations: LocationService
  ) {
    // Initialize vouchers to prevent undefined
    this.vouchers = [];
  }

  ngOnInit(): void {
    this.load();
    this.loadAddresses();
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

        this.applyVn2ToForm();
        this.seedAddressesFromProfile();
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

    if (this.activeSection !== 'address' && this.form.invalid) {
      this.form.markAllAsTouched();
      this.showToast('error', 'Vui lòng nhập đầy đủ họ tên và số điện thoại.');
      return;
    }

    this.saving = true;
    const v = this.form.value;

    const prov = this.vn2ProvinceOptions.find((x) => x.code === String(v.vn2ProvinceCode || ''));
    const com = this.vn2CommuneOptions.find((x) => x.code === String(v.vn2CommuneCode || ''));

    let province = String(prov?.name || v.province || '').trim();
    const district = '';
    const ward = String(com?.name || v.ward || '').trim();

    const fullNameToSend = String(v.fullName || '').trim() || String(this.me?.fullName || '').trim();
    const phoneToSend = String(v.phone || '').trim() || String(this.me?.phone || '').trim();

    this.userData
      .updateMe({
        fullName: fullNameToSend || null,
        phone: phoneToSend || null,
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
          this.applyVn2ToForm();
          this.showToast('success', 'Đã lưu thông tin.');
        },
        error: (err) => {
          this.saving = false;
          this.showToast('error', err?.error?.message || 'Không thể lưu thông tin.');
        }
      });
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

    const prov = this.bestMatchByName(this.vn2ProvinceOptions, rawProvince);
    if (prov) {
      this.pendingVn2CommuneName = rawWard || rawDistrict;
      this.form.patchValue({ province: prov.name, district: '', vn2ProvinceCode: prov.code, vn2CommuneCode: '' });
      this.onVn2ProvinceChange(prov.code);
    } else {
      this.form.patchValue({ province: rawProvince, district: '', ward: rawWard || rawDistrict });
    }
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

  private loadVn2Provinces(): void {
    this.locations.getVn2Provinces().subscribe({
      next: (res) => {
        const provincesRaw = (res as any)?.data?.provinces;
        const items = Array.isArray(provincesRaw) ? provincesRaw : [];
        this.vn2ProvinceOptions = items
          .map((x: any) => ({ code: String(x?.code || '').trim(), name: String(x?.name || '').trim() }))
          .filter((x: Vn2Province) => !!x.code && !!x.name)
          .sort((a: Vn2Province, b: Vn2Province) => a.name.localeCompare(b.name));
        this.applyVn2ToForm();
      },
      error: () => {
        this.vn2ProvinceOptions = [];
      }
    });
  }

  private applyVn2ToForm(): void {
    const province = String(this.form.value.province || '').trim();
    const ward = String(this.form.value.ward || '').trim();

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

  // Address management methods
  private loadAddresses(): void {
    try {
      const raw = localStorage.getItem('addresses');
      const addresses = raw ? JSON.parse(raw) : [];
      this.addresses = Array.isArray(addresses) ? addresses : [];
      console.log('📍 Loaded addresses:', this.addresses);
    } catch (error) {
      console.error('📍 Error loading addresses:', error);
      this.addresses = [];
    }
  }

  private seedAddressesFromProfile(): void {
    if (this.addresses.length > 0 || !this.me) return;

    const fullName = String(this.me.fullName || '').trim();
    const phone = String(this.me.phone || '').trim();
    const addressParts = [
      String(this.me.addressDetail || '').trim(),
      String(this.me.ward || '').trim(),
      String(this.me.province || '').trim()
    ].filter(Boolean);

    if (!fullName && !phone && addressParts.length === 0) return;

    this.addresses = [{
      id: Date.now(),
      name: fullName || 'Người nhận',
      phone: phone || '',
      address: addressParts.join(', '),
      isPrimary: true
    }];

    this.saveAddressesToStorage();
  }

  private syncPrimaryAddressToBackend(successMessage: string): void {
    const primary = this.addresses.find((addr) => addr.isPrimary) || this.addresses[0];
    if (!primary) return;

    const v = this.form.value;
    const prov = this.vn2ProvinceOptions.find((x) => x.code === String(v.vn2ProvinceCode || ''));
    const com = this.vn2CommuneOptions.find((x) => x.code === String(v.vn2CommuneCode || ''));
    const fullNameToSend = primary.name?.trim() || String(v.fullName || '').trim() || String(this.me?.fullName || '').trim();
    const phoneToSend = primary.phone?.trim() || String(v.phone || '').trim() || String(this.me?.phone || '').trim();
    const province = String(prov?.name || v.province || this.me?.province || '').trim();
    const ward = String(com?.name || v.ward || this.me?.ward || '').trim();
    const addressDetail = String(v.addressDetail || '').trim() || primary.address;

    this.addressLoading = true;
    this.userData.updateMe({
      fullName: fullNameToSend || null,
      phone: phoneToSend || null,
      province: province || null,
      district: null,
      ward: ward || null,
      addressDetail: addressDetail || null,
      latitude: typeof v.latitude === 'number' ? v.latitude : (typeof this.me?.latitude === 'number' ? this.me.latitude : null),
      longitude: typeof v.longitude === 'number' ? v.longitude : (typeof this.me?.longitude === 'number' ? this.me.longitude : null)
    }).subscribe({
      next: (res) => {
        this.addressLoading = false;
        this.me = res?.data || this.me;
        const d = res?.data;
        this.form.patchValue({
          fullName: d?.fullName || fullNameToSend,
          phone: d?.phone || phoneToSend,
          province: d?.province || province,
          district: d?.district || '',
          ward: d?.ward || ward,
          addressDetail: d?.addressDetail || addressDetail,
          latitude: typeof d?.latitude === 'number' ? d.latitude : this.form.value.latitude,
          longitude: typeof d?.longitude === 'number' ? d.longitude : this.form.value.longitude
        });
        this.applyVn2ToForm();
        this.showToast('success', successMessage);
      },
      error: (err) => {
        this.addressLoading = false;
        this.showToast('error', err?.error?.message || 'Không thể lưu địa chỉ lên hệ thống.');
      }
    });
  }

  isNewAddressValid(): boolean {
    return !!(this.newAddress.name?.trim() && 
              this.newAddress.phone?.trim() && 
              this.newAddress.address?.trim());
  }

  cancelAddAddress(): void {
    this.showAddAddressForm = false;
    this.resetNewAddress();
  }

  resetNewAddress(): void {
    this.newAddress = {
      name: '',
      phone: '',
      address: '',
      type: '',
      isPrimary: false
    };
  }

  saveNewAddress(): void {
    if (!this.isNewAddressValid()) {
      this.showToast('error', 'Vui lòng nhập đầy đủ thông tin bắt buộc.');
      return;
    }

    const address: Address = {
      id: Date.now(),
      name: this.newAddress.name!.trim(),
      phone: this.newAddress.phone!.trim(),
      address: this.newAddress.address!.trim(),
      type: this.newAddress.type || undefined,
      isPrimary: this.newAddress.isPrimary || false
    };

    // If setting as primary, move existing primary to regular
    if (address.isPrimary) {
      this.addresses.forEach(addr => addr.isPrimary = false);
      this.addresses.unshift(address);
    } else {
      this.addresses.push(address);
    }

    this.saveAddressesToStorage();
    this.showAddAddressForm = false;
    this.resetNewAddress();
    this.syncPrimaryAddressToBackend('Đã thêm địa chỉ mới thành công.');
    console.log('📍 Added new address:', address);
  }

  setPrimaryAddress(index: number): void {
    if (index < 0 || index >= this.addresses.length) return;

    // Remove primary from all addresses
    this.addresses.forEach(addr => addr.isPrimary = false);
    
    // Set new primary and move to top
    const primaryAddress = this.addresses.splice(index, 1)[0];
    primaryAddress.isPrimary = true;
    this.addresses.unshift(primaryAddress);

    this.saveAddressesToStorage();
    this.syncPrimaryAddressToBackend('Đã cập nhật địa chỉ chính.');
    console.log('📍 Set primary address:', primaryAddress);
  }

  // Voucher methods
  applyVoucherCode(): void {
    if (!this.voucherCode.trim()) return;

    this.voucherLoading = true;
    this.voucherError = '';
    this.voucherSuccess = '';

    // Simulate API call
    setTimeout(() => {
      // Mock voucher for demo
      const mockVoucher = {
        id: Date.now(),
        name: `VOUCHER-${this.voucherCode.toUpperCase()}`,
        code: this.voucherCode.toUpperCase(),
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderAmount: 100000,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'AVAILABLE'
      };

      this.vouchers.unshift(mockVoucher);
      this.voucherSuccess = `Đã áp dụng voucher ${mockVoucher.code} thành công!`;
      this.voucherCode = '';
      this.voucherLoading = false;

      setTimeout(() => {
        this.voucherSuccess = '';
      }, 3000);
    }, 1000);
  }

  useVoucher(voucher: any): void {
    // Update voucher status
    voucher.status = 'USED';
    voucher.usedDate = new Date();
    
    this.showToast('success', `Đã sử dụng voucher ${voucher.code}!`);
    console.log('🎫 Used voucher:', voucher);
  }

  viewVoucherDetails(voucher: any): void {
    // Show voucher details in modal or alert
    const details = `
      Mã: ${voucher.code}
      Giảm giá: ${voucher.discountType === 'PERCENTAGE' ? voucher.discountValue + '%' : this.formatMoney(voucher.discountValue)}
      Đơn tối thiểu: ${this.formatMoney(voucher.minOrderAmount || 0)}
      Hết hạn: ${this.formatDate(voucher.expiryDate)}
      Trạng thái: ${voucher.status === 'AVAILABLE' ? 'Khả dụng' : voucher.status === 'USED' ? 'Đã dùng' : 'Hết hạn'}
    `;
    
    alert(details.trim());
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  deleteAddress(index: number): void {
    if (index < 0 || index >= this.addresses.length) return;

    const address = this.addresses[index];
    
    // Don't allow deleting if it's the only address
    if (this.addresses.length === 1) {
      this.showToast('error', 'Phải có ít nhất một địa chỉ.');
      return;
    }

    this.addresses.splice(index, 1);
    
    // If deleted address was primary, set first address as primary
      if (address.isPrimary && this.addresses.length > 0) {
        this.addresses[0].isPrimary = true;
      }
  
      this.saveAddressesToStorage();
      this.syncPrimaryAddressToBackend('Đã xóa địa chỉ thành công.');
      console.log('📍 Deleted address:', address);
    }

  private saveAddressesToStorage(): void {
    try {
      localStorage.setItem('addresses', JSON.stringify(this.addresses));
      console.log('📍 Saved addresses to storage:', this.addresses.length);
    } catch (error) {
      console.error('📍 Error saving addresses:', error);
    }
  }
}
