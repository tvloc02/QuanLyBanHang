import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserDataService, UserMeResponse } from '../../../core/services/user-data.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.scss']
})
export class AdminProfileComponent {
  loading = false;
  saving = false;
  error = '';
  success = '';

  me: UserMeResponse | null = null;

  form = {
    fullName: '',
    phone: '',
    province: '',
    district: '',
    ward: '',
    addressDetail: ''
  };

  constructor(private userData: UserDataService) {
    this.load();
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
        this.form.fullName = d?.fullName || '';
        this.form.phone = d?.phone || '';
        this.form.province = d?.province || '';
        this.form.district = d?.district || '';
        this.form.ward = d?.ward || '';
        this.form.addressDetail = d?.addressDetail || '';
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Không thể tải thông tin tài khoản.';
      }
    });
  }

  save(): void {
    const fullName = String(this.form.fullName || '').trim();
    const phone = String(this.form.phone || '').trim();

    if (!fullName) {
      this.error = 'Vui lòng nhập họ tên.';
      this.success = '';
      return;
    }

    if (!phone) {
      this.error = 'Vui lòng nhập số điện thoại.';
      this.success = '';
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    this.userData
      .updateMe({
        fullName,
        phone,
        province: this.form.province || null,
        district: this.form.district || null,
        ward: this.form.ward || null,
        addressDetail: this.form.addressDetail || null
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          if (!res?.success) {
            this.error = res?.message || 'Cập nhật thông tin thất bại.';
            return;
          }
          this.me = res?.data || this.me;
          this.success = 'Đã lưu thay đổi.';
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Không thể cập nhật thông tin tài khoản.';
        }
      });
  }
}
