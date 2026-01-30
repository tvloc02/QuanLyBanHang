import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LocationService } from '../../core/services/location.service';
import { UserDataService, UserMeResponse } from '../../core/services/user-data.service';

type AddressMode = 'DEPTH3' | 'VN2';

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
export class ProfileComponent implements OnInit {
  loading = false;
  saving = false;
  error = '';
  success = '';

  me: UserMeResponse | null = null;

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

  form = this.fb.group({
    fullName: ['', [Validators.required]],
    phone: ['', [Validators.required]],
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
        this.error = err?.error?.message || 'Không thể tải thông tin tài khoản.';
      }
    });
  }

  save(): void {
    this.success = '';
    this.error = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Vui lòng nhập đầy đủ họ tên và số điện thoại.';
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
          this.success = 'Đã lưu thông tin.';
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Không thể lưu thông tin.';
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
      },
      error: () => {
        this.vn2Loading = false;
        this.vn2CommuneOptions = [];
      }
    });
  }

  onVn2CommuneChange(code: string): void {
    this.form.patchValue({ vn2CommuneCode: String(code || '').trim() });
  }

  useCurrentLocation(): void {
    this.error = '';
    this.success = '';
    if (!navigator.geolocation?.getCurrentPosition) {
      this.error = 'Trình duyệt không hỗ trợ lấy vị trí.';
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
            const addr = (data as any)?.address || {};
            const province = String(addr.state || addr.city || addr['ISO3166-2-lvl4'] || '').trim();
            const district = String(addr.county || addr.city_district || '').trim();
            const ward = String(addr.suburb || addr.village || addr.quarter || addr.town || '').trim();
            const displayName = String((data as any)?.display_name || '').trim();

            if (displayName && !String(this.form.value.addressDetail || '').trim()) {
              this.form.patchValue({ addressDetail: displayName });
            }
            if (province && !String(this.form.value.province || '').trim()) {
              this.form.patchValue({ province });
            }
            if (district && !String(this.form.value.district || '').trim()) {
              this.form.patchValue({ district });
            }
            if (ward && !String(this.form.value.ward || '').trim()) {
              this.form.patchValue({ ward });
            }
          },
          error: () => {
            this.addressLoading = false;
          }
        });
      },
      () => {
        this.addressLoading = false;
        this.error = 'Không lấy được vị trí hiện tại. Vui lòng cấp quyền truy cập vị trí.';
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
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
