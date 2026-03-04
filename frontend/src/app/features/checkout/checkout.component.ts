import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HOME_CONFIG } from '../home/home.config';
import { FooterComponent } from '../../shared/footer/footer.component';
import { AuthService } from '../../core/services/auth.service';
import { UserDataService } from '../../core/services/user-data.service';
import { LocationService } from '../../core/services/location.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import * as L from 'leaflet';

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

type AddressMode = 'before_merge' | 'after_merge';

interface CartItem {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FooterComponent],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  readonly cfg = HOME_CONFIG;
  items: CartItem[] = [];

  fullName = '';
  phone = '';

  addressMode: AddressMode = 'after_merge';

  province = '';
  district = '';
  ward = '';
  addressDetail = '';
  note = '';

  latitude: number | null = null;
  longitude: number | null = null;

  saveToProfile = true;

  paymentMethod: 'cod' | 'bank' = 'cod';

  placed = false;
  error = '';

  placing = false;

  private shippingFeeValue = 0;
  private quoteBranchId: number | null = null;
  private quoteDistanceKm: number | null = null;

  addressLoading = false;
  addressLoadError = '';

  private addressDataAll: ProvinceNode[] = [];
  provinceOptions: string[] = [];
  districtOptions: string[] = [];
  wardOptions: string[] = [];

  vn2Loading = false;
  vn2ProvinceOptions: Vn2Province[] = [];
  vn2CommuneOptions: Vn2Commune[] = [];
  vn2ProvinceCode = '';
  vn2CommuneCode = '';
  private pendingVn2CommuneName = '';

  mapOpen = false;
  mapError = '';

  private draftTimer: number | null = null;
  private profileSaveTimer: number | null = null;

  private map: L.Map | null = null;
  private mapMarker: L.Marker | null = null;
  private pendingLatLng: L.LatLng | null = null;

  @ViewChild('mapContainer')
  private mapContainer?: ElementRef<HTMLDivElement>;

  constructor(
    private router: Router,
    private auth: AuthService,
    private userData: UserDataService,
    private locations: LocationService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadDraft();
    this.loadCart();
    this.loadAddressData();
    this.loadVn2Provinces();
    this.prefillFromProfile();

    this.configureLeafletDefaultIcon();

    this.refreshQuote();
  }

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  ngOnDestroy(): void {
    this.destroyMap();
    if (this.draftTimer) {
      window.clearTimeout(this.draftTimer);
      this.draftTimer = null;
    }
    if (this.profileSaveTimer) {
      window.clearTimeout(this.profileSaveTimer);
      this.profileSaveTimer = null;
    }
  }

  setFullName(v: string): void {
    this.fullName = String(v || '');
    this.scheduleDraftSave();
    this.scheduleProfileSave();
  }

  setPhone(v: string): void {
    this.phone = String(v || '');
    this.scheduleDraftSave();
    this.scheduleProfileSave();
  }

  setAddressDetail(v: string): void {
    this.addressDetail = String(v || '');
    this.scheduleDraftSave();
    this.scheduleProfileSave();
  }

  setNote(v: string): void {
    this.note = String(v || '');
    this.scheduleDraftSave();
  }

  setSaveToProfile(v: boolean): void {
    this.saveToProfile = !!v;
    this.scheduleDraftSave();
    this.scheduleProfileSave();
  }

  private prefillFromProfile(): void {
    if (!this.auth.isAuthenticated()) return;
    this.userData.getMe().subscribe({
      next: (res) => {
        const d = res?.data;
        if (!d) return;

        if (!this.fullName.trim() && d.fullName) this.fullName = d.fullName;
        if (!this.phone.trim() && d.phone) this.phone = d.phone;

        if (!this.province.trim() && d.province) this.province = d.province;
        if (!this.district.trim() && d.district) this.district = d.district;
        if (!this.ward.trim() && d.ward) this.ward = d.ward;
        if (!this.addressDetail.trim() && d.addressDetail) this.addressDetail = d.addressDetail;

        if (this.latitude == null && typeof d.latitude === 'number') this.latitude = d.latitude;
        if (this.longitude == null && typeof d.longitude === 'number') this.longitude = d.longitude;

        // Heuristic: if profile has district => old 3-level; otherwise new 2-level.
        this.addressMode = this.district.trim() ? 'before_merge' : 'after_merge';

        if (this.addressMode === 'after_merge') {
          const prov = this.bestMatchByName(this.vn2ProvinceOptions, this.province);
          if (prov) {
            this.vn2ProvinceCode = prov.code;
            this.pendingVn2CommuneName = this.ward;
            this.onVn2ProvinceChange(this.vn2ProvinceCode);
          }
        }

        // Best-effort re-sync dependent dropdown options.
        this.applyAddressSelection();
      },
      error: () => {
      }
    });
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;
    if (this.map) return;

    const fallback = new L.LatLng(10.7769, 106.7009);
    const start =
      typeof this.latitude === 'number' && typeof this.longitude === 'number'
        ? new L.LatLng(this.latitude, this.longitude)
        : fallback;

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
    if (typeof this.latitude === 'number' && typeof this.longitude === 'number') return;

    const geo = (globalThis as any)?.navigator?.geolocation;
    if (!geo?.getCurrentPosition) return;

    geo.getCurrentPosition(
      (pos: GeolocationPosition) => {
        const lat = Number(pos?.coords?.latitude);
        const lng = Number(pos?.coords?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const ll = new L.LatLng(lat, lng);
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
    this.latitude = lat;
    this.longitude = lng;

    this.addressLoading = true;
    this.locations.reverseGeocode(lat, lng).subscribe({
      next: (res) => {
        this.addressLoading = false;
        const data = (res as any)?.data || {};
        this.applyReverseGeocode(data);
        this.scheduleDraftSave();
        this.scheduleProfileSave();

        this.refreshQuote();
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

    if (displayName && !this.addressDetail.trim()) {
      this.addressDetail = displayName;
    }

    if (this.addressMode === 'after_merge') {
      const prov = this.bestMatchByName(this.vn2ProvinceOptions, rawProvince);
      if (prov) {
        this.vn2ProvinceCode = prov.code;
        this.pendingVn2CommuneName = rawWard || rawDistrict;
        this.onVn2ProvinceChange(this.vn2ProvinceCode);
      }
      this.scheduleDraftSave();
      this.scheduleProfileSave();
      return;
    }

    const province = this.bestMatch(this.provinceOptions, rawProvince);
    if (province) {
      this.province = province;
      this.onProvinceChange(this.province);
    }

    const district = this.bestMatch(this.districtOptions, rawDistrict);
    if (district) {
      this.district = district;
      this.onDistrictChange(this.district);
    }

    const ward = this.bestMatch(this.wardOptions, rawWard);
    if (ward) {
      this.ward = ward;
      this.onWardChange(this.ward);
    }

    this.scheduleDraftSave();
    this.scheduleProfileSave();
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

  private scheduleDraftSave(): void {
    if (this.draftTimer) {
      window.clearTimeout(this.draftTimer);
      this.draftTimer = null;
    }
    this.draftTimer = window.setTimeout(() => {
      this.draftTimer = null;
      this.saveDraft();
    }, 400);
  }

  private saveDraft(): void {
    try {
      const payload = {
        fullName: this.fullName,
        phone: this.phone,
        addressMode: this.addressMode,
        province: this.province,
        district: this.district,
        ward: this.ward,
        addressDetail: this.addressDetail,
        note: this.note,
        latitude: this.latitude,
        longitude: this.longitude,
        vn2ProvinceCode: this.vn2ProvinceCode,
        vn2CommuneCode: this.vn2CommuneCode,
        saveToProfile: this.saveToProfile
      };
      localStorage.setItem('checkout_draft', JSON.stringify(payload));
    } catch {
    }
  }

  private loadDraft(): void {
    try {
      const raw = localStorage.getItem('checkout_draft');
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return;

      if (typeof d.fullName === 'string') this.fullName = d.fullName;
      if (typeof d.phone === 'string') this.phone = d.phone;
      if (d.addressMode === 'before_merge' || d.addressMode === 'after_merge') this.addressMode = d.addressMode;

      if (typeof d.province === 'string') this.province = d.province;
      if (typeof d.district === 'string') this.district = d.district;
      if (typeof d.ward === 'string') this.ward = d.ward;
      if (typeof d.addressDetail === 'string') this.addressDetail = d.addressDetail;
      if (typeof d.note === 'string') this.note = d.note;

      if (typeof d.latitude === 'number') this.latitude = d.latitude;
      if (typeof d.longitude === 'number') this.longitude = d.longitude;

      if (typeof d.vn2ProvinceCode === 'string') this.vn2ProvinceCode = d.vn2ProvinceCode;
      if (typeof d.vn2CommuneCode === 'string') this.vn2CommuneCode = d.vn2CommuneCode;
      if (typeof d.saveToProfile === 'boolean') this.saveToProfile = d.saveToProfile;

      if (this.addressMode === 'after_merge' && this.ward.trim()) {
        this.pendingVn2CommuneName = this.ward;
      }
    } catch {
    }
  }

  private scheduleProfileSave(): void {
    if (!this.auth.isAuthenticated()) return;
    if (!this.saveToProfile) return;

    if (this.profileSaveTimer) {
      window.clearTimeout(this.profileSaveTimer);
      this.profileSaveTimer = null;
    }

    this.profileSaveTimer = window.setTimeout(() => {
      this.profileSaveTimer = null;

      const fullName = this.fullName.trim();
      const phone = this.phone.trim();
      const province = this.province.trim();
      const district = this.district.trim();
      const ward = this.ward.trim();
      const addressDetail = this.addressDetail.trim();

      if (!fullName || !phone || !province || !ward || !addressDetail) return;
      if (this.addressMode === 'before_merge' && !district) return;

      this.userData
        .updateMe({
          fullName,
          phone,
          province,
          district: this.addressMode === 'after_merge' ? '' : district,
          ward,
          addressDetail,
          latitude: this.latitude,
          longitude: this.longitude
        })
        .subscribe({
          next: () => {
          },
          error: () => {
          }
        });
    }, 700);
  }
  onAddressModeChange(mode: AddressMode): void {
    if (this.addressMode === mode) return;
    this.addressMode = mode;

    this.province = '';
    this.district = '';
    this.ward = '';

    this.districtOptions = [];
    this.wardOptions = [];

    this.vn2ProvinceCode = '';
    this.vn2CommuneCode = '';
    this.vn2CommuneOptions = [];
    this.pendingVn2CommuneName = '';

    this.scheduleDraftSave();
    this.scheduleProfileSave();
  }

  get canPickDistrict(): boolean {
    return this.addressMode === 'before_merge' && !!this.province.trim() && this.districtOptions.length > 0;
  }

  get canPickWard(): boolean {
    if (this.addressMode === 'after_merge') {
      return !!this.vn2ProvinceCode && this.vn2CommuneOptions.length > 0;
    }
    return !!this.district.trim() && this.wardOptions.length > 0;
  }

  private findProvince(name: string): ProvinceNode | undefined {
    const n = name.trim().toLowerCase();
    if (!n) return undefined;
    return this.addressData.find((p) => p.name.toLowerCase() === n);
  }

  private findDistrict(province: ProvinceNode | undefined, name: string): DistrictNode | undefined {
    if (!province) return undefined;
    const n = name.trim().toLowerCase();
    if (!n) return undefined;
    return province.districts.find((d) => d.name.toLowerCase() === n);
  }

  private get addressData(): ProvinceNode[] {
    // NOTE: "before_merge" vs "after_merge" currently reuses the same official dataset.
    // If you later provide a "before merge" dataset, we can swap it here.
    return this.addressDataAll;
  }

  private loadAddressData(): void {
    this.addressLoadError = '';
    this.addressLoading = true;
    this.locations.getVnDepth3().subscribe({
      next: (res) => {
        const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
        this.addressDataAll = this.normalizeAddressData(rows);
        this.provinceOptions = this.addressDataAll.map((p) => p.name);
        this.addressLoading = false;
        this.applyAddressSelection();
      },
      error: () => {
        this.addressLoading = false;
        this.addressDataAll = [];
        this.provinceOptions = [];
        this.districtOptions = [];
        this.wardOptions = [];
        this.addressLoadError = 'Không thể tải danh sách địa chỉ.';
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

        if (this.addressMode === 'after_merge') {
          if (this.vn2ProvinceCode) {
            this.onVn2ProvinceChange(this.vn2ProvinceCode);
            return;
          }

          if (this.province.trim()) {
            const prov = this.bestMatchByName(this.vn2ProvinceOptions, this.province);
            if (prov) {
              this.vn2ProvinceCode = prov.code;
              this.onVn2ProvinceChange(this.vn2ProvinceCode);
            }
          }
        }
      },
      error: () => {
        this.vn2ProvinceOptions = [];
      }
    });
  }

  onVn2ProvinceChange(code: string): void {
    const c = String(code || '').trim();
    const prevCommuneCode = String(this.vn2CommuneCode || '').trim();
    this.vn2ProvinceCode = c;
    this.vn2CommuneCode = '';
    this.vn2CommuneOptions = [];

    const prov = this.vn2ProvinceOptions.find((x) => x.code === c);
    this.province = String(prov?.name || '').trim();
    this.district = '';
    this.ward = '';

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
            this.vn2CommuneCode = com.code;
            this.onVn2CommuneChange(this.vn2CommuneCode);
          }
        } else if (prevCommuneCode) {
          const com = this.vn2CommuneOptions.find((x) => x.code === prevCommuneCode) || null;
          if (com) {
            this.vn2CommuneCode = com.code;
            this.onVn2CommuneChange(this.vn2CommuneCode);
          }
        }

        this.scheduleDraftSave();
        this.scheduleProfileSave();
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
    const com = this.vn2CommuneOptions.find((x) => x.code === c);
    this.ward = String(com?.name || '').trim();

    this.scheduleDraftSave();
    this.scheduleProfileSave();
  }

  onProvinceChange(name: string): void {
    if (this.addressMode !== 'before_merge') return;
    this.province = String(name || '').trim();
    this.district = '';
    this.ward = '';
    const prov = this.findProvince(this.province);
    this.districtOptions = (prov?.districts || []).map((d) => d.name);
    this.wardOptions = [];

    this.scheduleDraftSave();
    this.scheduleProfileSave();
  }

  onDistrictChange(name: string): void {
    if (this.addressMode !== 'before_merge') return;
    this.district = String(name || '').trim();
    this.ward = '';
    const prov = this.findProvince(this.province);
    const dist = this.findDistrict(prov, this.district);
    this.wardOptions = (dist?.wards || []).map((w) => w.name);

    this.scheduleDraftSave();
    this.scheduleProfileSave();
  }

  onWardChange(name: string): void {
    if (this.addressMode !== 'before_merge') return;
    this.ward = String(name || '').trim();

    this.scheduleDraftSave();
    this.scheduleProfileSave();
  }

  private applyAddressSelection(): void {
    if (this.addressMode !== 'before_merge') return;
    const prov = this.findProvince(this.province);
    this.districtOptions = (prov?.districts || []).map((d) => d.name);

    const dist = this.findDistrict(prov, this.district);
    this.wardOptions = (dist?.wards || []).map((w) => w.name);
  }

  private normalizeAddressData(data: any[]): ProvinceNode[] {
    if (!Array.isArray(data)) return [];
    return data
      .map((p) => {
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
      .filter((p) => !!p.name);
  }

  private loadCart(): void {
    try {
      const raw = localStorage.getItem('cart');
      const arr = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(arr)) {
        this.items = arr
          .map((x) => x as Partial<CartItem>)
          .filter((x) => typeof x.id === 'number' && typeof x.price === 'number')
          .map((x) => ({
            id: x.id!,
            name: x.name || 'Sản phẩm',
            slug: x.slug || '',
            imageUrl: x.imageUrl,
            price: x.price!,
            quantity: typeof x.quantity === 'number' && x.quantity > 0 ? x.quantity : 1,
            size: x.size,
            color: x.color
          }));
      } else {
        this.items = [];
      }
    } catch {
      this.items = [];
    }
  }

  get subtotal(): number {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  get shippingFee(): number {
    return this.shippingFeeValue;
  }

  get total(): number {
    return this.subtotal + this.shippingFee;
  }

  formatMoney(v: number): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(v));
  }

  placeOrder(): void {
    this.error = '';
    if (this.items.length === 0) {
      this.error = 'Giỏ hàng đang trống.';
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.error = 'Vui lòng đăng nhập để đặt hàng.';
      return;
    }

    if (
      !this.fullName.trim() ||
      !this.phone.trim() ||
      !this.province.trim() ||
      !this.ward.trim() ||
      !this.addressDetail.trim()
    ) {
      this.error = 'Vui lòng nhập đầy đủ thông tin giao hàng.';
      return;
    }

    if (this.addressMode === 'before_merge' && !this.district.trim()) {
      this.error = 'Vui lòng chọn quận/huyện.';
      return;
    }

    const userId = this.getCurrentUserId();
    if (!userId) {
      this.error = 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
      return;
    }

    this.placing = true;

    if (this.auth.isAuthenticated() && this.saveToProfile) {
      this.userData
        .updateMe({
          fullName: this.fullName.trim(),
          phone: this.phone.trim(),
          province: this.province.trim(),
          district: this.district.trim(),
          ward: this.ward.trim(),
          addressDetail: this.addressDetail.trim(),
          latitude: this.latitude,
          longitude: this.longitude
        })
        .subscribe({
          next: () => {
          },
          error: () => {
          }
        });
    }

    this.refreshQuote(() => {
      const payload = {
        userId,
        items: this.items.map((i) => ({
          productId: i.id,
          productName: i.name,
          quantity: i.quantity,
          unitPrice: i.price
        })),
        couponCode: null,
        shippingFullName: this.fullName.trim(),
        shippingPhone: this.phone.trim(),
        shippingProvince: this.province.trim(),
        shippingWard: this.ward.trim(),
        shippingAddressDetail: this.addressDetail.trim(),
        branchId: this.quoteBranchId,
        shippingLatitude: this.latitude,
        shippingLongitude: this.longitude
      };

      this.http.post<any>(`${environment.apiBaseUrl}/api/orders`, payload).subscribe({
        next: (res) => {
          this.placing = false;
          if (!res?.success) {
            this.error = res?.message || 'Đặt hàng thất bại.';
            return;
          }

          localStorage.removeItem('cart');
          this.placed = true;
          window.setTimeout(() => {
            const q = new URLSearchParams();
            if (res?.data?.id) q.set('orderId', String(res.data.id));
            if (payload?.shippingPhone) q.set('phone', String(payload.shippingPhone));
            const qs = q.toString();
            this.router.navigateByUrl(`/${qs ? `?${qs}` : ''}`);
          }, 1200);
        },
        error: () => {
          this.placing = false;
          this.error = 'Không thể kết nối backend để đặt hàng.';
        }
      });
    });
  }

  private getCurrentUserId(): number | null {
    try {
      const raw = localStorage.getItem('fh_userId');
      const n = raw != null ? Number(raw) : NaN;
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  private refreshQuote(done?: () => void): void {
    if (!this.auth.isAuthenticated()) {
      done?.();
      return;
    }
    const items = this.items.map((i) => ({
      productId: i.id,
      productName: i.name,
      quantity: i.quantity,
      unitPrice: i.price
    }));

    this.http
      .post<any>(`${environment.apiBaseUrl}/api/orders/quote`, {
        items,
        shippingLatitude: this.latitude,
        shippingLongitude: this.longitude,
        branchId: this.quoteBranchId
      })
      .subscribe({
        next: (res) => {
          if (res?.success) {
            const d = res?.data;
            const fee = Number(d?.shippingFee ?? 0);
            this.shippingFeeValue = Number.isFinite(fee) ? fee : 0;
            const bid = Number(d?.branchId);
            this.quoteBranchId = Number.isFinite(bid) ? bid : null;
            const dist = Number(d?.shippingDistanceKm);
            this.quoteDistanceKm = Number.isFinite(dist) ? dist : null;
          }
          done?.();
        },
        error: () => {
          this.shippingFeeValue = 0;
          done?.();
        }
      });
  }

  backToCart(): void {
    this.router.navigateByUrl('/cart');
  }
}

