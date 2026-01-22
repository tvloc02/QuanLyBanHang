import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserDataService, UserMeResponse } from '../../core/services/user-data.service';

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

  form = this.fb.group({
    fullName: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    province: [''],
    district: [''],
    ward: [''],
    addressDetail: ['']
  });

  constructor(
    private fb: FormBuilder,
    private userData: UserDataService
  ) {}

  ngOnInit(): void {
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
        this.form.patchValue({
          fullName: d?.fullName || '',
          phone: d?.phone || '',
          province: d?.province || '',
          district: d?.district || '',
          ward: d?.ward || '',
          addressDetail: d?.addressDetail || ''
        });
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
    this.userData
      .updateMe({
        fullName: v.fullName || null,
        phone: v.phone || null,
        province: v.province || null,
        district: v.district || null,
        ward: v.ward || null,
        addressDetail: v.addressDetail || null
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
}
