import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page">
      <a routerLink="/sale" class="back">← Về trang chủ</a>
      <h1>Trang đang xây dựng</h1>
      <p>Route: <b>{{ path }}</b></p>
      <p>Slug: <b>{{ slug || '-' }}</b></p>
    </div>
  `,
  styles: [
    `
      .page { max-width: 1100px; margin: 0 auto; padding: 48px 16px; }
      .back { display: inline-block; margin-bottom: 16px; color: var(--fh-primary); }
      h1 { margin: 0 0 12px; }
      p { margin: 6px 0; color: var(--fh-muted); }
    `
  ]
})
export class PlaceholderComponent {
  path = '';
  slug: string | null = null;

  constructor(route: ActivatedRoute) {
    this.path = route.snapshot.routeConfig?.path ?? '';
    this.slug = route.snapshot.paramMap.get('slug');
  }
}
