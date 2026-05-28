import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface FooterBranchResponse {
  id?: number | null;
  name?: string | null;
  address?: string | null;
  province?: string | null;
  ward?: string | null;
}

interface FooterBranchItem {
  id: number;
  name: string;
  detail: string;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  @Input() quoteTitle = '';
  @Input() quoteText = '';

  @Input() branches: string[] = [];

  footerBranches: FooterBranchItem[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadBranches();
  }

  private loadBranches(): void {
    const localBranches = (Array.isArray(this.branches) ? this.branches : [])
      .map((item, index) => ({
        id: index + 1,
        name: String(item || '').trim(),
        detail: ''
      }))
      .filter((item) => item.name.length > 0);

    if (localBranches.length > 0) {
      this.footerBranches = localBranches;
    }

    this.http
      .get<ApiResponse<FooterBranchResponse[]>>(`${environment.apiBaseUrl}/api/branches/list`)
      .subscribe({
        next: (res) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          const mapped = rows
            .map((row, index) => {
              const addressParts = [row?.address, row?.ward, row?.province]
                .map((part) => String(part || '').trim())
                .filter((part) => part.length > 0);

              return {
                id: Number(row?.id ?? index + 1),
                name: String(row?.name || '').trim(),
                detail: addressParts.join(', ')
              };
            })
            .filter((item) => Number.isFinite(item.id) && item.name.length > 0);

          if (mapped.length > 0) {
            this.footerBranches = mapped;
          }
        },
        error: () => {
          // Keep footer resilient if branch API is unavailable.
        }
      });
  }
}
