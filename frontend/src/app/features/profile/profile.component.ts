import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../../core/services/location.service';
import { UserAddressItem, UserBankAccountItem, UserDataService, UserMeResponse } from '../../core/services/user-data.service';

import * as L from 'leaflet';

type ProfileSection = 'profile' | 'bank' | 'address' | 'password' | 'notifications' | 'voucher' | 'danger';

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
  province?: string;
  district?: string;
  ward?: string;
  addressDetail?: string;
  latitude?: number | null;
  longitude?: number | null;
  vn2ProvinceCode?: string;
  vn2CommuneCode?: string;
  type?: string;
  isPrimary?: boolean;
}

interface BankAccount {
  id: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branchName?: string;
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
  bankAccounts: BankAccount[] = [];
  showAddBankForm = false;
  newBankAccount: Partial<BankAccount> = {
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    branchName: '',
    isPrimary: false
  };
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
    try {
      const savedSection = localStorage.getItem('fh_profile_section');
      if (savedSection === 'bank' || savedSection === 'address' || savedSection === 'voucher' || savedSection === 'notifications' || savedSection === 'password' || savedSection === 'danger' || savedSection === 'profile') {
        this.activeSection = savedSection;
      }
      localStorage.removeItem('fh_profile_section');
    } catch {
    }
    this.load();
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

  get displayName(): string {
    return String(this.form.value.fullName || this.me?.fullName || this.me?.username || 'Người dùng').trim();
  }

  get normalizedRoles(): string[] {
    const raw = Array.isArray(this.me?.roles) ? this.me!.roles! : [];
    return raw.map((role) => String(role || '').trim().toUpperCase()).filter(Boolean);
  }

  get isPrivilegedAccount(): boolean {
    return this.normalizedRoles.some((role) => ['ADMIN', 'ROLE_ADMIN', 'MANAGER', 'ROLE_MANAGER', 'STAFF', 'ROLE_STAFF'].includes(role));
  }

  get canRequestAccountDeletion(): boolean {
    return !this.isPrivilegedAccount;
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

  requestAccountDeletion(): void {
    if (!this.canRequestAccountDeletion) {
      this.showToast('error', 'Tài khoản nội bộ không được phép hủy tại trang hồ sơ.');
      return;
    }

    const confirmed = confirm('Bạn có chắc muốn gửi yêu cầu hủy tài khoản?');
    if (!confirmed) return;
    this.showToast('success', 'Đã ghi nhận yêu cầu hủy tài khoản. API xử lý hủy sẽ được nối ở bước tiếp theo.');
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

        this.loadAddresses();
        this.loadBankAccounts();
        this.applyVn2ToForm();
        this.hydrateAddressesFromMe();
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

    if (this.activeSection === 'address') {
      this.syncAddressesToBackend('Đã lưu địa chỉ thành công.');
      return;
    }

    if (this.form.invalid) {
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
    } catch (error) {
      this.addresses = [];
    }
  }

  private loadBankAccounts(): void {
    this.bankAccounts = this.userData.getBankAccounts(this.me?.id).map((item, index) => this.mapBankAccount(item, index));
  }

  private hydrateAddressesFromMe(): void {
    const apiAddresses = Array.isArray(this.me?.addresses) ? this.me!.addresses! : [];
    if (apiAddresses.length > 0) {
      this.addresses = apiAddresses.map((item, index) => this.mapApiAddressToUi(item, index));
      this.saveAddressesToStorage();
      return;
    }

    if (this.addresses.length > 0 || !this.me) return;

    const fallback = this.mapApiAddressToUi({
      id: Date.now(),
      name: this.me.fullName || 'Người nhận',
      phone: this.me.phone || '',
      province: this.me.province || '',
      district: this.me.district || '',
      ward: this.me.ward || '',
      addressDetail: this.me.addressDetail || '',
      latitude: this.me.latitude ?? null,
      longitude: this.me.longitude ?? null,
      type: 'Nhà Riêng',
      isPrimary: true
    }, 0);

    if (fallback.address || fallback.name || fallback.phone) {
      this.addresses = [fallback];
      this.saveAddressesToStorage();
    }
  }

  private syncAddressesToBackend(successMessage: string): void {
      const normalizedAddresses = this.addresses.map((addr, index) => this.mapUiAddressToApi(addr, index));
      const primary = normalizedAddresses.find((addr) => addr.isPrimary) || normalizedAddresses[0];
      if (!primary) return;
  
      const accountFormValue = this.form.getRawValue();
      const fullNameToSend = String(accountFormValue.fullName || this.me?.fullName || primary.name || '').trim();
      const phoneToSend = String(accountFormValue.phone || this.me?.phone || '').trim();
      this.addressLoading = true;
      this.userData.updateMe({
        fullName: fullNameToSend || null,
        phone: phoneToSend || null,
      province: primary.province || null,
      district: primary.district || null,
      ward: primary.ward || null,
      addressDetail: primary.addressDetail || null,
      latitude: typeof primary.latitude === 'number' ? primary.latitude : null,
      longitude: typeof primary.longitude === 'number' ? primary.longitude : null,
      addresses: normalizedAddresses
    }).subscribe({
      next: (res) => {
        this.addressLoading = false;
        this.me = res?.data || this.me;
        const d = res?.data;
        this.addresses = (Array.isArray(d?.addresses) ? d!.addresses! : normalizedAddresses)
          .map((item, index) => this.mapApiAddressToUi(item, index));
        this.saveAddressesToStorage();
        this.form.patchValue({
          fullName: d?.fullName || fullNameToSend,
          phone: d?.phone || phoneToSend,
          province: d?.province || primary.province || '',
          district: d?.district || '',
          ward: d?.ward || primary.ward || '',
          addressDetail: d?.addressDetail || primary.addressDetail || '',
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
    const formValue = this.form.getRawValue();
    const addressDetail = String(formValue.addressDetail || '').trim();
    const provinceName = String(formValue.province || '').trim();
    const wardName = String(formValue.ward || '').trim();

    return !!(
      this.newAddress.name?.trim() &&
      this.newAddress.phone?.trim() &&
      addressDetail &&
      (provinceName || wardName)
    );
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
    const formValue = this.form.getRawValue();
    const addressDetail = String(formValue.addressDetail || '').trim();
    const provinceCode = String(formValue.vn2ProvinceCode || '').trim();
    const communeCode = String(formValue.vn2CommuneCode || '').trim();
    const provinceName = String(formValue.province || '').trim();
    const districtName = String(formValue.district || '').trim();
    const wardName = String(formValue.ward || '').trim();
    const name = String(this.newAddress.name || '').trim();
    const phone = String(this.newAddress.phone || '').trim();
    const combinedAddress = [
      addressDetail,
      wardName,
      districtName,
      provinceName
    ].filter(Boolean).join(', ');

    this.newAddress.address = combinedAddress;

    const missing: string[] = [];
    if (!name) missing.push('họ tên');
    if (!phone) missing.push('số điện thoại');
    if (!addressDetail) missing.push('địa chỉ cụ thể');
    if (!provinceName && !wardName) missing.push('tỉnh/thành hoặc phường/xã');

    if (missing.length > 0 || !this.isNewAddressValid()) {
      const message = missing.length > 0
        ? `Thiếu: ${missing.join(', ')}.`
        : 'Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ.';
      this.addressError = message;
      this.showToast('error', message);
      return;
    }

    this.addressError = '';

    const address: Address = {
      id: Date.now(),
      name,
      phone,
      address: combinedAddress,
      province: provinceName,
      district: districtName,
      ward: wardName,
      addressDetail,
      latitude: typeof formValue.latitude === 'number' ? formValue.latitude : null,
      longitude: typeof formValue.longitude === 'number' ? formValue.longitude : null,
      vn2ProvinceCode: provinceCode,
      vn2CommuneCode: communeCode,
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
    this.syncAddressesToBackend('Đã thêm địa chỉ mới thành công.');
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
    this.syncAddressesToBackend('Đã cập nhật địa chỉ chính.');
  }

  isNewBankAccountValid(): boolean {
    return !!(
      String(this.newBankAccount.bankName || '').trim() &&
      String(this.newBankAccount.accountNumber || '').trim() &&
      String(this.newBankAccount.accountHolder || '').trim()
    );
  }

  openAddBankForm(): void {
    this.showAddBankForm = true;
    this.newBankAccount = {
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      branchName: '',
      isPrimary: this.bankAccounts.length === 0
    };
  }

  cancelAddBankForm(): void {
    this.showAddBankForm = false;
    this.newBankAccount = {
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      branchName: '',
      isPrimary: false
    };
  }

  saveBankAccount(): void {
    if (!this.isNewBankAccountValid()) {
      this.showToast('error', 'Vui lòng nhập đầy đủ ngân hàng, số tài khoản và tên chủ tài khoản.');
      return;
    }

    const account: BankAccount = {
      id: Date.now(),
      bankName: String(this.newBankAccount.bankName || '').trim(),
      accountNumber: String(this.newBankAccount.accountNumber || '').trim(),
      accountHolder: String(this.newBankAccount.accountHolder || '').trim(),
      branchName: String(this.newBankAccount.branchName || '').trim() || undefined,
      isPrimary: Boolean(this.newBankAccount.isPrimary || this.bankAccounts.length === 0)
    };

    if (account.isPrimary) {
      this.bankAccounts.forEach((item) => item.isPrimary = false);
      this.bankAccounts.unshift(account);
    } else {
      this.bankAccounts.push(account);
    }

    this.persistBankAccounts();
    this.cancelAddBankForm();
    this.showToast('success', 'Đã liên kết tài khoản ngân hàng.');
  }

  setPrimaryBankAccount(index: number): void {
    if (index < 0 || index >= this.bankAccounts.length) return;
    this.bankAccounts.forEach((item) => item.isPrimary = false);
    const primary = this.bankAccounts.splice(index, 1)[0];
    primary.isPrimary = true;
    this.bankAccounts.unshift(primary);
    this.persistBankAccounts();
    this.showToast('success', 'Đã cập nhật tài khoản ngân hàng mặc định.');
  }

  deleteBankAccount(index: number): void {
    if (index < 0 || index >= this.bankAccounts.length) return;
    this.bankAccounts.splice(index, 1);
    if (this.bankAccounts.length > 0 && !this.bankAccounts.some((item) => item.isPrimary)) {
      this.bankAccounts[0].isPrimary = true;
    }
    this.persistBankAccounts();
    this.showToast('success', 'Đã xóa tài khoản ngân hàng liên kết.');
  }

  maskBankAccountNumber(value: string | null | undefined): string {
    const raw = String(value || '').replace(/\s+/g, '');
    if (!raw) return '';
    if (raw.length <= 4) return raw;
    return `${'*'.repeat(Math.max(0, raw.length - 4))}${raw.slice(-4)}`;
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
      this.syncAddressesToBackend('Đã xóa địa chỉ thành công.');
    }

  private saveAddressesToStorage(): void {
    try {
      localStorage.setItem('addresses', JSON.stringify(this.addresses));
    } catch (error) {
    }
  }

  private persistBankAccounts(): void {
    const userId = this.me?.id;
    if (!userId) return;
    const payload = this.bankAccounts.map((item) => this.mapBankAccountToStorage(item));
    this.userData.saveBankAccounts(userId, payload);
  }

  private mapApiAddressToUi(item: UserAddressItem, index: number): Address {
    const addressDetail = String(item.addressDetail || '').trim();
    const ward = String(item.ward || '').trim();
    const province = String(item.province || '').trim();
    return {
      id: Number(item.id ?? Date.now() + index),
      name: String(item.name || '').trim(),
      phone: String(item.phone || '').trim(),
      address: [addressDetail, ward, province].filter(Boolean).join(', '),
      province,
      district: String(item.district || '').trim(),
      ward,
      addressDetail,
      latitude: typeof item.latitude === 'number' ? item.latitude : null,
      longitude: typeof item.longitude === 'number' ? item.longitude : null,
      type: String(item.type || '').trim() || undefined,
      isPrimary: Boolean(item.isPrimary)
    };
  }

  private mapUiAddressToApi(addr: Address, index: number): UserAddressItem {
      return {
        id: Number(addr.id || Date.now() + index),
        name: String(addr.name || '').trim() || null,
        phone: String(addr.phone || '').trim() || null,
        province: String(addr.province || '').trim() || null,
        district: String(addr.district || '').trim() || null,
        ward: String(addr.ward || '').trim() || null,
        addressDetail: String(addr.addressDetail || '').trim() || null,
        latitude: typeof addr.latitude === 'number' ? addr.latitude : null,
        longitude: typeof addr.longitude === 'number' ? addr.longitude : null,
        type: String(addr.type || '').trim() || null,
        isPrimary: Boolean(addr.isPrimary || index === 0)
      };
  }

  private mapBankAccount(item: UserBankAccountItem, index: number): BankAccount {
    return {
      id: Number(item.id ?? Date.now() + index),
      bankName: String(item.bankName || '').trim(),
      accountNumber: String(item.accountNumber || '').trim(),
      accountHolder: String(item.accountHolder || '').trim(),
      branchName: String(item.branchName || '').trim() || undefined,
      isPrimary: Boolean(item.isPrimary || index === 0)
    };
  }

  private mapBankAccountToStorage(item: BankAccount): UserBankAccountItem {
    return {
      id: item.id,
      bankName: item.bankName,
      accountNumber: item.accountNumber,
      accountHolder: item.accountHolder,
      branchName: item.branchName || null,
      isPrimary: Boolean(item.isPrimary)
    };
  }
}
