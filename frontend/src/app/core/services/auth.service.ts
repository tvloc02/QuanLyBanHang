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
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.getRoles().includes('ADMIN');
  }
}
