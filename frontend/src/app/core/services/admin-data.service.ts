import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AdminOrderSummaryResponse {
  id: number;
  userId: number;
  status: string;
  total: number;
  itemCount: number;
  couponCode?: string | null;
  createdAt?: string | null;
}

export interface AdminCategoryResponse {
  id: number;
  name: string;
  slug?: string | null;
  parentId?: number | null;
  icon?: string | null;
  description?: string | null;
  active?: boolean | null;
  createdAt?: string | null;
}

export interface AdminCouponResponse {
  id: number;
  code: string;
  description?: string | null;
  discountAmount?: number | null;
  discountPercent?: number | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  shippingDiscountAmount?: number | null;
  allowedSegments?: string | null;
  usageLimit?: number | null;
  usedCount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean | null;
}

export interface AdminUserResponse {
  id: number;
  fullName?: string | null;
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  roles: string[];
  enabled?: boolean | null;
  createdAt?: string | null;
  customerSegment?: string | null;
  accountAgeMonths?: number | null;
  totalSpendLast6Months?: number | null;
  avgMonthlySpendLast6Months?: number | null;
}

export interface AdminReviewResponse {
  id: number;
  productId: number;
  userId: number;
  rating?: number | null;
  comment?: string | null;
  createdAt?: string | null;
}

export interface AdminAiSettingsResponse {
  defaultProvider?: string | null;
  hasGeminiApiKey?: boolean | null;
  hasOpenaiApiKey?: boolean | null;
  updatedAt?: string | null;
}

export interface AdminMailSettingsResponse {
  enabled?: boolean | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUsername?: string | null;
  hasPassword?: boolean | null;
  fromEmail?: string | null;
  fromName?: string | null;
  useTls?: boolean | null;
  updatedAt?: string | null;
}

export interface AdminNotificationSettingsResponse {
  enabled?: boolean | null;
  notifyNewOrder?: boolean | null;
  notifyOrderStatus?: boolean | null;
  notifyLowStock?: boolean | null;
  updatedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminDataService {
  constructor(private http: HttpClient) {}

  getOrders() {
    return this.http.get<ApiResponse<AdminOrderSummaryResponse[]>>(`${environment.apiBaseUrl}/api/admin/orders`);
  }

  getCategories() {
    return this.http.get<ApiResponse<AdminCategoryResponse[]>>(`${environment.apiBaseUrl}/api/admin/categories`);
  }

  createCategory(data: { name: string; slug?: string | null; parentId?: number | null; icon?: string | null; description?: string; active?: boolean }) {
    return this.http.post<ApiResponse<AdminCategoryResponse>>(
      `${environment.apiBaseUrl}/api/admin/categories`,
      data
    );
  }

  updateCategory(id: number, data: { name: string; slug?: string | null; parentId?: number | null; icon?: string | null; description?: string; active?: boolean }) {
    return this.http.put<ApiResponse<AdminCategoryResponse>>(
      `${environment.apiBaseUrl}/api/admin/categories/${id}`,
      data
    );
  }

  deleteCategory(id: number) {
    return this.http.delete<ApiResponse<string>>(
      `${environment.apiBaseUrl}/api/admin/categories/${id}`
    );
  }

  getCoupons() {
    return this.http.get<ApiResponse<AdminCouponResponse[]>>(`${environment.apiBaseUrl}/api/admin/coupons`);
  }

  createCoupon(data: { code: string; description?: string; discountAmount?: number | null; discountPercent?: number | null; minOrderAmount?: number | null; maxDiscountAmount?: number | null; shippingDiscountAmount?: number | null; allowedSegments?: string | null; usageLimit?: number | null; startsAt?: string | null; endsAt?: string | null; active?: boolean | null }) {
    return this.http.post<ApiResponse<AdminCouponResponse>>(
      `${environment.apiBaseUrl}/api/admin/coupons`,
      data
    );
  }

  updateCoupon(id: number, data: { code?: string; description?: string; discountAmount?: number | null; discountPercent?: number | null; minOrderAmount?: number | null; maxDiscountAmount?: number | null; shippingDiscountAmount?: number | null; allowedSegments?: string | null; usageLimit?: number | null; startsAt?: string | null; endsAt?: string | null; active?: boolean | null }) {
    return this.http.put<ApiResponse<AdminCouponResponse>>(
      `${environment.apiBaseUrl}/api/admin/coupons/${id}`,
      data
    );
  }

  deleteCoupon(id: number) {
    return this.http.delete<ApiResponse<string>>(
      `${environment.apiBaseUrl}/api/admin/coupons/${id}`
    );
  }

  getAiSettings() {
    return this.http.get<ApiResponse<AdminAiSettingsResponse>>(`${environment.apiBaseUrl}/api/admin/ai-settings`);
  }

  updateAiSettings(data: { defaultProvider?: string | null; geminiApiKey?: string | null; openaiApiKey?: string | null }) {
    return this.http.put<ApiResponse<AdminAiSettingsResponse>>(
      `${environment.apiBaseUrl}/api/admin/ai-settings`,
      data
    );
  }

  getMailSettings() {
    return this.http.get<ApiResponse<AdminMailSettingsResponse>>(`${environment.apiBaseUrl}/api/admin/settings/mail`);
  }

  updateMailSettings(data: { enabled?: boolean; smtpHost?: string; smtpPort?: number; smtpUsername?: string; smtpPassword?: string; fromEmail?: string; fromName?: string; useTls?: boolean }) {
    return this.http.put<ApiResponse<AdminMailSettingsResponse>>(
      `${environment.apiBaseUrl}/api/admin/settings/mail`,
      data
    );
  }

  getNotificationSettings() {
    return this.http.get<ApiResponse<AdminNotificationSettingsResponse>>(`${environment.apiBaseUrl}/api/admin/settings/notifications`);
  }

  updateNotificationSettings(data: { enabled?: boolean; notifyNewOrder?: boolean; notifyOrderStatus?: boolean; notifyLowStock?: boolean }) {
    return this.http.put<ApiResponse<AdminNotificationSettingsResponse>>(
      `${environment.apiBaseUrl}/api/admin/settings/notifications`,
      data
    );
  }

  getUsers() {
    return this.http.get<ApiResponse<AdminUserResponse[]>>(`${environment.apiBaseUrl}/api/admin/users`);
  }

  getCustomers() {
    return this.http.get<ApiResponse<AdminUserResponse[]>>(`${environment.apiBaseUrl}/api/admin/customers`);
  }

  createUser(data: { fullName?: string; email?: string; username?: string; phone?: string; roles: string[]; enabled?: boolean }) {
    return this.http.post<ApiResponse<AdminUserResponse>>(
      `${environment.apiBaseUrl}/api/admin/users`,
      data
    );
  }

  updateUser(id: number, data: { fullName?: string; email?: string; username?: string; phone?: string; roles?: string[]; enabled?: boolean }) {
    return this.http.put<ApiResponse<AdminUserResponse>>(
      `${environment.apiBaseUrl}/api/admin/users/${id}`,
      data
    );
  }

  resetUserPassword(userId: number) {
    return this.http.post<ApiResponse<string>>(
      `${environment.apiBaseUrl}/api/admin/users/${userId}/reset-password`,
      {}
    );
  }

  setUserEnabled(userId: number, enabled: boolean) {
    return this.http.put<ApiResponse<AdminUserResponse>>(
      `${environment.apiBaseUrl}/api/admin/users/${userId}/enabled`,
      { enabled }
    );
  }

  getReviews() {
    return this.http.get<ApiResponse<AdminReviewResponse[]>>(`${environment.apiBaseUrl}/api/admin/reviews`);
  }

  deleteUser(userId: number) {
    return this.http.delete<ApiResponse<string>>(
      `${environment.apiBaseUrl}/api/admin/users/${userId}`
    );
  }
}
