import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  ShippingConfig, 
  ProvinceShipping, 
  DistanceShipping, 
  ShippingSettings 
} from './shipping-config.interface';

@Component({
  selector: 'app-admin-shipping',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-shipping.component.html',
  styleUrls: ['./admin-shipping.component.scss']
})
export class AdminShippingComponent implements OnInit {
  
  // Tab management
  activeTab: 'province' | 'distance' | 'settings' = 'province';
  
  // Province shipping
  provinceShippings: ProvinceShipping[] = [];
  newProvinceShipping: ProvinceShipping = {
    province: '',
    fee: 0,
    estimatedDays: 1
  };
  editingProvinceIndex: number | null = null;
  
  // Distance shipping
  distanceShippings: DistanceShipping[] = [];
  newDistanceShipping: DistanceShipping = {
    minDistance: 0,
    maxDistance: 0,
    fee: 0,
    estimatedDays: 1
  };
  editingDistanceIndex: number | null = null;
  
  // General settings
  shippingSettings: ShippingSettings = {
    freeShippingThreshold: 500000,
    defaultFee: 30000,
    sameDayFee: 50000,
    expressFee: 40000,
    weekendFee: 10000,
    remoteFee: 20000
  };
  
  // Provinces list for dropdown
  provinces = [
    'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
    'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
    'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
    'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
    'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
    'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
    'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
    'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
    'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
    'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
    'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
    'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
    'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
  ];

  constructor() { }

  ngOnInit(): void {
    this.loadShippingData();
  }

  private loadShippingData(): void {
    // Load from localStorage or API
    const savedProvince = localStorage.getItem('provinceShippings');
    const savedDistance = localStorage.getItem('distanceShippings');
    const savedSettings = localStorage.getItem('shippingSettings');

    if (savedProvince) {
      this.provinceShippings = JSON.parse(savedProvince);
    } else {
      // Default data
      this.provinceShippings = [
        { province: 'Hà Nội', fee: 30000, estimatedDays: 1 },
        { province: 'TP.HCM', fee: 25000, estimatedDays: 1 },
        { province: 'Đà Nẵng', fee: 35000, estimatedDays: 2 },
        { province: 'Hải Phòng', fee: 40000, estimatedDays: 2 },
        { province: 'Cần Thơ', fee: 45000, estimatedDays: 3 }
      ];
    }

    if (savedDistance) {
      this.distanceShippings = JSON.parse(savedDistance);
    } else {
      // Default data
      this.distanceShippings = [
        { minDistance: 0, maxDistance: 5, fee: 20000, estimatedDays: 1 },
        { minDistance: 6, maxDistance: 10, fee: 30000, estimatedDays: 2 },
        { minDistance: 11, maxDistance: 20, fee: 40000, estimatedDays: 3 },
        { minDistance: 21, maxDistance: 50, fee: 60000, estimatedDays: 4 },
        { minDistance: 51, maxDistance: 999, fee: 80000, estimatedDays: 5 }
      ];
    }

    if (savedSettings) {
      this.shippingSettings = JSON.parse(savedSettings);
    }
  }

  private saveShippingData(): void {
    localStorage.setItem('provinceShippings', JSON.stringify(this.provinceShippings));
    localStorage.setItem('distanceShippings', JSON.stringify(this.distanceShippings));
    localStorage.setItem('shippingSettings', JSON.stringify(this.shippingSettings));
  }

  // Province shipping methods
  addProvinceShipping(): void {
    if (!this.newProvinceShipping.province || this.newProvinceShipping.fee <= 0) {
      alert('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    // Check duplicate
    if (this.provinceShippings.some(p => p.province === this.newProvinceShipping.province)) {
      alert('Tỉnh/thành phố này đã tồn tại');
      return;
    }

    if (this.editingProvinceIndex !== null) {
      // Update existing
      this.provinceShippings[this.editingProvinceIndex] = { ...this.newProvinceShipping };
      this.editingProvinceIndex = null;
    } else {
      // Add new
      this.provinceShippings.push({ ...this.newProvinceShipping });
    }

    this.resetProvinceForm();
    this.saveShippingData();
  }

  editProvinceShipping(index: number): void {
    this.newProvinceShipping = { ...this.provinceShippings[index] };
    this.editingProvinceIndex = index;
  }

  deleteProvinceShipping(index: number): void {
    if (confirm('Bạn có chắc muốn xóa cấu hình này?')) {
      this.provinceShippings.splice(index, 1);
      this.saveShippingData();
    }
  }

  resetProvinceForm(): void {
    this.newProvinceShipping = {
      province: '',
      fee: 0,
      estimatedDays: 1
    };
    this.editingProvinceIndex = null;
  }

  // Distance shipping methods
  addDistanceShipping(): void {
    if (this.newDistanceShipping.minDistance < 0 || 
        this.newDistanceShipping.maxDistance <= this.newDistanceShipping.minDistance ||
        this.newDistanceShipping.fee < 0) {
      alert('Vui lòng nhập khoảng cách và phí hợp lệ');
      return;
    }

    // Check overlap
    const hasOverlap = this.distanceShippings.some(d => 
      (this.newDistanceShipping.minDistance >= d.minDistance && this.newDistanceShipping.minDistance <= d.maxDistance) ||
      (this.newDistanceShipping.maxDistance >= d.minDistance && this.newDistanceShipping.maxDistance <= d.maxDistance)
    );

    if (hasOverlap && this.editingDistanceIndex === null) {
      alert('Khoảng cách này bị trùng với cấu hình đã có');
      return;
    }

    if (this.editingDistanceIndex !== null) {
      // Update existing
      this.distanceShippings[this.editingDistanceIndex] = { ...this.newDistanceShipping };
      this.editingDistanceIndex = null;
    } else {
      // Add new
      this.distanceShippings.push({ ...this.newDistanceShipping });
    }

    this.resetDistanceForm();
    this.saveShippingData();
  }

  editDistanceShipping(index: number): void {
    this.newDistanceShipping = { ...this.distanceShippings[index] };
    this.editingDistanceIndex = index;
  }

  deleteDistanceShipping(index: number): void {
    if (confirm('Bạn có chắc muốn xóa cấu hình này?')) {
      this.distanceShippings.splice(index, 1);
      this.saveShippingData();
    }
  }

  resetDistanceForm(): void {
    this.newDistanceShipping = {
      minDistance: 0,
      maxDistance: 0,
      fee: 0,
      estimatedDays: 1
    };
    this.editingDistanceIndex = null;
  }

  // Settings methods
  saveSettings(): void {
    this.saveShippingData();
    alert('Đã lưu cài đặt vận chuyển thành công!');
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value);
  }
}
