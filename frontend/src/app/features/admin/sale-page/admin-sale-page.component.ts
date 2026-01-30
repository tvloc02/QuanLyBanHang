import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AdminCouponResponse,
  AdminDataService,
  AdminHomeSectionItemType,
  HomeSectionResponse
} from '../../../core/services/admin-data.service';
import { environment } from '../../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  children?: CategoryNode[];
}

type CtaAction = 'SCROLL' | 'SALE' | 'CATEGORY' | 'CUSTOM';

interface ItemForm {
  enabled: boolean;
  itemType: AdminHomeSectionItemType;
  refId?: number | null;
  code?: string | null;
  title?: string | null;
  titleColor?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  route?: string | null;
  note?: string | null;
  noteColor?: string | null;
  buttonText?: string | null;

  ctaAction?: CtaAction;
  ctaCategorySlug?: string | null;
  customRoute?: string | null;
}

@Component({
  selector: 'app-admin-sale-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-sale-page.component.html',
  styleUrls: ['./admin-sale-page.component.scss']
})
export class AdminSalePageComponent {
  loading = false;
  saving = false;
  error = '';

  coupons: AdminCouponResponse[] = [];

  categoryOptions: Array<{ slug: string; label: string }> = [];

  private readonly apiBaseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  hero = {
    title: 'Trang Sale',
    enabled: true,
    items: [] as ItemForm[]
  };

  vouchers = {
    title: 'NHẬN VOUCHER ĐỘC QUYỀN ONLINE',
    enabled: true,
    items: [] as ItemForm[]
  };

  categories = {
    title: 'HÔM NAY SALE GÌ?',
    enabled: true
  };

  sectionsNav = {
    title: 'Menu nhanh',
    enabled: true,
    items: [] as ItemForm[]
  };

  private readonly sectionsNavDefaults: Array<{ key: string; title: string }> = [
    { key: 'FEATURED', title: 'Được yêu thích nhất' },
    { key: 'HOT', title: 'Sản phẩm hot mỗi ngày' },
    { key: 'CART_SAVING', title: 'Giỏ hàng tiết kiệm' },
    { key: 'SALE_VOUCHERS', title: 'Voucher độc quyền online' },
    { key: 'EXCLUSIVE', title: 'Độc quyền online' }
  ];

  constructor(private adminData: AdminDataService, private http: HttpClient) {
    this.load();
    this.loadCoupons();
    this.loadCategoryTree();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.adminData.getHomeSections().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải cấu hình Trang Sale.';
          return;
        }

        const sections: HomeSectionResponse[] = Array.isArray(res?.data) ? res.data : [];
        this.applyHero(sections);
        this.applyVouchers(sections);
        this.applyCategories(sections);
        this.applySectionsNav(sections);
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy cấu hình Trang Sale.';
      }
    });
  }

  save(): void {
    this.saving = true;
    this.error = '';

    const heroPayload = {
      title: this.hero.title?.trim() || null,
      enabled: !!this.hero.enabled,
      items: this.hero.items.map((i) => ({
        enabled: !!i.enabled,
        itemType: 'LINK' as AdminHomeSectionItemType,
        refId: null,
        title: i.title ?? null,
        titleColor: i.titleColor ?? null,
        description: i.description ?? null,
        imageUrl: i.imageUrl ?? null,
        route: this.heroRoute(i),
        code: null,
        note: i.note ?? null,
        noteColor: i.noteColor ?? null,
        buttonText: i.buttonText ?? null
      }))
    };

    const vouchersPayload = {
      title: this.vouchers.title?.trim() || null,
      enabled: !!this.vouchers.enabled,
      items: this.vouchers.items.map((i) => ({
        enabled: !!i.enabled,
        itemType: 'COUPON' as AdminHomeSectionItemType,
        refId: i.refId ?? null,
        title: i.title ?? null,
        description: i.description ?? null,
        imageUrl: null,
        route: null,
        code: null,
        note: i.note ?? null,
        buttonText: i.buttonText ?? null
      }))
    };

    const categoriesPayload = {
      title: this.categories.title?.trim() || null,
      enabled: !!this.categories.enabled,
      items: [] as any[]
    };

    const sectionsNavPayload = {
      title: this.sectionsNav.title?.trim() || null,
      enabled: !!this.sectionsNav.enabled,
      items: this.sectionsNav.items.map((i) => ({
        enabled: !!i.enabled,
        itemType: 'LINK' as AdminHomeSectionItemType,
        refId: null,
        title: (i.title ?? null) as any,
        description: null,
        imageUrl: null,
        route: null,
        code: (i.code ?? null) as any,
        note: null,
        buttonText: null
      }))
    };

    forkJoin({
      hero: this.adminData.updateHomeSection('SALE_HERO', heroPayload as any),
      vouchers: this.adminData.updateHomeSection('SALE_VOUCHERS', vouchersPayload as any),
      categories: this.adminData.updateHomeSection('SALE_CATEGORIES', categoriesPayload as any),
      sectionsNav: this.adminData.updateHomeSection('SALE_SECTIONS', sectionsNavPayload as any)
    }).subscribe({
      next: (res: any) => {
        this.saving = false;
        const ok = !!res?.hero?.success && !!res?.vouchers?.success && !!res?.categories?.success && !!res?.sectionsNav?.success;
        if (!ok) {
          this.error = 'Lưu cấu hình thất bại.';
          return;
        }
        this.load();
      },
      error: () => {
        this.saving = false;
        this.error = 'Không thể lưu cấu hình.';
      }
    });
  }

  addHeroSlide(): void {
    this.hero.items.push({
      enabled: true,
      itemType: 'LINK',
      title: 'MUA NHIỀU GIẢM NHIỀU',
      titleColor: null,
      note: 'Ưu đãi nổi bật trong hôm nay',
      noteColor: null,
      description: 'Săn sản phẩm đang giảm giá trực tiếp từ hệ thống. Nhận voucher độc quyền và khám phá danh mục bạn quan tâm.',
      imageUrl: null,
      buttonText: 'Mua ngay',
      route: null,
      ctaAction: 'SCROLL',
      ctaCategorySlug: null,
      customRoute: null
    });
  }

  onCtaActionChange(it: ItemForm): void {
    const act = (it?.ctaAction || 'SCROLL') as CtaAction;
    if (act !== 'CATEGORY') {
      it.ctaCategorySlug = null;
    }
    if (act !== 'CUSTOM') {
      it.customRoute = null;
    }
  }

  resolveImageUrl(src?: string | null): string {
    const s = String(src || '').trim();
    if (!s) return '';
    if (s.startsWith('data:') || s.startsWith('blob:')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/')) return `${this.apiBaseUrl}${s}`;
    return `${this.apiBaseUrl}/${s}`;
  }

  async onHeroFileSelect(index: number, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.error = '';

    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = `${environment.apiBaseUrl}/api/admin/uploads`;
      const res = await this.http.post<ApiResponse<{ url: string }>>(url, formData).toPromise();
      const uploaded = res?.data?.url;
      if (!uploaded) {
        this.error = res?.message || 'Upload thất bại.';
        return;
      }
      if (index < 0 || index >= this.hero.items.length) return;
      this.hero.items[index].imageUrl = uploaded;
    } catch (e: any) {
      this.error = e?.error?.message || 'Không upload được ảnh.';
    } finally {
      (event.target as HTMLInputElement).value = '';
    }
  }

  clearHeroImage(index: number): void {
    if (index < 0 || index >= this.hero.items.length) return;
    this.hero.items[index].imageUrl = null;
  }

  addVoucher(): void {
    const first = this.coupons[0]?.id ?? null;
    this.vouchers.items.push({
      enabled: true,
      itemType: 'COUPON',
      refId: first,
      title: null,
      note: null,
      buttonText: 'Sao chép mã'
    });
  }

  remove(list: ItemForm[], i: number): void {
    list.splice(i, 1);
  }

  up(list: ItemForm[], i: number): void {
    if (i <= 0) return;
    const a = list[i - 1];
    list[i - 1] = list[i];
    list[i] = a;
  }

  down(list: ItemForm[], i: number): void {
    if (i >= list.length - 1) return;
    const a = list[i + 1];
    list[i + 1] = list[i];
    list[i] = a;
  }

  couponCode(id?: number | null): string {
    const c = this.coupons.find((x) => x.id === Number(id || 0));
    return c ? c.code : '';
  }

  private loadCoupons(): void {
    this.adminData.getCoupons().subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.coupons = rows;
      },
      error: () => {
        this.coupons = [];
      }
    });
  }

  private heroRoute(it: ItemForm): string | null {
    const act = (it?.ctaAction || 'SCROLL') as CtaAction;
    if (act === 'SCROLL') return null;
    if (act === 'SALE') return '/sale';
    if (act === 'CATEGORY') {
      const slug = String(it?.ctaCategorySlug || '').trim();
      return slug ? `/category/${slug}` : null;
    }
    if (act === 'CUSTOM') {
      const r = String(it?.customRoute || '').trim();
      return r || null;
    }
    return null;
  }

  private deriveCtaFromRoute(route?: string | null): { ctaAction: CtaAction; ctaCategorySlug: string | null; customRoute: string | null } {
    const r = String(route || '').trim();
    if (!r) return { ctaAction: 'SCROLL', ctaCategorySlug: null, customRoute: null };
    if (r === '/sale') return { ctaAction: 'SALE', ctaCategorySlug: null, customRoute: null };
    const m = r.match(/^\/category\/(.+)$/);
    if (m && m[1]) return { ctaAction: 'CATEGORY', ctaCategorySlug: m[1], customRoute: null };
    return { ctaAction: 'CUSTOM', ctaCategorySlug: null, customRoute: r };
  }

  private loadCategoryTree(): void {
    const url = `${environment.apiBaseUrl}/api/categories/tree`;
    this.http.get<ApiResponse<CategoryNode[]>>(url).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const all = this.flattenCategories(rows);
        const out = all
          .map((c) => ({ slug: String(c?.slug || '').trim(), label: String(c?.name || '').trim() }))
          .filter((x) => !!x.slug && !!x.label);

        const uniq = new Map<string, { slug: string; label: string }>();
        for (const x of out) {
          if (!uniq.has(x.slug)) uniq.set(x.slug, x);
        }
        this.categoryOptions = Array.from(uniq.values()).sort((a, b) => a.label.localeCompare(b.label));
      },
      error: () => {
        this.categoryOptions = [];
      }
    });
  }

  private flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
    const out: CategoryNode[] = [];
    const walk = (n: CategoryNode) => {
      if (!n) return;
      out.push(n);
      const children = Array.isArray(n.children) ? n.children : [];
      children.forEach(walk);
    };
    (nodes || []).forEach(walk);
    return out;
  }

  private applyHero(sections: HomeSectionResponse[]): void {
    const sec = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_HERO');
    this.hero.title = String(sec?.title || 'Trang Sale');
    this.hero.enabled = sec?.enabled !== false;

    const items = Array.isArray(sec?.items) ? sec!.items! : [];
    this.hero.items = items
      .filter((it) => String(it?.itemType || '').toUpperCase() === 'LINK')
      .map((it) => {
        const cta = this.deriveCtaFromRoute(it?.route ?? null);
        return {
          enabled: it?.enabled !== false,
          itemType: 'LINK',
          title: it?.title ?? null,
          titleColor: (it as any)?.titleColor ?? null,
          note: (it as any)?.note ?? null,
          noteColor: (it as any)?.noteColor ?? null,
          description: it?.description ?? null,
          imageUrl: it?.imageUrl ?? null,
          buttonText: it?.buttonText ?? null,
          route: it?.route ?? null,
          ctaAction: cta.ctaAction,
          ctaCategorySlug: cta.ctaCategorySlug,
          customRoute: cta.customRoute
        };
      });

    if (this.hero.items.length === 0) {
      this.addHeroSlide();
    }
  }

  private applyVouchers(sections: HomeSectionResponse[]): void {
    const sec = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_VOUCHERS');
    this.vouchers.title = String(sec?.title || 'NHẬN VOUCHER ĐỘC QUYỀN ONLINE');
    this.vouchers.enabled = sec?.enabled !== false;

    const items = Array.isArray(sec?.items) ? sec!.items! : [];
    this.vouchers.items = items
      .filter((it) => String(it?.itemType || '').toUpperCase() === 'COUPON')
      .map((it) => ({
        enabled: it?.enabled !== false,
        itemType: 'COUPON',
        refId: it?.refId ?? null,
        title: it?.title ?? null,
        note: (it as any)?.note ?? null,
        buttonText: it?.buttonText ?? null
      }));

    if (this.vouchers.items.length === 0) {
      this.addVoucher();
    }
  }

  private applyCategories(sections: HomeSectionResponse[]): void {
    const sec = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_CATEGORIES');
    this.categories.title = String(sec?.title || 'HÔM NAY SALE GÌ?');
    this.categories.enabled = sec?.enabled !== false;
  }

  private applySectionsNav(sections: HomeSectionResponse[]): void {
    const sec = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === 'SALE_SECTIONS');
    this.sectionsNav.title = String(sec?.title || 'Menu nhanh');
    this.sectionsNav.enabled = sec?.enabled !== false;

    const rawItems = Array.isArray(sec?.items) ? sec!.items! : [];
    const allowedKeys = new Set(this.sectionsNavDefaults.map((x) => x.key));

    const mapped = rawItems
      .filter((it) => String(it?.itemType || '').toUpperCase() === 'LINK')
      .map((it) => {
        const code = String((it as any)?.code || '').trim().toUpperCase();
        return {
          enabled: it?.enabled !== false,
          itemType: 'LINK' as AdminHomeSectionItemType,
          code: code || null,
          title: it?.title ?? null
        } as ItemForm;
      })
      .filter((it) => !!it.code && allowedKeys.has(String(it.code)))
      .map((it) => ({ ...it, code: String(it.code).toUpperCase() }));

    const byCode = new Map<string, ItemForm>();
    for (const it of mapped) {
      const k = String(it.code || '').toUpperCase();
      if (!k) continue;
      if (!byCode.has(k)) byCode.set(k, it);
    }

    const order: string[] = [];
    for (const it of mapped) {
      const k = String(it.code || '').toUpperCase();
      if (!k) continue;
      if (!order.includes(k)) order.push(k);
    }
    for (const d of this.sectionsNavDefaults) {
      const k = String(d.key).toUpperCase();
      if (!order.includes(k)) order.push(k);
    }

    this.sectionsNav.items = order
      .map((k) => {
        const def = this.sectionsNavDefaults.find((x) => x.key === k);
        const it = byCode.get(k);
        return {
          enabled: it ? it.enabled !== false : true,
          itemType: 'LINK' as AdminHomeSectionItemType,
          code: k,
          title: (it?.title ?? def?.title ?? k) as any
        } as ItemForm;
      })
      .filter((x) => allowedKeys.has(String(x.code || '')));
  }
}
