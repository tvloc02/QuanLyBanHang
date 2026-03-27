import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

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
  type?: 'customer_segment' | 'customer_shipping' | 'order_amount' | null;
  discountAmount?: number | null;
  discountPercent?: number | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  shippingDiscountAmount?: number | null;
  allowedSegments?: string | null;
  targetAudience?: string | null;
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
  branchId?: number | null;
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

export interface AdminProductTypeResponse {
  id: number;
  code: string;
  name: string;
  active?: boolean | null;
  fieldsJson?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminBranchResponse {
  id: number;
  code: string;
  name: string;
  managerUserId?: number | null;
  managerName?: string | null;
  managerUserIds?: number[] | null;
  managerNames?: string[] | null;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  active?: boolean | null;
  productCount?: number | null;
  totalStock?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminBranchStockResponse {
  productId: number;
  stock: number;
  updatedAt?: string | null;
}

export interface AdminBranchStatsResponse {
  productCount?: number | null;
  totalStock?: number | null;
  orderCount?: number | null;
}

export type AdminHomeSectionItemType = 'PRODUCT' | 'COUPON' | 'NEWS' | 'LINK';

export interface HomeSectionItemResponse {
  id?: number | null;
  sectionKey?: string | null;
  position?: number | null;
  enabled?: boolean | null;
  itemType?: AdminHomeSectionItemType | null;
  refId?: number | null;
  title?: string | null;
  titleColor?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  route?: string | null;
  code?: string | null;
  note?: string | null;
  noteColor?: string | null;
  buttonText?: string | null;
  product?: any;
  coupon?: any;
}

export interface HomeSectionResponse {
  sectionKey?: string | null;
  title?: string | null;
  enabled?: boolean | null;
  updatedAt?: string | null;
  items?: HomeSectionItemResponse[] | null;
}

export type SupportConversationStatus = 'OPEN' | 'CLOSED';

export interface SupportConversationResponse {
  id?: number | null;
  userId?: number | null;
  guestToken?: string | null;
  status?: SupportConversationStatus | null;
  assignedStaffId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastMessageAt?: string | null;
}

export type SupportMessageSenderType = 'CUSTOMER' | 'STAFF';

export interface SupportMessageResponse {
  id?: number | null;
  conversationId?: number | null;
  senderType?: SupportMessageSenderType | null;
  senderUserId?: number | null;
  message?: string | null;
  createdAt?: string | null;
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

  importCategoriesExcel(rootId: number, file: File) {
    const form = new FormData();
    form.append('rootId', String(rootId));
    form.append('file', file, file.name || 'categories.xlsx');
    return this.http.post<ApiResponse<any>>(
      `${environment.apiBaseUrl}/api/admin/categories/import-excel`,
      form
    );
  }

  downloadCategoriesImportTemplateExcel() {
    return this.http.get(`${environment.apiBaseUrl}/api/admin/categories/import-template-excel`, {
      responseType: 'blob'
    }) as Observable<Blob>;
  }

  exportCategoriesExcel(rootId: number) {
    return this.http.get(`${environment.apiBaseUrl}/api/admin/categories/export-excel?rootId=${rootId}`, {
      responseType: 'blob'
    }) as Observable<Blob>;
  }

  parseCategoriesExcel(file: File) {
    const form = new FormData();
    form.append('file', file, file.name || 'categories.xlsx');
    return this.http.post<ApiResponse<any[]>>(
      `${environment.apiBaseUrl}/api/admin/categories/parse-excel`,
      form
    );
  }

  buildCategoriesExcel(tree: Array<{ name: string; slug?: string; lv3?: Array<{ name: string; slug?: string }> }>) {
    return this.http.post(`${environment.apiBaseUrl}/api/admin/categories/build-excel`, tree, {
      responseType: 'blob'
    }) as Observable<Blob>;
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

  importCouponsExcel(file: File): Observable<ApiResponse<any>> {
    const form = new FormData();
    form.append('file', file, file.name || 'coupons.xlsx');
    return this.http.post<ApiResponse<any>>(
      `${environment.apiBaseUrl}/api/coupons/admin/import`,
      form
    );
  }

  downloadCouponsImportTemplateExcel(): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/api/coupons/admin/template`, {
      responseType: 'blob'
    });
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

  listProductTypes() {
    return this.http.get<ApiResponse<AdminProductTypeResponse[]>>(`${environment.apiBaseUrl}/api/admin/product-types`);
  }

  createProductType(data: { code: string; name: string; active?: boolean | null; fieldsJson?: string | null }) {
    return this.http.post<ApiResponse<AdminProductTypeResponse>>(
      `${environment.apiBaseUrl}/api/admin/product-types`,
      data
    );
  }

  updateProductType(id: number, data: { code?: string; name?: string; active?: boolean | null; fieldsJson?: string | null }) {
    return this.http.put<ApiResponse<AdminProductTypeResponse>>(
      `${environment.apiBaseUrl}/api/admin/product-types/${id}`,
      data
    );
  }

  deleteProductType(id: number) {
    return this.http.delete<ApiResponse<boolean>>(
      `${environment.apiBaseUrl}/api/admin/product-types/${id}`
    );
  }

  getHomeSections() {
    return this.http.get<ApiResponse<HomeSectionResponse[]>>(`${environment.apiBaseUrl}/api/admin/home-sections`);
  }

  listSupportConversations(status?: 'all') {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<ApiResponse<SupportConversationResponse[]>>(`${environment.apiBaseUrl}/api/admin/support-chat/conversations${qs}`);
  }

  listSupportMessages(conversationId: number) {
    return this.http.get<ApiResponse<SupportMessageResponse[]>>(
      `${environment.apiBaseUrl}/api/admin/support-chat/conversations/${conversationId}/messages`
    );
  }

  sendSupportMessage(conversationId: number, data: { message: string }) {
    return this.http.post<ApiResponse<SupportMessageResponse>>(
      `${environment.apiBaseUrl}/api/admin/support-chat/conversations/${conversationId}/messages`,
      data
    );
  }

  closeSupportConversation(conversationId: number) {
    return this.http.put<ApiResponse<SupportConversationResponse>>(
      `${environment.apiBaseUrl}/api/admin/support-chat/conversations/${conversationId}/close`,
      {}
    );
  }

  updateHomeSection(sectionKey: string, data: { title?: string | null; enabled?: boolean | null; items?: Array<{ enabled?: boolean | null; itemType?: AdminHomeSectionItemType | null; refId?: number | null; title?: string | null; description?: string | null; imageUrl?: string | null; route?: string | null; code?: string | null; note?: string | null; buttonText?: string | null }> }) {
    return this.http.put<ApiResponse<HomeSectionResponse>>(
      `${environment.apiBaseUrl}/api/admin/home-sections/${encodeURIComponent(sectionKey)}`,
      data
    );
  }

  getUsers() {
    return this.http.get<ApiResponse<AdminUserResponse[]>>(`${environment.apiBaseUrl}/api/admin/users`);
  }

  getCustomers() {
    return this.http.get<ApiResponse<AdminUserResponse[]>>(`${environment.apiBaseUrl}/api/admin/customers`);
  }

  createUser(data: { fullName?: string; email?: string; username?: string; phone?: string; roles: string[]; enabled?: boolean; branchId?: number | null }) {
    return this.http.post<ApiResponse<AdminUserResponse>>(
      `${environment.apiBaseUrl}/api/admin/users`,
      data
    );
  }

  updateUser(id: number, data: { fullName?: string; email?: string; username?: string; phone?: string; roles?: string[]; enabled?: boolean; branchId?: number | null }) {
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

  getBranches() {
    return this.http.get<ApiResponse<AdminBranchResponse[]>>(`${environment.apiBaseUrl}/api/admin/branches`);
  }

  createBranch(data: { code: string; name: string; managerUserId?: number | null; managerUserIds?: number[] | null; address?: string | null; province?: string | null; district?: string | null; ward?: string | null; latitude?: number | null; longitude?: number | null; active?: boolean | null }) {
    return this.http.post<ApiResponse<AdminBranchResponse>>(`${environment.apiBaseUrl}/api/admin/branches`, data);
  }

  updateBranch(id: number, data: { code: string; name: string; managerUserId?: number | null; managerUserIds?: number[] | null; address?: string | null; province?: string | null; district?: string | null; ward?: string | null; latitude?: number | null; longitude?: number | null; active?: boolean | null }) {
    return this.http.put<ApiResponse<AdminBranchResponse>>(`${environment.apiBaseUrl}/api/admin/branches/${id}`, data);
  }

  deleteBranch(id: number) {
    return this.http.delete<ApiResponse<string>>(`${environment.apiBaseUrl}/api/admin/branches/${id}`);
  }

  listBranchStocks(branchId: number) {
    return this.http.get<ApiResponse<AdminBranchStockResponse[]>>(`${environment.apiBaseUrl}/api/admin/branches/${branchId}/stocks`);
  }

  upsertBranchStocks(branchId: number, data: Array<{ productId: number; stock: number }>) {
    return this.http.put<ApiResponse<AdminBranchStockResponse[]>>(`${environment.apiBaseUrl}/api/admin/branches/${branchId}/stocks`, data);
  }

  getBranchStats(branchId: number) {
    return this.http.get<ApiResponse<AdminBranchStatsResponse>>(`${environment.apiBaseUrl}/api/admin/branches/${branchId}/stats`);
  }

  deleteUser(userId: number) {
    return this.http.delete<ApiResponse<string>>(
      `${environment.apiBaseUrl}/api/admin/users/${userId}`
    );
  }
}
