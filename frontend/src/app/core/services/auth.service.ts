import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthTokenResponse {
  userId: number;
  token: string;
  roles?: string[];
}

export interface RegisterRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  gender?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'fh_token';
  private readonly userIdKey = 'fh_userId';
  private readonly rolesKey = 'fh_roles';

  constructor(private http: HttpClient) {}

  login(usernameOrEmail: string, password: string) {
    return this.http.post<ApiResponse<AuthTokenResponse>>(`${environment.apiBaseUrl}/api/auth/login`, {
      usernameOrEmail,
      password
    });
  }

  register(req: RegisterRequest) {
    return this.http.post<ApiResponse<AuthTokenResponse>>(`${environment.apiBaseUrl}/api/auth/register`, req);
  }

  setSession(data: AuthTokenResponse | null | undefined): void {
    if (!data) return;

    if (data.userId != null) {
      localStorage.setItem(this.userIdKey, String(data.userId));
    }
    if (data.token) {
      localStorage.setItem(this.tokenKey, String(data.token));
    }

    const roles = Array.isArray(data.roles) ? data.roles : [];
    localStorage.setItem(this.rolesKey, JSON.stringify(roles));
  }

  logout(): void {
    localStorage.removeItem(this.userIdKey);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.rolesKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUserId(): number | null {
    const token = this.getToken();
    if (!token) return null;
    const payload = this.decodeJwtPayload(token);
    const subject = payload?.sub;
    const userId = Number(subject);
    if (Number.isFinite(userId) && userId > 0) return userId;

    const raw = localStorage.getItem(this.userIdKey);
    const fallback = raw != null ? Number(raw) : NaN;
    return Number.isFinite(fallback) && fallback > 0 ? fallback : null;
  }

  private decodeJwtPayload(token: string): any | null {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeJwtPayload(token);
    const exp = payload?.exp;
    if (typeof exp !== 'number') return false;
    return Date.now() >= exp * 1000;
  }

  getRoles(): string[] {
    const raw = localStorage.getItem(this.rolesKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string') as string[];
    } catch {
      return [];
    }
    return [];
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }
    return true;
  }

  isAdmin(): boolean {
    return this.getRoles().includes('ADMIN');
  }

  isManager(): boolean {
    return this.getRoles().includes('MANAGER');
  }

  isStaff(): boolean {
    return this.getRoles().includes('STAFF');
  }

  isInternal(): boolean {
    const roles = this.getRoles();
    return roles.includes('ADMIN') || roles.includes('MANAGER') || roles.includes('STAFF');
  }
}
