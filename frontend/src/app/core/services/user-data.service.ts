import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface UserAddressItem {
  id?: number | null;
  name?: string | null;
  phone?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  addressDetail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type?: string | null;
  isPrimary?: boolean | null;
}

export interface UserBankAccountItem {
  id?: number | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  branchName?: string | null;
  isPrimary?: boolean | null;
}

export interface UserMeResponse {
  id: number;
  fullName?: string | null;
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  roles?: string[] | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  addressDetail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addresses?: UserAddressItem[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UserMeUpdateRequest {
  fullName?: string | null;
  phone?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  addressDetail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addresses?: UserAddressItem[] | null;
}

@Injectable({ providedIn: 'root' })
export class UserDataService {
  constructor(private http: HttpClient) {}

  getMe() {
    return this.http.get<ApiResponse<UserMeResponse>>(`${environment.apiBaseUrl}/api/users/me`);
  }

  updateMe(data: UserMeUpdateRequest) {
    return this.http.put<ApiResponse<UserMeResponse>>(`${environment.apiBaseUrl}/api/users/me`, data);
  }

  getBankAccounts(userId: number | null | undefined): UserBankAccountItem[] {
    if (!userId || userId <= 0) return [];
    try {
      const raw = localStorage.getItem(`user_bank_accounts_${userId}`);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveBankAccounts(userId: number | null | undefined, accounts: UserBankAccountItem[]): void {
    if (!userId || userId <= 0) return;
    try {
      localStorage.setItem(`user_bank_accounts_${userId}`, JSON.stringify(Array.isArray(accounts) ? accounts : []));
    } catch {
    }
  }
}
