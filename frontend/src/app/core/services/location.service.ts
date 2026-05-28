import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  constructor(private http: HttpClient) {}

  getVnDepth3() {
    return this.http.get<ApiResponse<any>>(`${environment.apiBaseUrl}/api/locations/vn-depth3`);
  }

  getVn2Provinces() {
    return this.http.get<ApiResponse<any>>(`${environment.apiBaseUrl}/api/locations/vn2`);
  }

  getVn2CommunesByProvince(provinceCode: string) {
    const qs = `?provinceCode=${encodeURIComponent(provinceCode || '')}`;
    return this.http.get<ApiResponse<any>>(`${environment.apiBaseUrl}/api/locations/vn2${qs}`);
  }

  reverseGeocode(lat: number, lng: number) {
    const qs = `?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`;
    return this.http.get<ApiResponse<any>>(`${environment.apiBaseUrl}/api/locations/reverse-geocode${qs}`);
  }

  searchPlaces(query: string) {
    const qs = `?q=${encodeURIComponent(query || '')}`;
    return this.http.get<ApiResponse<any>>(`${environment.apiBaseUrl}/api/locations/search-geocode${qs}`);
  }
}
