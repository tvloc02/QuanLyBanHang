import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HOME_CONFIG } from '../home/home.config';
import { FooterComponent } from '../../shared/footer/footer.component';

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
export class CheckoutComponent implements OnInit {
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

  paymentMethod: 'cod' | 'bank' = 'cod';

  placed = false;
  error = '';

  // Autocomplete UI
  activeSuggest: 'province' | 'district' | 'ward' | null = null;
  provinceQuery = '';
  districtQuery = '';
  wardQuery = '';

  addressLoading = false;
  addressLoadError = '';
  private addressDataAll: ProvinceNode[] = [];

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadCart();
    this.loadAddressData();
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.activeSuggest = null;
  }

  onAddressModeChange(mode: AddressMode): void {
    if (this.addressMode === mode) return;
    this.addressMode = mode;
    this.province = '';
    this.district = '';
    this.ward = '';
    this.provinceQuery = '';
    this.districtQuery = this.district;
    this.wardQuery = this.ward;
    this.activeSuggest = null;
  }

  focusSuggest(kind: 'province' | 'district' | 'ward'): void {
    this.activeSuggest = kind;
  }

  onProvinceInput(value: string): void {
    this.provinceQuery = value;
    this.province = value;
    this.district = '';
    this.ward = '';
    this.districtQuery = '';
    this.wardQuery = '';
    this.activeSuggest = 'province';
  }

  onDistrictInput(value: string): void {
    this.districtQuery = value;
    this.district = value;
    this.ward = '';
    this.wardQuery = '';
    this.activeSuggest = 'district';
  }

  onWardInput(value: string): void {
    this.wardQuery = value;
    this.ward = value;
    this.activeSuggest = 'ward';
  }

  selectProvince(name: string): void {
    this.province = name;
    this.provinceQuery = name;
    this.district = '';
    this.ward = '';
    this.districtQuery = '';
    this.wardQuery = '';
    this.activeSuggest = null;
  }

  selectDistrict(name: string): void {
    this.district = name;
    this.districtQuery = name;
    this.ward = '';
    this.wardQuery = '';
    this.activeSuggest = null;
  }

  selectWard(name: string): void {
    this.ward = name;
    this.wardQuery = name;
    this.activeSuggest = null;
  }

  get provinceSuggest(): string[] {
    const q = this.provinceQuery.trim().toLowerCase();
    const items = this.addressData.map((p) => p.name);
    if (!q) return items.slice(0, 10);
    return items.filter((x) => x.toLowerCase().includes(q)).slice(0, 10);
  }

  get districtSuggest(): string[] {
    const province = this.findProvince(this.province);
    const items = province?.districts.map((d) => d.name) || [];
    const q = this.districtQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 10);
    return items.filter((x) => x.toLowerCase().includes(q)).slice(0, 10);
  }

  get wardSuggest(): string[] {
    const province = this.findProvince(this.province);
    const district = this.findDistrict(province, this.district);
    const items = district?.wards.map((w) => w.name) || [];
    const q = this.wardQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 10);
    return items.filter((x) => x.toLowerCase().includes(q)).slice(0, 10);
  }

  get canPickDistrict(): boolean {
    return !!this.findProvince(this.province);
  }

  get canPickWard(): boolean {
    const province = this.findProvince(this.province);
    return !!this.findDistrict(province, this.district);
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

    const cacheKey = 'fh_admin_vn_depth3_v1';
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          this.addressDataAll = this.normalizeAddressData(parsed);
        }
      }
    } catch {
      // ignore cache
    }

    // If cache exists, don't block UI; still try refresh in background.
    this.addressLoading = true;
    const url = 'https://provinces.open-api.vn/api/?depth=3';
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.addressDataAll = this.normalizeAddressData(data);
        this.addressLoading = false;
        try {
          localStorage.setItem(cacheKey, JSON.stringify(this.addressDataAll));
        } catch {
          // ignore storage failures
        }
      },
      error: () => {
        this.addressLoading = false;
        if (!this.addressDataAll.length) {
          this.addressLoadError = 'Không thể tải dữ liệu địa chỉ. Vui lòng thử lại hoặc nhập thủ công.';
        }
      }
    });
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
    return 0;
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

    if (
      !this.fullName.trim() ||
      !this.phone.trim() ||
      !this.province.trim() ||
      !this.district.trim() ||
      !this.ward.trim() ||
      !this.addressDetail.trim()
    ) {
      this.error = 'Vui lòng nhập đầy đủ thông tin giao hàng.';
      return;
    }

    localStorage.removeItem('cart');
    this.placed = true;

    window.setTimeout(() => {
      this.router.navigateByUrl('/');
    }, 1200);
  }

  backToCart(): void {
    this.router.navigateByUrl('/cart');
  }
}

