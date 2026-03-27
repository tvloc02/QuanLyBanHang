import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
  imageUrl?: string | null;
  parentId?: number | null;
  children?: CategoryNode[];
}

type CtaAction = 'SCROLL' | 'SALE' | 'CATEGORY' | 'CUSTOM';
type SaleBlockType = 'HERO' | 'VOUCHERS' | 'ROUND_CATEGORIES' | 'PRODUCTS';

interface HeroItemForm {
  enabled: boolean;
  title?: string | null;
  titleColor?: string | null;
  note?: string | null;
  noteColor?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  buttonText?: string | null;
  route?: string | null;
  ctaAction?: CtaAction;
  ctaCategorySlug?: string | null;
  customRoute?: string | null;
}

interface VoucherItemForm {
  enabled: boolean;
  refId?: number | null;
  title?: string | null;
  note?: string | null;
  buttonText?: string | null;
}

interface CategoryLinkForm {
  enabled: boolean;
  slug: string;
  label: string;
  imageUrl?: string | null;
}

interface SaleBlock {
  id: string;
  type: SaleBlockType;
  title: string;
  enabled: boolean;
  heroItems: HeroItemForm[];
  voucherItems: VoucherItemForm[];
  categoryItems: CategoryLinkForm[];
  productCategoryItems: CategoryLinkForm[];
}

interface CategoryOption {
  slug: string;
  label: string;
  imageUrl?: string | null;
  level?: number;
}

@Component({
  selector: 'app-admin-sale-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-sale-page.component.html',
  styleUrls: ['./admin-sale-page.component.scss']
})
export class AdminSalePageComponent implements OnInit {
  loading = false;
  saving = false;
  error = '';
  categoryConfigId: number | null = null;
  categoryConfigName = '';

  coupons: AdminCouponResponse[] = [];
  categoryOptions: CategoryOption[] = [];
  blocks: SaleBlock[] = [];
  productPickerBlockId: string | null = null;
  productPickerQuery = '';
  productPickerTempSlugs: string[] = [];
  voucherPickerBlockId: string | null = null;
  voucherPickerQuery = '';
  voucherPickerTempIds: number[] = [];
  roundPickerBlockId: string | null = null;
  roundPickerQuery = '';
  roundPickerTempSlugs: string[] = [];
  activeCategoryEditorIndex: Record<string, number> = {};

  private readonly apiBaseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  constructor(
    private adminData: AdminDataService,
    private http: HttpClient,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const rawId =
      this.route.snapshot.paramMap.get('id') ||
      this.route.snapshot.queryParamMap.get('id') ||
      this.route.pathFromRoot
        .map((r) => r.snapshot.paramMap.get('id'))
        .find((x) => !!x) ||
      null;

    const routePath = this.route.snapshot.routeConfig?.path || '';
    this.categoryConfigId = routePath.includes('category-config') && rawId ? Number(rawId) : null;
    this.load();
    this.loadCoupons();
    this.loadCategoryTree();
  }

  private get isCategoryConfigMode(): boolean {
    return Number.isFinite(Number(this.categoryConfigId)) && Number(this.categoryConfigId) > 0;
  }

  private get sectionScopePrefix(): string {
    return this.isCategoryConfigMode ? `CATEGORY_${this.categoryConfigId}_` : 'SALE_';
  }

  private get layoutKey(): string {
    return `${this.sectionScopePrefix}LAYOUT`;
  }

  get pageTitle(): string {
    if (!this.isCategoryConfigMode) return 'Trang Sale';
    return this.categoryConfigName ? this.categoryConfigName : `Cấu hình danh mục #${this.categoryConfigId}`;
  }

  get pageDescription(): string {
    if (!this.isCategoryConfigMode) {
      return 'Cấu hình nội dung hiển thị trên trang /sale: Banner, Voucher, danh mục tròn, sản phẩm.';
    }
    return 'Cấu hình nội dung hiển thị cho danh mục lớn: Banner, Voucher, danh mục tròn, sản phẩm.';
  }

  private scopedLegacyKey(type: SaleBlockType): string {
    if (type === 'HERO') return `${this.sectionScopePrefix}HERO`;
    if (type === 'VOUCHERS') return `${this.sectionScopePrefix}VOUCHERS`;
    if (type === 'ROUND_CATEGORIES') return `${this.sectionScopePrefix}CATEGORIES`;
    return `${this.sectionScopePrefix}PRODUCTS`;
  }

  trackByBlock = (_: number, block: SaleBlock) => block.id;

  load(): void {
    this.loading = true;
    this.error = '';

    this.adminData.getHomeSections().subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải cấu hình trang Sale.';
          return;
        }

        const sections = Array.isArray(res?.data) ? res.data : [];
        const dynamic = this.parseDynamicBlocks(sections);
        this.blocks = dynamic.length > 0 ? dynamic : this.buildLegacyBlocks(sections);

        if (this.blocks.length === 0) {
          this.blocks = [
            this.createBlock('HERO'),
            this.createBlock('VOUCHERS'),
            this.createBlock('ROUND_CATEGORIES'),
            this.createBlock('PRODUCTS')
          ];
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy cấu hình trang Sale.';
      }
    });
  }

  save(): void {
    this.saving = true;
    this.error = '';

    const layoutPayload = {
      title: this.isCategoryConfigMode ? `Cấu hình danh mục ${this.categoryConfigId}` : 'Trang Sale',
      enabled: true,
      items: this.blocks.map((block, index) => ({
        enabled: block.enabled,
        itemType: 'LINK' as AdminHomeSectionItemType,
        refId: null,
        title: block.title || this.defaultTitle(block.type),
        description: null,
        imageUrl: null,
        route: this.sectionKey(block),
        code: block.type,
        note: String(index),
        buttonText: null
      }))
    };

    const requests = [
      this.adminData.updateHomeSection(this.layoutKey, layoutPayload as any),
      ...this.blocks.map((block) =>
        this.adminData.updateHomeSection(this.sectionKey(block), this.buildBlockPayload(block) as any)
      ),
      ...this.buildLegacyMirrorRequests()
    ];

    forkJoin(requests).subscribe({
      next: (responses: any[]) => {
        this.saving = false;
        const ok = responses.every((x) => !!x?.success);
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

  addBlock(type: SaleBlockType): void {
    this.blocks.push(this.createBlock(type));
  }

  removeBlock(index: number): void {
    this.blocks.splice(index, 1);
  }

  moveBlockUp(index: number): void {
    if (index <= 0) return;
    const prev = this.blocks[index - 1];
    this.blocks[index - 1] = this.blocks[index];
    this.blocks[index] = prev;
  }

  moveBlockDown(index: number): void {
    if (index >= this.blocks.length - 1) return;
    const next = this.blocks[index + 1];
    this.blocks[index + 1] = this.blocks[index];
    this.blocks[index] = next;
  }

  addHeroSlide(block: SaleBlock): void {
    block.heroItems.push(this.createHeroItem());
  }

  addVoucher(block: SaleBlock): void {
    block.voucherItems.push({
      enabled: true,
      refId: this.coupons[0]?.id ?? null,
      title: null,
      note: null,
      buttonText: 'Sao chép mã'
    });
  }

  fillAllVouchers(block: SaleBlock): void {
    const rows = Array.isArray(this.coupons) ? this.coupons : [];
    block.voucherItems = rows.map((c) => ({
      enabled: true,
      refId: c.id,
      title: null,
      note: null,
      buttonText: 'Sao chép mã'
    }));
  }

  addRoundCategory(block: SaleBlock): void {
    const first = this.categoryOptions[0];
    block.categoryItems.push({
      enabled: true,
      slug: first?.slug || '',
      label: first?.label || '',
      imageUrl: first?.imageUrl || null
    });
    this.activeCategoryEditorIndex[block.id] = Math.max(0, block.categoryItems.length - 1);
  }

  addProductCategory(block: SaleBlock): void {
    const first = this.categoryOptions[0];
    block.productCategoryItems.push({
      enabled: true,
      slug: first?.slug || '',
      label: first?.label || '',
      imageUrl: first?.imageUrl || null
    });
  }

  removeHeroSlide(block: SaleBlock, index: number): void {
    block.heroItems.splice(index, 1);
  }

  removeVoucher(block: SaleBlock, index: number): void {
    block.voucherItems.splice(index, 1);
  }

  removeRoundCategory(block: SaleBlock, index: number): void {
    block.categoryItems.splice(index, 1);
    const next = Math.max(0, Math.min(this.activeCategoryEditorIndex[block.id] ?? 0, block.categoryItems.length - 1));
    this.activeCategoryEditorIndex[block.id] = next;
  }

  removeProductCategory(block: SaleBlock, index: number): void {
    block.productCategoryItems.splice(index, 1);
  }

  onCategoryChoiceChange(item: CategoryLinkForm): void {
    const found = this.categoryOptions.find((x) => x.slug === item.slug);
    if (!found) return;
    item.label = found.label;
    item.imageUrl = found.imageUrl || null;
  }

  onHeroCtaActionChange(item: HeroItemForm): void {
    if (item.ctaAction !== 'CATEGORY') item.ctaCategorySlug = null;
    if (item.ctaAction !== 'CUSTOM') item.customRoute = null;
  }

  async onHeroFileSelect(block: SaleBlock, index: number, event: Event): Promise<void> {
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
      if (index < 0 || index >= block.heroItems.length) return;
      block.heroItems[index].imageUrl = uploaded;
    } catch (e: any) {
      this.error = e?.error?.message || 'Không upload được ảnh.';
    } finally {
      input.value = '';
    }
  }

  clearHeroImage(block: SaleBlock, index: number): void {
    if (index < 0 || index >= block.heroItems.length) return;
    block.heroItems[index].imageUrl = null;
  }

  async onRoundCategoryFileSelect(block: SaleBlock, index: number, event: Event): Promise<void> {
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
      if (index < 0 || index >= block.categoryItems.length) return;
      block.categoryItems[index].imageUrl = uploaded;
    } catch (e: any) {
      this.error = e?.error?.message || 'Không upload được ảnh.';
    } finally {
      input.value = '';
    }
  }

  couponCode(id?: number | null): string {
    const c = this.coupons.find((x) => x.id === Number(id || 0));
    return c ? c.code : '';
  }

  resolveImageUrl(src?: string | null): string {
    const s = String(src || '').trim();
    if (!s) return '';
    if (s.startsWith('data:') || s.startsWith('blob:')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/')) return `${this.apiBaseUrl}${s}`;
    return `${this.apiBaseUrl}/${s}`;
  }

  typeLabel(type: SaleBlockType): string {
    if (type === 'HERO') return 'Banner (Hero)';
    if (type === 'VOUCHERS') return 'Voucher';
    if (type === 'ROUND_CATEGORIES') return 'Danh mục tròn';
    return 'Sản phẩm';
  }

  changeBlockType(block: SaleBlock, nextType: SaleBlockType): void {
    if (!block || !nextType || block.type === nextType) return;

    block.type = nextType;
    block.title = this.defaultTitle(nextType);
    block.heroItems = nextType === 'HERO' ? [this.createHeroItem()] : [];
    block.voucherItems = nextType === 'VOUCHERS' ? [this.createVoucherItem()] : [];
    block.categoryItems = [];
    block.productCategoryItems = [];
    this.activeCategoryEditorIndex[block.id] = 0;
  }

  selectedRoundCategory(block: SaleBlock): CategoryLinkForm | null {
    const index = this.activeCategoryEditorIndex[block.id] ?? 0;
    return block.categoryItems[index] ?? null;
  }

  setActiveRoundCategory(block: SaleBlock, index: number): void {
    this.activeCategoryEditorIndex[block.id] = index;
  }

  moveRoundCategory(block: SaleBlock, direction: -1 | 1): void {
    const index = this.activeCategoryEditorIndex[block.id] ?? 0;
    const target = index + direction;
    if (index < 0 || target < 0 || target >= block.categoryItems.length) return;
    const temp = block.categoryItems[index];
    block.categoryItems[index] = block.categoryItems[target];
    block.categoryItems[target] = temp;
    this.activeCategoryEditorIndex[block.id] = target;
  }

  moveRoundCategoryVertical(block: SaleBlock, direction: -1 | 1): void {
    const columns = 6;
    const index = this.activeCategoryEditorIndex[block.id] ?? 0;
    const target = index + direction * columns;
    if (index < 0 || target < 0 || target >= block.categoryItems.length) return;
    const temp = block.categoryItems[index];
    block.categoryItems[index] = block.categoryItems[target];
    block.categoryItems[target] = temp;
    this.activeCategoryEditorIndex[block.id] = target;
  }

  openProductPicker(block: SaleBlock): void {
    this.productPickerBlockId = block.id;
    this.productPickerQuery = '';
    this.productPickerTempSlugs = block.productCategoryItems.map((item) => item.slug).filter(Boolean);
  }

  openVoucherPicker(block: SaleBlock): void {
    this.voucherPickerBlockId = block.id;
    this.voucherPickerQuery = '';
    this.voucherPickerTempIds = block.voucherItems.map((item) => Number(item.refId || 0)).filter(Boolean);
  }

  closeVoucherPicker(): void {
    this.voucherPickerBlockId = null;
    this.voucherPickerQuery = '';
    this.voucherPickerTempIds = [];
  }

  isVoucherPickerOpen(block: SaleBlock): boolean {
    return this.voucherPickerBlockId === block.id;
  }

  activeVoucherPickerBlock(): SaleBlock | null {
    return this.blocks.find((block) => block.id === this.voucherPickerBlockId) || null;
  }

  toggleVoucherPickerId(id: number): void {
    const index = this.voucherPickerTempIds.indexOf(id);
    if (index >= 0) this.voucherPickerTempIds.splice(index, 1);
    else this.voucherPickerTempIds.push(id);
  }

  applyVoucherPicker(block: SaleBlock): void {
    const selected = this.coupons.filter((item) => this.voucherPickerTempIds.includes(item.id)).slice(0, 4);
    block.voucherItems = selected.map((item) => ({
      enabled: true,
      refId: item.id,
      title: null,
      note: null,
      buttonText: 'Sao chép mã'
    }));
    this.closeVoucherPicker();
  }

  filteredCoupons(): AdminCouponResponse[] {
    const query = this.voucherPickerQuery.trim().toLowerCase();
    if (!query) return this.coupons;
    return this.coupons.filter((item) => String(item.code || '').toLowerCase().includes(query));
  }

  openRoundPicker(block: SaleBlock): void {
    this.roundPickerBlockId = block.id;
    this.roundPickerQuery = '';
    this.roundPickerTempSlugs = block.categoryItems.map((item) => item.slug).filter(Boolean);
  }

  closeRoundPicker(): void {
    this.roundPickerBlockId = null;
    this.roundPickerQuery = '';
    this.roundPickerTempSlugs = [];
  }

  isRoundPickerOpen(block: SaleBlock): boolean {
    return this.roundPickerBlockId === block.id;
  }

  activeRoundPickerBlock(): SaleBlock | null {
    return this.blocks.find((block) => block.id === this.roundPickerBlockId) || null;
  }

  toggleRoundPickerSlug(slug: string): void {
    const index = this.roundPickerTempSlugs.indexOf(slug);
    if (index >= 0) this.roundPickerTempSlugs.splice(index, 1);
    else this.roundPickerTempSlugs.push(slug);
  }

  applyRoundPicker(block: SaleBlock): void {
    const selected = this.categoryOptions.filter((item) => this.roundPickerTempSlugs.includes(item.slug)).slice(0, 12);
    block.categoryItems = selected.map((item) => ({
      enabled: true,
      slug: item.slug,
      label: item.label,
      imageUrl: item.imageUrl || null
    }));
    this.activeCategoryEditorIndex[block.id] = 0;
    this.closeRoundPicker();
  }

  filteredRoundCategoryOptions(): CategoryOption[] {
    const query = this.roundPickerQuery.trim().toLowerCase();
    if (!query) return this.categoryOptions;
    return this.categoryOptions.filter((item) =>
      item.label.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query)
    );
  }

  closeProductPicker(): void {
    this.productPickerBlockId = null;
    this.productPickerQuery = '';
    this.productPickerTempSlugs = [];
  }

  isProductPickerOpen(block: SaleBlock): boolean {
    return this.productPickerBlockId === block.id;
  }

  activeProductPickerBlock(): SaleBlock | null {
    return this.blocks.find((block) => block.id === this.productPickerBlockId) || null;
  }

  toggleProductPickerSlug(slug: string): void {
    const index = this.productPickerTempSlugs.indexOf(slug);
    if (index >= 0) {
      this.productPickerTempSlugs.splice(index, 1);
    } else {
      this.productPickerTempSlugs.push(slug);
    }
  }

  applyProductPicker(block: SaleBlock): void {
    const selected = this.categoryOptions.filter((item) => this.productPickerTempSlugs.includes(item.slug));
    block.productCategoryItems = selected.map((item) => ({
      enabled: true,
      slug: item.slug,
      label: item.label,
      imageUrl: item.imageUrl || null
    }));
    this.closeProductPicker();
  }

  clearProductPicker(block: SaleBlock): void {
    block.productCategoryItems = [];
    this.closeProductPicker();
  }

  filteredCategoryOptions(): CategoryOption[] {
    const query = this.productPickerQuery.trim().toLowerCase();
    if (!query) return this.categoryOptions;
    return this.categoryOptions.filter((item) =>
      item.label.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query)
    );
  }

  selectedProductCategorySummary(block: SaleBlock): string {
    const count = block.productCategoryItems.length;
    if (!count) return 'Chưa chọn danh mục nào để hiển thị sản phẩm trên trang bán hàng.';
    if (count === 1) return 'Đang hiển thị toàn bộ sản phẩm của 1 danh mục đã chọn.';
    return `Đang hiển thị toàn bộ sản phẩm của ${count} danh mục đã chọn.`;
  }

  visibleRoundCategoryItems(block: SaleBlock): CategoryLinkForm[] {
    return block.categoryItems.slice(0, 12);
  }

  couponMinOrderText(id?: number | null): string {
    const coupon = this.coupons.find((item) => item.id === Number(id || 0));
    const minOrder = Number((coupon as any)?.minOrderValue ?? (coupon as any)?.minimumOrder ?? 0);
    if (!minOrder) return 'Đơn từ 0đ';
    return `Đơn từ ${new Intl.NumberFormat('vi-VN').format(minOrder)}đ`;
  }

  couponSummaryText(coupon: AdminCouponResponse): string {
    return `Đơn từ ${new Intl.NumberFormat('vi-VN').format(Number((coupon as any)?.minOrderValue ?? (coupon as any)?.minimumOrder ?? 0))}đ`;
  }

  private parseDynamicBlocks(sections: HomeSectionResponse[]): SaleBlock[] {
    const layout = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === this.layoutKey.toUpperCase());
    const layoutItems = Array.isArray(layout?.items) ? layout!.items! : [];
    const byKey = new Map<string, HomeSectionResponse>();
    for (const sec of sections) {
      const key = String(sec?.sectionKey || '').trim().toUpperCase();
      if (key) byKey.set(key, sec);
    }

    const blocks = layoutItems
      .filter((item) => String(item?.itemType || '').toUpperCase() === 'LINK')
      .map((item) => {
        const type = String(item?.code || '').trim().toUpperCase() as SaleBlockType;
        const key = String(item?.route || '').trim().toUpperCase();
        if (!key || !['HERO', 'VOUCHERS', 'ROUND_CATEGORIES', 'PRODUCTS'].includes(type)) return null;
        const section = byKey.get(key);
        return this.mapSectionToBlock(key.replace(new RegExp(`^${this.sectionScopePrefix}BLOCK_`, 'i'), ''), type, section, item?.title || null, item?.enabled !== false);
      })
      .filter((x): x is SaleBlock => !!x);

    return blocks;
  }

  private buildLegacyBlocks(sections: HomeSectionResponse[]): SaleBlock[] {
    const hero = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === this.scopedLegacyKey('HERO').toUpperCase());
    const vouchers = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === this.scopedLegacyKey('VOUCHERS').toUpperCase());
    const categories = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === this.scopedLegacyKey('ROUND_CATEGORIES').toUpperCase());
    const products = sections.find((x) => String(x?.sectionKey || '').toUpperCase() === this.scopedLegacyKey('PRODUCTS').toUpperCase());

    return [
      this.mapSectionToBlock('hero-1', 'HERO', hero, hero?.title || this.defaultTitle('HERO'), hero?.enabled !== false),
      this.mapSectionToBlock('voucher-1', 'VOUCHERS', vouchers, vouchers?.title || this.defaultTitle('VOUCHERS'), vouchers?.enabled !== false),
      this.mapSectionToBlock('round-1', 'ROUND_CATEGORIES', categories, categories?.title || this.defaultTitle('ROUND_CATEGORIES'), categories?.enabled !== false),
      this.mapSectionToBlock('products-1', 'PRODUCTS', products, products?.title || this.defaultTitle('PRODUCTS'), products?.enabled !== false)
    ];
  }

  private mapSectionToBlock(
    id: string,
    type: SaleBlockType,
    section: HomeSectionResponse | undefined,
    title: string | null,
    enabled: boolean
  ): SaleBlock {
    const block = this.createBlock(type, id);
    block.title = String(title || this.defaultTitle(type));
    block.enabled = enabled;

    const items = Array.isArray(section?.items) ? section!.items! : [];

    if (type === 'HERO') {
      block.heroItems = items
        .filter((it) => String(it?.itemType || '').toUpperCase() === 'LINK')
        .map((it) => {
          const cta = this.deriveCtaFromRoute(it?.route ?? null);
          return {
            enabled: it?.enabled !== false,
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
      if (block.heroItems.length === 0) block.heroItems = [this.createHeroItem()];
    }

    if (type === 'VOUCHERS') {
      block.voucherItems = items
        .filter((it) => String(it?.itemType || '').toUpperCase() === 'COUPON')
        .map((it) => ({
          enabled: it?.enabled !== false,
          refId: it?.refId ?? null,
          title: it?.title ?? null,
          note: (it as any)?.note ?? null,
          buttonText: it?.buttonText ?? null
        }));
      if (block.voucherItems.length === 0) block.voucherItems = [this.createVoucherItem()];
    }

    if (type === 'ROUND_CATEGORIES') {
      block.categoryItems = items
        .filter((it) => String(it?.itemType || '').toUpperCase() === 'LINK')
        .map((it) => ({
          enabled: it?.enabled !== false,
          slug: String(it?.code || '').trim(),
          label: String(it?.title || '').trim(),
          imageUrl: it?.imageUrl ?? null
        }))
        .filter((it) => !!it.slug);
    }

    if (type === 'PRODUCTS') {
      block.productCategoryItems = items
        .filter((it) => String(it?.itemType || '').toUpperCase() === 'LINK')
        .map((it) => ({
          enabled: it?.enabled !== false,
          slug: String(it?.code || '').trim(),
          label: String(it?.title || '').trim(),
          imageUrl: null
        }))
        .filter((it) => !!it.slug);
    }

    return block;
  }

  private buildBlockPayload(block: SaleBlock) {
    if (block.type === 'HERO') {
      return {
        title: block.title?.trim() || this.defaultTitle(block.type),
        enabled: !!block.enabled,
        items: block.heroItems.map((i) => ({
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
    }

    if (block.type === 'VOUCHERS') {
      return {
        title: block.title?.trim() || this.defaultTitle(block.type),
        enabled: !!block.enabled,
        items: block.voucherItems.map((i) => ({
          enabled: !!i.enabled,
          itemType: 'COUPON' as AdminHomeSectionItemType,
          refId: i.refId ?? null,
          title: i.title ?? null,
          description: null,
          imageUrl: null,
          route: null,
          code: null,
          note: i.note ?? null,
          buttonText: i.buttonText ?? null
        }))
      };
    }

    if (block.type === 'ROUND_CATEGORIES') {
      return {
        title: block.title?.trim() || this.defaultTitle(block.type),
        enabled: !!block.enabled,
        items: block.categoryItems.map((i) => ({
          enabled: !!i.enabled,
          itemType: 'LINK' as AdminHomeSectionItemType,
          refId: null,
          title: i.label || null,
          description: null,
          imageUrl: i.imageUrl || null,
          route: i.slug ? `/category/${i.slug}` : null,
          code: i.slug || null,
          note: null,
          buttonText: null
        }))
      };
    }

    return {
      title: block.title?.trim() || this.defaultTitle(block.type),
      enabled: !!block.enabled,
      items: block.productCategoryItems.map((i) => ({
        enabled: !!i.enabled,
        itemType: 'LINK' as AdminHomeSectionItemType,
        refId: null,
        title: i.label || null,
        description: null,
        imageUrl: null,
        route: i.slug ? `/category/${i.slug}` : null,
        code: i.slug || null,
        note: null,
        buttonText: null
      }))
    };
  }

  private buildLegacyMirrorRequests() {
    const requests = [] as ReturnType<AdminDataService['updateHomeSection']>[];
    const firstHero = this.blocks.find((block) => block.type === 'HERO') || this.createBlock('HERO', 'hero-legacy');
    const firstVouchers =
      this.blocks.find((block) => block.type === 'VOUCHERS') || this.createBlock('VOUCHERS', 'voucher-legacy');
    const firstRound =
      this.blocks.find((block) => block.type === 'ROUND_CATEGORIES') || this.createBlock('ROUND_CATEGORIES', 'round-legacy');
    const firstProducts =
      this.blocks.find((block) => block.type === 'PRODUCTS') || this.createBlock('PRODUCTS', 'products-legacy');

    requests.push(this.adminData.updateHomeSection(this.scopedLegacyKey('HERO'), this.buildBlockPayload(firstHero) as any));
    requests.push(this.adminData.updateHomeSection(this.scopedLegacyKey('VOUCHERS'), this.buildBlockPayload(firstVouchers) as any));
    requests.push(this.adminData.updateHomeSection(this.scopedLegacyKey('ROUND_CATEGORIES'), this.buildBlockPayload(firstRound) as any));
    requests.push(this.adminData.updateHomeSection(this.scopedLegacyKey('PRODUCTS'), this.buildBlockPayload(firstProducts) as any));

    return requests;
  }

  private createBlock(type: SaleBlockType, forcedId?: string): SaleBlock {
    const block = {
      id: forcedId || `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title: this.defaultTitle(type),
      enabled: true,
      heroItems: type === 'HERO' ? [this.createHeroItem()] : [],
      voucherItems: type === 'VOUCHERS' ? [this.createVoucherItem()] : [],
      categoryItems: [],
      productCategoryItems: []
    };
    this.activeCategoryEditorIndex[block.id] = 0;
    return block;
  }

  private createHeroItem(): HeroItemForm {
    return {
      enabled: true,
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
    };
  }

  private createVoucherItem(): VoucherItemForm {
    return {
      enabled: true,
      refId: this.coupons[0]?.id ?? null,
      title: null,
      note: null,
      buttonText: 'Sao chép mã'
    };
  }

  private defaultTitle(type: SaleBlockType): string {
    if (type === 'HERO') return 'Banner (Hero)';
    if (type === 'VOUCHERS') return 'NHẬN VOUCHER ĐỘC QUYỀN ONLINE';
    if (type === 'ROUND_CATEGORIES') return 'HÔM NAY SALE GÌ?';
    return 'SẢN PHẨM ĐANG GIẢM GIÁ';
  }

  private sectionKey(block: SaleBlock): string {
    return `${this.sectionScopePrefix}BLOCK_${String(block.id || '').trim().toUpperCase()}`;
  }

  private heroRoute(it: HeroItemForm): string | null {
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

  private loadCoupons(): void {
    this.adminData.getCoupons().subscribe({
      next: (res) => {
        this.coupons = Array.isArray(res?.data) ? res.data : [];
      },
      error: () => {
        this.coupons = [];
      }
    });
  }

  private loadCategoryTree(): void {
    const url = `${environment.apiBaseUrl}/api/categories/tree`;
    this.http.get<ApiResponse<CategoryNode[]>>(url).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const flat = this.flattenCategories(rows);
        if (this.isCategoryConfigMode) {
          const current = flat.find((c) => Number(c?.id) === Number(this.categoryConfigId));
          this.categoryConfigName = String(current?.name || '').trim();
        }

        const out = flat
          .map((c) => ({
            slug: String(c?.slug || '').trim(),
            label: String(c?.name || '').trim(),
            imageUrl: c?.imageUrl || null,
            level: Number((c as any)?.__level || 0)
          }))
          .filter((x) => !!x.slug && !!x.label);

        const uniq = new Map<string, CategoryOption>();
        for (const x of out) {
          if (!uniq.has(x.slug)) uniq.set(x.slug, x);
        }
        this.categoryOptions = Array.from(uniq.values());
      },
      error: () => {
        this.categoryOptions = [];
      }
    });
  }

  private flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
    const out: CategoryNode[] = [];
    const walk = (n: CategoryNode | null | undefined, level = 0) => {
      if (!n) return;
      out.push({ ...n, __level: level } as CategoryNode & { __level: number });
      const children = Array.isArray(n.children) ? n.children : [];
      children.forEach((child) => walk(child, level + 1));
    };
    (nodes || []).forEach((node) => walk(node, 0));
    return out;
  }
}
