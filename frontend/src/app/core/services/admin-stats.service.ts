import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AdminStatsResponse {
  users: number;
  products: number;
  categories: number;
  orders: number;
  coupons: number;
  reviews: number;
}

@Injectable({ providedIn: 'root' })
export class AdminStatsService {
  constructor(private http: HttpClient) {}

  getStats() {
    return this.http.get<ApiResponse<AdminStatsResponse>>(`${environment.apiBaseUrl}/api/admin/stats`);
  }
}
