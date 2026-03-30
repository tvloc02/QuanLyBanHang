import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

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

interface ProductVariantSizeStockResponse {
  size: string;
  stock: number;
}

interface ProductVariantResponse {
  id?: number;
  color: string;
  price: number;
  oldPrice?: number;
  images?: string[];
  stocks?: ProductVariantSizeStockResponse[];
  active?: boolean;
}

interface AdminBranchResponse {
  id: number;
  code: string;
  name: string;
  active?: boolean;
}

interface AdminProductVariantBranchStockResponse {
  branchId: number;
  productId: number;
  color: string;
  size: string;
  stock: number;
  imageUrl?: string;
  weightKg?: number;
  updatedAt?: string;
}

interface AdminProductBranchStockResponse {
  branchId: number;
  productId: number;
  stock: number;
  updatedAt?: string;
}

interface AdminProductTypeResponse {
  id: number;
  code: string;
  name: string;
  active?: boolean;
  fieldsJson?: string;
}

type SizeGroup = {
  key: string;
  label: string;
};

type SizeMatrixRow = {
  size: string;
};

interface VariantBranchMatrixRow {
  genderKey: string;
  genderLabel: string;
  color: string;
  size: string;
  weightKg: number | null;
  price: number;
  oldPrice: number | null;
  imageUrl: string;
  branchStocks: Array<{ branchId: number; stock: number }>;
  total: number;
}

interface ProductResponse {
  id: number;
  sku?: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  oldPrice?: number;
  weightKg?: number | null;
  stock: number;
  categoryId?: number;
  categoryIds?: number[];
  category: string;
  brand: string;
  productTypeId?: number | null;
  imageUrl?: string;
  images?: string[];
  variants?: ProductVariantResponse[];
  badge?: string;
  discountPercent?: number;
  rating?: number;
  soldCount?: number;
  sizes?: string[];
  colors?: string[];
  gender?: string;
  active?: boolean;
}

type DescriptionBlockType = 'heading-lg' | 'heading-sm' | 'divider' | 'paragraph' | 'image';

interface DescriptionBlock {
  id: string;
  type: DescriptionBlockType;
  text?: string;
  imageUrl?: string;
  alt?: string;
}

@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-product-form.component.html',
  styleUrls: ['./admin-product-form.component.scss']
})
export class AdminProductFormComponent {
  loading = false;
  saving = false;
  descriptionBlocks: DescriptionBlock[] = [];
  private descriptionBlockSeed = 0;

  get canEditMatrixPrice(): boolean {
    return !this.saving;
  }

  formatVnd(value: unknown): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(n));
  }

  private digitsOnly(value: unknown): string {
    return (value ?? '').toString().replace(/[^0-9]/g, '');
  }

  private parseVndNumber(value: unknown): number | null {
    const s = this.digitsOnly(value);
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  onVndControlFocus(controlName: 'price' | 'oldPrice', ev: FocusEvent): void {
    const el = ev?.target as HTMLInputElement | null;
    if (!el) return;
    el.value = this.digitsOnly(el.value);
  }

  onVndControlInput(controlName: 'price' | 'oldPrice', ev: Event): void {
    const el = ev?.target as HTMLInputElement | null;
    if (!el) return;
    const raw = this.digitsOnly(el.value);
    el.value = raw;
    const n = this.parseVndNumber(raw);
    const ctrl = this.form.get(controlName);
    if (!ctrl) return;
    ctrl.setValue(n, { emitEvent: false });
    ctrl.markAsDirty();
  }

  onVndControlBlur(controlName: 'price' | 'oldPrice', ev: FocusEvent): void {
    const el = ev?.target as HTMLInputElement | null;
    if (!el) return;
    const ctrl = this.form.get(controlName);
    const n = ctrl ? Number(ctrl.value) : NaN;
    el.value = Number.isFinite(n) ? this.formatVnd(n) : '';
  }

  onVndRowPriceFocus(row: VariantBranchMatrixRow, ev: FocusEvent): void {
    const el = ev?.target as HTMLInputElement | null;
    if (!el) return;
    el.value = this.digitsOnly(el.value);
  }

  onVndRowPriceInput(row: VariantBranchMatrixRow, ev: Event): void {
    const el = ev?.target as HTMLInputElement | null;
    if (!el) return;
    const raw = this.digitsOnly(el.value);
    el.value = raw;
    const n = this.parseVndNumber(raw);
    row.price = n != null ? n : 0;
    this.onVariantRowPriceChanged(row);
  }

  onVndRowPriceBlur(row: VariantBranchMatrixRow, ev: FocusEvent): void {
    const el = ev?.target as HTMLInputElement | null;
    if (!el) return;
    el.value = Number.isFinite(Number(row?.price)) ? this.formatVnd(row.price) : '';
  }

  private _error = '';
  get error(): string {
    return this._error;
  }
  set error(v: string) {
    this._error = (v || '').toString();
    if (this._error) this.showToast('error', this._error);
  }

  private _success = '';
  get success(): string {
    return this._success;
  }
  set success(v: string) {
    this._success = (v || '').toString();
    if (this._success) this.showToast('success', this._success);
  }

  toastOpen = false;
  toastType: 'error' | 'success' = 'success';
  toastMessage = '';
  private toastTimer: any = null;

  private showToast(type: 'error' | 'success', message: string): void {
    const msg = (message || '').toString().trim();
    if (!msg) return;
    this.toastType = type;
    this.toastMessage = msg;
    this.toastOpen = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastTimer = null;
      this.toastOpen = false;
    }, 5000);
  }

  closeToast(): void {
    this.toastOpen = false;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }

  activeTab: 'BASIC' | 'IMAGES' | 'DESCRIPTION' = 'BASIC';

  readonly tabs: Array<{ key: AdminProductFormComponent['activeTab']; label: string }> = [
    { key: 'BASIC', label: 'Thông tin' },
    { key: 'IMAGES', label: 'Ảnh' },
    { key: 'DESCRIPTION', label: 'Mô tả' }
  ];

  private readonly apiBaseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  imageLayout: 'free' | '1-4' | '1-3' | '2-2' = 'free';

  categoryTree: CategoryNode[] = [];
  leafCategories: CategoryNode[] = [];
  allCategories: CategoryNode[] = [];
  categoryFilter = '';
  selectedCategoryIds = new Set<number>();
  selectedCategoryLeafs: CategoryNode[] = [];

  categoryModalOpen = false;
  expandedCategoryIds = new Set<number>();

  productTypesLoading = false;
  productTypes: AdminProductTypeResponse[] = [];

  selectedSizeGroupKeys = new Set<string>();

  private getSelectedGenderKeys(): string[] {
    const keys = Array.from(this.selectedSizeGroupKeys || [])
      .map((x) => String(x || '').trim())
      .filter((x) => x);
    return keys.length > 0 ? keys : [''];
  }

  private genderLabelByKey(genderKey: string): string {
    const k = String(genderKey || '').trim();
    if (!k) return 'Unisex';
    const g = (this.availableSizeGroups || []).find((x) => x && String(x.key) === k);
    return (g?.label || k).toString();
  }

  get activeProductTypes(): AdminProductTypeResponse[] {
    return (this.productTypes || []).filter((x) => x && x.active !== false);
  }

  branches: AdminBranchResponse[] = [];

  selectedBranchIds = new Set<number>();

  branchModalOpen = false;
  branchFilter = '';

  openBranchModal(): void {
    this.branchModalOpen = true;
  }

  closeBranchModal(): void {
    this.branchModalOpen = false;
  }

  get filteredBranches(): AdminBranchResponse[] {
    const q = (this.branchFilter || '').toString().trim().toLowerCase();
    const list = this.branches || [];
    if (!q) return list;
    return list.filter((b) => {
      const code = (b?.code || '').toString().toLowerCase();
      const name = (b?.name || '').toString().toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }

  get selectedBranches(): AdminBranchResponse[] {
    const ids = this.selectedBranchIds;
    const list = this.branches || [];
    if (ids.size === 0) return [];
    return list.filter((b) => b && typeof b.id === 'number' && ids.has(b.id));
  }

  private branchStockById = new Map<number, number>();

  branchStocks: Array<{ branchId: number; stock: number }> = [];

  private ensureDefaultSelectedBranches(): void {
    if ((this.branches || []).length === 0) return;
    if (this.selectedBranchIds.size > 0) return;

    // Với tạo mới sản phẩm, không auto-select kho để user chủ động chọn kho trước khi tạo ma trận.
    if (!this.isEdit) return;

    const fromStock = Array.from(this.branchStockById.keys());
    const fromVariantStock = Array.from(this.variantBranchCellByKey.keys())
      .map((k) => Number(String(k).split('|')[0]))
      .filter((x) => Number.isFinite(x));

    const candidate = new Set<number>([...fromStock, ...fromVariantStock]);
    if (candidate.size > 0) {
      for (const id of candidate) this.selectedBranchIds.add(id);
      return;
    }

    for (const b of this.branches || []) {
      if (b?.id != null) this.selectedBranchIds.add(b.id);
    }
  }

  toggleBranchSelection(branchId: number, checked: boolean): void {
    const bid = Number(branchId);
    if (!Number.isFinite(bid)) return;
    if (checked) this.selectedBranchIds.add(bid);
    else this.selectedBranchIds.delete(bid);

    this.ensureBranchStockRows();
    this.ensureVariantBranchRows();
  }

  branchLabelById(branchId: number): string {
    const b = (this.branches || []).find((x) => x.id === branchId);
    if (!b) return `#${branchId}`;
    return `${b.code} - ${b.name}`;
  }

  private ensureBranchStockRows(): void {
    const branchIds = (this.selectedBranches || []).map((b) => b.id).filter((x) => typeof x === 'number');
    const next = new Map<number, number>();
    for (const bid of branchIds) {
      next.set(bid, Number(this.branchStockById.get(bid) ?? 0));
    }
    this.branchStockById = next;

    this.branchStocks = branchIds.map((bid) => ({ branchId: bid, stock: Number(this.branchStockById.get(bid) ?? 0) }));

    if ((this.variants.controls || []).length === 0) {
      this.recalculateTotalStock();
    }
  }

  private loadBranchStocks(productId: number): void {
    const url = `${environment.apiBaseUrl}/api/admin/products/${productId}/branch-stocks`;
    this.http.get<ApiResponse<AdminProductBranchStockResponse[]>>(url).subscribe({
      next: (res) => {
        if (!res?.success) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        const next = new Map<number, number>();
        for (const x of rows as any[]) {
          const bid = Number(x?.branchId);
          if (!Number.isFinite(bid)) continue;
          const s = Math.max(0, Number(x?.stock ?? 0));
          next.set(bid, Number.isFinite(s) ? s : 0);
        }
        this.branchStockById = next;
        this.ensureDefaultSelectedBranches();
        this.ensureBranchStockRows();
      },
      error: () => {
        // ignore
      }
    });
  }

  onBranchStockChanged(row: { branchId: number; stock: number }): void {
    const bid = Number(row?.branchId);
    if (!Number.isFinite(bid)) return;
    const s = Math.max(0, Number(row?.stock ?? 0));
    this.branchStockById.set(bid, Number.isFinite(s) ? s : 0);
    if ((this.variants.controls || []).length === 0) {
      this.recalculateTotalStock();
    }
  }

  variantBranchRows: VariantBranchMatrixRow[] = [];
  private variantBranchCellByKey = new Map<string, { stock: number; imageUrl: string; weightKg: number | null }>();

  private variantBranchSyncTimer: any = null;

  trackByBranchId(_: number, b: AdminBranchResponse): number {
    return Number(b?.id);
  }

  trackByVariantBranchRow(_: number, r: VariantBranchMatrixRow): string {
    return `${this.normalizeKeyPart(r?.genderKey)}|${this.normalizeKeyPart(r?.color)}|${this.normalizeKeyPart(r?.size)}`;
  }

  private scheduleVariantBranchSync(): void {
    if (this.variantBranchSyncTimer) clearTimeout(this.variantBranchSyncTimer);
    this.variantBranchSyncTimer = setTimeout(() => {
      this.variantBranchSyncTimer = null;
      this.onVariantBranchMatrixChanged();
    }, 120);
  }

  private id: number | null = null;

  setTab(key: AdminProductFormComponent['activeTab']): void {
    this.activeTab = key;
  }

  isTab(key: AdminProductFormComponent['activeTab']): boolean {
    return this.activeTab === key;
  }

  trackByDescriptionBlock(_: number, block: DescriptionBlock): string {
    return block.id;
  }

  addDescriptionBlock(type: DescriptionBlockType): void {
    this.descriptionBlocks = [...this.descriptionBlocks, this.createDescriptionBlock(type)];
    this.syncDescriptionToForm();
  }

  moveDescriptionBlockUp(index: number): void {
    if (index <= 0 || index >= this.descriptionBlocks.length) return;
    const blocks = [...this.descriptionBlocks];
    [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
    this.descriptionBlocks = blocks;
    this.syncDescriptionToForm();
  }

  moveDescriptionBlockDown(index: number): void {
    if (index < 0 || index >= this.descriptionBlocks.length - 1) return;
    const blocks = [...this.descriptionBlocks];
    [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]];
    this.descriptionBlocks = blocks;
    this.syncDescriptionToForm();
  }

  removeDescriptionBlock(index: number): void {
    if (index < 0 || index >= this.descriptionBlocks.length) return;
    this.descriptionBlocks = this.descriptionBlocks.filter((_, i) => i !== index);
    if (this.descriptionBlocks.length === 0) {
      this.descriptionBlocks = [this.createDescriptionBlock('paragraph')];
    }
    this.syncDescriptionToForm();
  }

  onDescriptionBlockChanged(): void {
    this.syncDescriptionToForm();
  }

  async onDescriptionImageSelect(index: number, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    this.error = '';
    try {
      const formData = new FormData();
      formData.append('file', file, file.name || 'description-image.jpg');
      const url = `${environment.apiBaseUrl}/api/admin/uploads`;
      const res = await this.http.post<ApiResponse<{ url: string }>>(url, formData).toPromise();
      const uploaded = res?.data?.url;
      if (!uploaded) {
        this.error = res?.message || 'Upload ảnh mô tả thất bại.';
        return;
      }
      const block = this.descriptionBlocks[index];
      if (!block) return;
      block.imageUrl = uploaded;
      block.alt = block.alt || 'Ảnh mô tả sản phẩm';
      this.syncDescriptionToForm();
    } catch (e: any) {
      this.error = e?.error?.message || 'Không upload được ảnh mô tả.';
    } finally {
      if (input) input.value = '';
    }
  }

  clearDescriptionImage(index: number): void {
    const block = this.descriptionBlocks[index];
    if (!block) return;
    block.imageUrl = '';
    this.syncDescriptionToForm();
  }

  private createDescriptionBlock(type: DescriptionBlockType): DescriptionBlock {
    const id = `desc-block-${Date.now()}-${this.descriptionBlockSeed++}`;
    switch (type) {
      case 'image':
        return { id, type, imageUrl: '', alt: '' };
      case 'heading-lg':
        return { id, type, text: 'Tiêu đề lớn' };
      case 'heading-sm':
        return { id, type, text: 'Tiêu đề nhỏ' };
      case 'divider':
        return { id, type };
      default:
        return { id, type, text: '' };
    }
  }

  private hydrateDescriptionBlocks(raw: string | null | undefined): void {
    const text = (raw || '').toString().trim();
    if (!text) {
      this.descriptionBlocks = [this.createDescriptionBlock('paragraph')];
      this.syncDescriptionToForm();
      return;
    }

    try {
      const parsed = JSON.parse(text);
      const blocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
      if (parsed?.kind === 'blocks' && blocks.length > 0) {
        this.descriptionBlocks = blocks.map((block: any) => ({
          id: String(block?.id || `desc-block-${Date.now()}-${this.descriptionBlockSeed++}`),
          type: (block?.type || 'paragraph') as DescriptionBlockType,
          text: typeof block?.text === 'string' ? block.text : '',
          imageUrl: typeof block?.imageUrl === 'string' ? block.imageUrl : '',
          alt: typeof block?.alt === 'string' ? block.alt : ''
        }));
        this.syncDescriptionToForm();
        return;
      }
    } catch {
      // fallback to plain text block
    }

    this.descriptionBlocks = [{
      id: `desc-block-${Date.now()}-${this.descriptionBlockSeed++}`,
      type: 'paragraph',
      text
    }];
    this.syncDescriptionToForm();
  }

  private syncDescriptionToForm(): void {
    const blocks = (this.descriptionBlocks || [])
      .map((block) => ({
        id: block.id,
        type: block.type,
        text: (block.text || '').toString(),
        imageUrl: (block.imageUrl || '').toString(),
        alt: (block.alt || '').toString()
      }))
      .filter((block) => {
        if (block.type === 'divider') return true;
        if (block.type === 'image') return !!block.imageUrl;
        return !!block.text.trim();
      });

    this.form.patchValue(
      { description: JSON.stringify({ kind: 'blocks', blocks }) },
      { emitEvent: false }
    );
  }

  scrollToSection(sectionId: string): void {
    const id = (sectionId || '').toString().trim();
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form = this.fb.group({
    name: ['', [Validators.required]],
    slug: ['', [Validators.required]],
    category: ['', [Validators.required]],
    productTypeId: [null as number | null],
    brand: ['FashionHub', [Validators.required]],
    price: [199000, [Validators.required]],
    oldPrice: [null as number | null],
    stock: [0, [Validators.required]],
    images: this.fb.array<string>([]),
    badge: [''],
    discountPercent: [null as number | null],
    rating: [null as number | null],
    soldCount: [null as number | null],
    sizes: this.fb.array<string>([]),
    colors: this.fb.array<string>([]),
    sizesCsv: [''],
    colorsCsv: [''],
    variants: this.fb.array([]),
    description: [''],
    active: [true]
  });

  private pendingMainPreview = new Map<number, string>();
  private pendingVariantPreview = new Map<string, string>();

  cropOpen = false;
  cropBusy = false;
  private cropTarget:
    | { type: 'main'; index: number }
    | { type: 'variant'; variantIndex: number; imageIndex: number }
    | { type: 'matrix'; rowIndex: number }
    | null = null;
  private cropSrc = '';
  private cropImg = new Image();
  private cropImgLoaded = false;

  private cropRect = { x: 0, y: 0, w: 0, h: 0 };
  private cropDisplay = { x: 0, y: 0, w: 0, h: 0, scale: 1 };
  private cropDrag = {
    active: false,
    mode: 'new' as 'new' | 'move',
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    baseW: 0,
    baseH: 0,
    offsetX: 0,
    offsetY: 0
  };

  @ViewChild('cropCanvas')
  cropCanvas?: ElementRef<HTMLCanvasElement>;

  @ViewChild('matrixFileInput')
  matrixFileInput?: ElementRef<HTMLInputElement>;

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isManager(): boolean {
    return this.authService.isManager();
  }

  get canEditProductInfo(): boolean {
    return this.isAdmin;
  }

  get canEditStock(): boolean {
    return this.isManager || this.isAdmin;
  }

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.loadBranches();
    this.loadCategories();
    this.loadProductTypes();

    const rawId = this.route.snapshot.paramMap.get('id');
    this.id = rawId ? Number(rawId) : null;
    if (this.id && Number.isFinite(this.id)) {
      this.loadProduct(this.id);
    } else {
      this.images.clear();
      this.hydrateDescriptionBlocks('');
      // Bỏ addImage() mặc định để không bắt buộc có ảnh ngay lập tức
    }

    this.form.get('productTypeId')?.valueChanges.subscribe((pid) => {
      this.onProductTypeChanged(pid != null ? Number(pid) : null);
    });

    // Add CSV parsing for sizes and colors
    this.form.get('sizesCsv')?.valueChanges.subscribe((value) => {
      this.updateSizesFromArray(value || '');
    });

    this.form.get('colorsCsv')?.valueChanges.subscribe((value) => {
      this.updateColorsFromArray(value || '');
    });
  }

  private updateSizesFromArray(csvValue: string): void {
    const sizesArray = this.sizes;
    sizesArray.clear();
    
    if (!csvValue) return;
    
    const sizes = csvValue
      .split(',')
      .map(s => s.trim())
      .filter(s => s);
    
    sizes.forEach(size => {
      sizesArray.push(this.fb.control(size));
    });
    
    // Update matrix if branches are selected
    if (this.selectedBranchIds.size > 0) {
      setTimeout(() => {
        this.ensureVariantBranchRows();
      }, 0);
    }
  }

  private updateColorsFromArray(csvValue: string): void {
    const colorsArray = this.colors;
    colorsArray.clear();
    
    if (!csvValue) return;
    
    const colors = csvValue
      .split(',')
      .map(c => c.trim())
      .filter(c => c);
    
    colors.forEach(color => {
      colorsArray.push(this.fb.control(color));
    });
    
    // Update matrix if branches are selected
    if (this.selectedBranchIds.size > 0) {
      setTimeout(() => {
        this.ensureVariantBranchRows();
      }, 0);
    }
  }

  private parseProductTypeSizeMatrix(fieldsJson: string | null | undefined): { groups: SizeGroup[]; rowsByGroup: Record<string, SizeMatrixRow[]> } {
    try {
      const raw = (fieldsJson || '').toString().trim();
      if (!raw) return { groups: [], rowsByGroup: {} };
      const parsed = JSON.parse(raw);
      const sm = (parsed as any)?.sizeMatrix;
      if (!sm || typeof sm !== 'object') return { groups: [], rowsByGroup: {} };
      const gRaw = (sm as any).groups;
      const rbg = (sm as any).rowsByGroup;
      const groups: SizeGroup[] = Array.isArray(gRaw)
        ? gRaw
            .filter((x: any) => x && typeof x === 'object')
            .map((x: any) => ({ key: String(x.key || '').trim(), label: String(x.label || '').trim() }))
            .filter((x: any) => x.key && x.label)
        : [];
      const rowsByGroup: Record<string, SizeMatrixRow[]> = {};
      if (rbg && typeof rbg === 'object') {
        for (const k of Object.keys(rbg)) {
          const arr = (rbg as any)[k];
          if (!Array.isArray(arr)) continue;
          rowsByGroup[String(k)] = arr
            .filter((r: any) => r && typeof r === 'object')
            .map((r: any) => ({ size: String(r.size || '').trim() }))
            .filter((r: any) => r.size);
        }
      }
      return { groups, rowsByGroup };
    } catch {
      return { groups: [], rowsByGroup: {} };
    }
  }

  get selectedProductType(): AdminProductTypeResponse | null {
    const n = this.form.value.productTypeId != null ? Number(this.form.value.productTypeId) : NaN;
    if (!Number.isFinite(n)) return null;
    return (this.productTypes || []).find((x) => x && x.id === n) || null;
  }

  private sizeMatrixCacheKey: number | null = null;
  private sizeMatrixCache: { groups: SizeGroup[]; rowsByGroup: Record<string, SizeMatrixRow[]> } = { groups: [], rowsByGroup: {} };

  private refreshSizeMatrixCache(): void {
    const pt = this.selectedProductType;
    const key = pt?.id != null ? Number(pt.id) : null;
    if (key != null && Number.isFinite(key) && this.sizeMatrixCacheKey === key) return;
    this.sizeMatrixCacheKey = key != null && Number.isFinite(key) ? key : null;
    this.sizeMatrixCache = this.parseProductTypeSizeMatrix(pt?.fieldsJson);
  }

  get availableSizeGroups(): SizeGroup[] {
    this.refreshSizeMatrixCache();
    return this.sizeMatrixCache.groups || [];
  }

  get selectedSizeGroupLabel(): string {
    const keys = Array.from(this.selectedSizeGroupKeys || []).map((x) => String(x || '').trim()).filter((x) => x);
    if (keys.length === 0) return '';
    const groups = this.availableSizeGroups || [];
    const labels = keys
      .map((k) => groups.find((g) => String(g?.key) === k)?.label || k)
      .filter((x) => x);
    return labels.join(', ');
  }

  get selectedSizeGroups(): SizeGroup[] {
    const keys = this.selectedSizeGroupKeys;
    const groups = this.availableSizeGroups || [];
    return groups.filter((g) => g?.key && keys.has(String(g.key)));
  }

  sizesOfGroup(groupKey: string): string[] {
    this.refreshSizeMatrixCache();
    const key = String(groupKey || '').trim();
    if (!key) return [];
    const rows = this.sizeMatrixCache.rowsByGroup?.[key] || [];
    return rows.map((r) => String(r?.size || '').trim()).filter((x) => x);
  }

  private pickDefaultGroupKey(groups: SizeGroup[], rowsByGroup: Record<string, SizeMatrixRow[]>): string | null {
    for (const g of groups || []) {
      const rows = rowsByGroup?.[String(g.key)] || [];
      const hasAny = (rows || []).some((r) => String(r?.size || '').trim());
      if (hasAny) return String(g.key);
    }
    return groups?.[0]?.key ? String(groups[0].key) : null;
  }

  private applySizesFromSelectedGroup(): void {
    // Product type is used to CONFIGURE size groups/genders, but matrix sizes/colors come from CSV inputs.
    // So toggling gender groups should not overwrite sizesCsv.
    this.refreshSizeMatrixCache();
    if (this.selectedBranchIds.size > 0 && this.variants.length > 0) {
      setTimeout(() => {
        this.ensureVariantBranchRows();
      }, 0);
    }
  }

  private inferGroupKeyFromCurrentSizes(groups: SizeGroup[], rowsByGroup: Record<string, SizeMatrixRow[]>): string | null {
    const sizes = (this.sizes?.controls || [])
      .map((c: any) => (c.value || '').toString().trim())
      .filter((x: string) => x);
    if (!sizes.length) return null;
    const wanted = new Set(sizes);
    for (const g of groups || []) {
      const list = (rowsByGroup?.[g.key] || []).map((r) => String(r?.size || '').trim()).filter((x) => x);
      if (!list.length) continue;
      const set = new Set(list);
      const ok = Array.from(wanted).every((s) => set.has(s));
      if (ok) return g.key;
    }
    return null;
  }

  toggleSizeGroupSelection(groupKey: string, checked: boolean): void {
    const k = (groupKey || '').toString().trim();
    if (!k) return;
    if (checked) this.selectedSizeGroupKeys.add(k);
    else this.selectedSizeGroupKeys.delete(k);
    this.applySizesFromSelectedGroup();
  }

  private onProductTypeChanged(productTypeId: number | null): void {
    // refresh cache first so getters in template don't repeatedly parse JSON
    this.sizeMatrixCacheKey = null;
    this.refreshSizeMatrixCache();
    if (productTypeId == null || !Number.isFinite(productTypeId)) {
      this.selectedSizeGroupKeys.clear();
      return;
    }
    const pt = (this.productTypes || []).find((x) => x && x.id === productTypeId);
    if (!pt) {
      this.selectedSizeGroupKeys.clear();
      return;
    }
    const parsed = this.sizeMatrixCacheKey === productTypeId ? this.sizeMatrixCache : this.parseProductTypeSizeMatrix(pt.fieldsJson);
    const groups = parsed.groups || [];
    if (!groups.length) {
      this.selectedSizeGroupKeys.clear();
      return;
    }
    const inferred = this.inferGroupKeyFromCurrentSizes(groups, parsed.rowsByGroup);
    const picked = this.pickDefaultGroupKey(groups, parsed.rowsByGroup);
    this.selectedSizeGroupKeys.clear();
    const first = (inferred || picked || '').toString().trim();
    if (first) this.selectedSizeGroupKeys.add(first);
    this.applySizesFromSelectedGroup();
  }

  private loadProductTypes(): void {
    this.productTypesLoading = true;
    const url = `${environment.apiBaseUrl}/api/admin/product-types`;
    this.http.get<ApiResponse<AdminProductTypeResponse[]>>(url).subscribe({
      next: (res) => {
        this.productTypesLoading = false;
        if (!res?.success) {
          this.productTypes = [];
          return;
        }
        const rows = Array.isArray(res.data) ? res.data : [];
        this.productTypes = rows.filter((x) => x && typeof x.id === 'number');

        const current = this.form.value.productTypeId;
        if (current == null && !this.isEdit) {
          const firstActive = this.productTypes.find((x) => x.active !== false);
          if (firstActive?.id != null) {
            this.form.patchValue({ productTypeId: firstActive.id });
          }
        }
      },
      error: () => {
        this.productTypesLoading = false;
        this.productTypes = [];
      }
    });
  }

  productTypeLabelById(id: number | null | undefined): string {
    const pid = id != null ? Number(id) : NaN;
    if (!Number.isFinite(pid)) return '';
    const pt = (this.productTypes || []).find((x) => x.id === pid);
    return pt ? `${pt.name} (${pt.code})` : `#${pid}`;
  }

  private loadBranches(): void {
    const url = `${environment.apiBaseUrl}/api/admin/branches`;
    this.http.get<ApiResponse<AdminBranchResponse[]>>(url).subscribe({
      next: (res) => {
        if (!res?.success) {
          this.branches = [];
          return;
        }
        const rows = Array.isArray(res.data) ? res.data : [];
        this.branches = rows.filter((x) => x && typeof x.id === 'number');
        this.ensureDefaultSelectedBranches();
        this.ensureBranchStockRows();
        this.ensureVariantBranchRows();
      },
      error: () => {
        this.branches = [];
      }
    });
  }

  private normalizeKeyPart(v: unknown): string {
    return (v || '').toString().trim().toLowerCase();
  }

  private variantCellKey(branchId: number, genderKey: string, color: string, size: string): string {
    return `${branchId}|${this.normalizeKeyPart(genderKey)}|${this.normalizeKeyPart(color)}|${this.normalizeKeyPart(size)}`;
  }

  private buildVariantBranchRowsFromCsv(sizes: string[], colors: string[]): void {
    const branchIds = Array.from(this.selectedBranchIds || [])
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));
    if (branchIds.length === 0) return;

    const basePrice = Number(this.form.value.price || 0);
    const price = Number.isFinite(basePrice) ? basePrice : 0;
    const baseOldRaw = this.form.value.oldPrice;
    const baseOld = baseOldRaw != null ? Number(baseOldRaw) : null;
    const oldPrice = baseOld != null && Number.isFinite(baseOld) ? baseOld : null;

    const genders = this.getSelectedGenderKeys();
    const rows: VariantBranchMatrixRow[] = [];
    for (const genderKey of genders) {
      const genderLabel = this.genderLabelByKey(genderKey);
      for (const color of colors || []) {
        const c = (color || '').toString().trim();
        if (!c) continue;
        for (const size of sizes || []) {
          const s = (size || '').toString().trim();
          if (!s) continue;
          const branchStocks = branchIds.map((bid) => ({ branchId: bid, stock: 0 }));
          rows.push({ genderKey, genderLabel, color: c, size: s, weightKg: null, price, oldPrice, imageUrl: '', branchStocks, total: 0 });
        }
      }
    }

    this.variantBranchRows = rows;
    this.onVariantBranchMatrixChanged();
  }

  private sortVariantRowKeysByCsvOrder(
    rowKeys: Array<{ genderKey: string; color: string; size: string }>
  ): Array<{ genderKey: string; color: string; size: string }> {
    const colors = (this.colors?.controls || [])
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);
    const sizes = (this.sizes?.controls || [])
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);
    const genders = this.getSelectedGenderKeys();

    const colorIndex = new Map<string, number>();
    const sizeIndex = new Map<string, number>();
    const genderIndex = new Map<string, number>();
    colors.forEach((c, i) => colorIndex.set(this.normalizeKeyPart(c), i));
    sizes.forEach((s, i) => sizeIndex.set(this.normalizeKeyPart(s), i));
    genders.forEach((g, i) => genderIndex.set(this.normalizeKeyPart(g), i));

    return (rowKeys || []).slice().sort((a, b) => {
      const ga = genderIndex.get(this.normalizeKeyPart(a.genderKey)) ?? 9999;
      const gb = genderIndex.get(this.normalizeKeyPart(b.genderKey)) ?? 9999;
      if (ga !== gb) return ga - gb;
      const ca = colorIndex.get(this.normalizeKeyPart(a.color)) ?? 9999;
      const cb = colorIndex.get(this.normalizeKeyPart(b.color)) ?? 9999;
      if (ca !== cb) return ca - cb;
      const sa = sizeIndex.get(this.normalizeKeyPart(a.size)) ?? 9999;
      const sb = sizeIndex.get(this.normalizeKeyPart(b.size)) ?? 9999;
      return sa - sb;
    });
  }

  private remapVariantBranchCellsWithGender(): void {
    const genders = this.getSelectedGenderKeys();
    if (genders.length === 0 || genders[0] === '') return; // No need to remap if no gender
    
    const newMap = new Map<string, { stock: number; imageUrl: string; weightKg: number | null }>();
    
    // For each existing entry (with empty gender), create entries for each gender
    for (const [key, value] of this.variantBranchCellByKey.entries()) {
      const parts = key.split('|');
      if (parts.length >= 4) {
        const branchId = parts[0];
        const color = parts[2];
        const size = parts[3];

        for (const gender of genders) {
          const newKey = this.variantCellKey(Number(branchId), gender, color, size);
          newMap.set(newKey, { stock: value.stock, imageUrl: value.imageUrl, weightKg: value.weightKg });
        }
      }
    }
    
    this.variantBranchCellByKey = newMap;
    console.log('Remapped variantBranchCellByKey with genders:', genders);
    console.log('New map size:', newMap.size);
  }

  private ensureVariantBranchRows(): void {
    const branchIds = Array.from(this.selectedBranchIds || [])
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));

    console.log('ensureVariantBranchRows - branchIds:', branchIds);

    if (branchIds.length === 0) {
      this.variantBranchRows = [];
      console.log('No branch ids, returning empty rows');
      return;
    }

    const sizes = (this.sizes?.controls || [])
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);
    const colors = (this.colors?.controls || [])
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);
    const genders = this.getSelectedGenderKeys();

    console.log('ensureVariantBranchRows - sizes:', sizes);
    console.log('ensureVariantBranchRows - colors:', colors);
    console.log('ensureVariantBranchRows - genders:', genders);

    if (sizes.length === 0 || colors.length === 0) {
      this.variantBranchRows = [];
      console.log('No sizes or colors, returning empty rows');
      return;
    }

    const basePrice = Number(this.form.value.price || 0);
    const price = Number.isFinite(basePrice) ? basePrice : 0;
    const baseOldRaw = this.form.value.oldPrice;
    const baseOld = baseOldRaw != null ? Number(baseOldRaw) : null;
    const oldPrice = baseOld != null && Number.isFinite(baseOld) ? baseOld : null;

    const rowKeys: Array<{ genderKey: string; color: string; size: string }> = [];
    for (const genderKey of genders) {
      for (const color of colors) {
        for (const size of sizes) {
          rowKeys.push({ genderKey, color, size });
        }
      }
    }

    const sortedRowKeys = this.sortVariantRowKeysByCsvOrder(rowKeys);
    this.variantBranchRows = sortedRowKeys.map(({ genderKey, color, size }) => {
      const branchStocks = branchIds.map((bid) => {
        const cell = this.variantBranchCellByKey.get(this.variantCellKey(bid, genderKey, color, size));
        return { branchId: bid, stock: Number(cell?.stock || 0) };
      });
      const total = branchStocks.reduce((sum, x) => sum + Math.max(0, Number(x.stock || 0)), 0);

      let imageUrl = '';
      let weightKg: number | null = null;
      for (const bid of branchIds) {
        const cell = this.variantBranchCellByKey.get(this.variantCellKey(bid, genderKey, color, size));
        if (cell) {
          if (!imageUrl && cell.imageUrl) imageUrl = cell.imageUrl;
          if (weightKg == null && cell.weightKg != null) weightKg = cell.weightKg;
        }
      }

      console.log(`Row weightKg for ${genderKey}-${color}-${size}:`, weightKg, '(loaded from API)');

      return {
        genderKey,
        genderLabel: this.genderLabelByKey(genderKey),
        color,
        size,
        weightKg,
        price,
        oldPrice,
        imageUrl,
        branchStocks,
        total
      };
    });

    this.syncVariantStocksFromMatrix();
  }

  onVariantBranchMatrixChanged(): void {
    const branchIds = Array.from(this.selectedBranchIds || [])
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));

    const nextMap = new Map<string, { stock: number; imageUrl: string; weightKg: number | null }>(this.variantBranchCellByKey);

    for (const row of this.variantBranchRows || []) {
      row.total = (row.branchStocks || []).reduce((sum, x) => sum + Math.max(0, Number(x.stock || 0)), 0);
      for (const bid of branchIds) {
        const cell = (row.branchStocks || []).find((x) => x && x.branchId === bid);
        const key = this.variantCellKey(bid, row.genderKey, row.color, row.size);
        const prev = nextMap.get(key) || { stock: 0, imageUrl: '', weightKg: null };
        nextMap.set(key, {
          stock: Number(cell?.stock || 0),
          imageUrl: row.imageUrl ? String(row.imageUrl) : prev.imageUrl,
          weightKg: row.weightKg !== null ? row.weightKg : prev.weightKg
        });
      }
    }

    this.variantBranchCellByKey = nextMap;
    this.syncVariantStocksFromMatrix();
    this.recalculateTotalStock();
  }

  getVariantBranchCell(row: VariantBranchMatrixRow, branchId: number): { branchId: number; stock: number } {
    const bid = Number(branchId);
    const list = row?.branchStocks || [];
    const found = list.find((x) => x && x.branchId === bid);
    if (found) return found;
    return { branchId: bid, stock: 0 };
  }

  variantBranchStockValue(row: VariantBranchMatrixRow, branchId: number): number {
    const cell = this.getVariantBranchCell(row, branchId);
    const v = Number(cell?.stock ?? 0);
    return Number.isFinite(v) ? v : 0;
  }

  setVariantBranchStockValue(row: VariantBranchMatrixRow, branchId: number, value: unknown): void {
    const bid = Number(branchId);
    if (!Number.isFinite(bid)) return;
    if (!row) return;
    const list = row.branchStocks || (row.branchStocks = []);
    let cell = list.find((x) => x && x.branchId === bid);
    if (!cell) {
      cell = { branchId: bid, stock: 0 };
      list.push(cell);
    }
    const s = Math.max(0, Number(value ?? 0));
    cell.stock = Number.isFinite(s) ? s : 0;
    this.scheduleVariantBranchSync();
  }

  setVariantWeightKg(row: VariantBranchMatrixRow, value: unknown): void {
    if (!row) return;
    const w = value != null ? Number(value) : null;
    row.weightKg = w != null && Number.isFinite(w) ? Math.max(0, w) : null;
    this.scheduleVariantBranchSync();
  }

  importMatrixFile(): void {
    this.matrixFileInput?.nativeElement?.click();
  }

  exportMatrixTemplate(): void {
    if (!this.variantBranchRows || this.variantBranchRows.length === 0) {
      this.showToast('error', 'Chưa có ma trận để export. Hãy tạo biến thể trước.');
      return;
    }

    try {
      const branchIds = Array.from(this.selectedBranchIds || [])
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x));

      // Build header
      const headers = ['Giới tính', 'Màu sắc', 'Size', 'Cân nặng', 'Giá'];
      for (const bid of branchIds) {
        const label = this.branchLabelById(bid);
        headers.push(`SL-${label}`);
      }

      // Build rows
      const rows: string[][] = [];
      for (const r of this.variantBranchRows) {
        const row = [
          r.genderLabel,
          r.color,
          r.size,
          r.weightKg != null ? r.weightKg.toString() : '',
          r.price.toString()
        ];

        for (const bid of branchIds) {
          const stock = this.variantBranchStockValue(r, bid);
          row.push(stock.toString());
        }

        rows.push(row);
      }

      // Convert to CSV with UTF-8 BOM for proper Vietnamese character support
      const csvLines = [
        headers.map((h) => `"${h}"`).join(','),
        ...rows.map((r) => r.map((v) => `"${v}"`).join(','))
      ];
      const csvContent = csvLines.join('\n');
      
      // Add UTF-8 BOM để Excel đọc đúng tiếng Việt
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;

      // Download
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `matrix-template-${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showToast('success', 'Đã export mẫu ma trận thành công');
    } catch (err) {
      console.error('Export error:', err);
      this.showToast('error', 'Lỗi khi export: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  onMatrixFileSelected(ev: Event): void {
    const input = ev?.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      this.importMatrixFromCsv(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      this.importMatrixFromExcel(file);
    } else {
      this.showToast('error', 'Chỉ hỗ trợ file CSV hoặc Excel (.csv, .xlsx, .xls)');
    }

    // Reset input so the same file can be selected again
    input.value = '';
  }

  private importMatrixFromCsv(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string | null;
      if (!content) return;
      this.parseAndApplyMatrixData(content, 'csv');
    };
    reader.readAsText(file);
  }

  private importMatrixFromExcel(file: File): void {
    // Excel import would require a library like xlsx
    // For now, show a message
    this.showToast('error', 'Excel import sắp được hỗ trợ. Hãy dùng CSV tạm thời.');
  }

  private parseAndApplyMatrixData(content: string, format: 'csv' | 'excel'): void {
    try {
      const lines = content.split('\n').map((l) => l.trim()).filter((l) => l);
      if (lines.length < 2) {
        this.showToast('error', 'File CSV phải có header và ít nhất 1 dòng dữ liệu');
        return;
      }

      const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const requiredColumns = ['giới tính', 'màu sắc', 'size', 'cân nặng', 'giá'];
      const hasRequiredColumns = requiredColumns.every((col) =>
        header.some((h) => h.includes(col.substring(0, 2)) || h === col)
      );

      if (!hasRequiredColumns) {
        this.showToast('error', 'CSV phải có các cột: Giới tính, Màu sắc, Size, Cân nặng, Giá (+ cột chi nhánh như SL-CN1, SL-CN2...)');
        return;
      }

      // Parse rows
      const newRows: VariantBranchMatrixRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        const genderLabel = parts[0] || '';
        const color = parts[1] || '';
        const size = parts[2] || '';
        const weightStr = parts[3] || '';
        const priceStr = parts[4] || '';

        const weight = weightStr ? Number(weightStr) : null;
        const price = priceStr ? Number(priceStr.replace(/[^0-9]/g, '')) : Number(this.form.value.price || 0);

        if (!genderLabel || !color || !size) continue;

        const genderKey = this.normalizeKeyPart(genderLabel);
        const branchIds = Array.from(this.selectedBranchIds || [])
          .map((x) => Number(x))
          .filter((x) => Number.isFinite(x));

        const branchStocks = branchIds.map((branchId) => {
          // Try to find stock value for this branch from CSV columns
          const branchColIndex = header.findIndex((h) => h.includes('sl') && h.includes(branchId.toString()));
          const stockValue = branchColIndex >= 0 && branchColIndex < parts.length ? Number(parts[branchColIndex]) || 0 : 0;
          return { branchId, stock: Math.max(0, stockValue) };
        });

        const total = branchStocks.reduce((sum, s) => sum + s.stock, 0);

        newRows.push({
          genderKey,
          genderLabel,
          color,
          size,
          weightKg: weight != null && Number.isFinite(weight) ? weight : null,
          price: Number.isFinite(price) ? price : 0,
          oldPrice: null,
          imageUrl: '',
          branchStocks,
          total
        });
      }

      if (newRows.length === 0) {
        this.showToast('error', 'Không tìm thấy dữ liệu hợp lệ trong file');
        return;
      }

      this.variantBranchRows = newRows;
      this.onVariantBranchMatrixChanged();
      this.showToast('success', `Đã import thành công ${newRows.length} biến thể từ file`);
    } catch (err) {
      console.error('Import error:', err);
      this.showToast('error', 'Lỗi khi xử lý file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  onVariantRowPriceChanged(row: VariantBranchMatrixRow): void {
    const ck = this.normalizeKeyPart(row?.color);
    if (!ck) return;

    const p = Number(row.price || 0);
    const price = Number.isFinite(p) ? p : 0;

    const op = row.oldPrice != null && row.oldPrice !== ('' as any) ? Number(row.oldPrice) : null;
    const oldPrice = op != null && Number.isFinite(op) ? op : null;

    for (const r of this.variantBranchRows || []) {
      if (this.normalizeKeyPart(r.color) !== ck) continue;
      r.price = price;
      r.oldPrice = oldPrice;
    }

    for (const vg of this.variants.controls) {
      const color = (vg.get('color')?.value || '').toString().trim();
      if (!color) continue;
      if (this.normalizeKeyPart(color) !== ck) continue;
      vg.get('price')?.setValue(price, { emitEvent: false });
      vg.get('oldPrice')?.setValue(oldPrice, { emitEvent: false });
    }

    this.syncProductPriceFromVariants();
  }

  private syncProductPriceFromVariants(): void {
    let minPrice: number | null = null;
    let maxOldPrice: number | null = null;

    for (const vg of this.variants.controls) {
      const p = Number(vg.get('price')?.value || 0);
      if (Number.isFinite(p)) {
        if (minPrice == null || p < minPrice) minPrice = p;
      }
      const opRaw = vg.get('oldPrice')?.value;
      const op = opRaw != null && opRaw !== '' ? Number(opRaw) : null;
      if (op != null && Number.isFinite(op)) {
        if (maxOldPrice == null || op > maxOldPrice) maxOldPrice = op;
      }
    }

    if (minPrice == null) minPrice = Number(this.form.value.price || 0);
    this.form.patchValue({
      price: minPrice,
      oldPrice: maxOldPrice
    });
  }

  private syncVariantStocksFromMatrix(): void {
    const byRowKey = new Map<string, number>();
    for (const r of this.variantBranchRows || []) {
      const k = `${this.normalizeKeyPart(r.color)}|${this.normalizeKeyPart(r.size)}`;
      byRowKey.set(k, (byRowKey.get(k) || 0) + Number(r.total || 0));
    }

    for (const vg of this.variants.controls) {
      const color = (vg.get('color')?.value || '').toString().trim();
      if (!color) continue;
      const stocks = vg.get('stocks') as FormArray | null;
      const sizeCtrls = (stocks?.controls || []) as any[];
      for (const sc of sizeCtrls) {
        const size = (sc.get('size')?.value || '').toString().trim();
        if (!size) continue;
        const key = `${this.normalizeKeyPart(color)}|${this.normalizeKeyPart(size)}`;
        const total = byRowKey.get(key);
        if (typeof total === 'number') {
          sc.get('stock')?.setValue(total, { emitEvent: false });
        }
      }
    }
  }

  private loadVariantBranchStocks(productId: number): void {
    const url = `${environment.apiBaseUrl}/api/admin/products/${productId}/variant-branch-stocks`;
    this.http.get<ApiResponse<AdminProductVariantBranchStockResponse[]>>(url).subscribe({
      next: (res) => {
        if (!res?.success) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        const nextMap = new Map<string, { stock: number; imageUrl: string; weightKg: number | null }>();
        for (const x of rows) {
          if (!x || typeof x.branchId !== 'number') continue;
          const color = (x.color || '').toString();
          const size = (x.size || '').toString();
          const key = this.variantCellKey(x.branchId, '', color, size);
          const value: { stock: number; imageUrl: string; weightKg: number | null } = {
            stock: Number(x.stock || 0),
            imageUrl: (x.imageUrl || '').toString().trim(),
            weightKg: x.weightKg != null ? Number(x.weightKg) : null
          };
          nextMap.set(key, value);
        }
        this.variantBranchCellByKey = nextMap;
        this.ensureDefaultSelectedBranches();
        this.ensureBranchStockRows();
        this.ensureVariantBranchRows();
      },
      error: () => {
        // ignore
      }
    });
  }

  matrixImagePreview(url: string): string {
    return this.resolveImageUrl((url || '').toString());
  }

  async onMatrixImageFileSelect(rowIndex: number, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.error = '';
    try {
      const formData = new FormData();
      formData.append('file', file, file.name || 'image.jpg');
      const url = `${environment.apiBaseUrl}/api/admin/uploads`;
      const res = await this.http.post<ApiResponse<{ url: string }>>(url, formData).toPromise();
      const uploaded = res?.data?.url;
      if (!uploaded) {
        this.error = res?.message || 'Upload thất bại.';
        return;
      }
      if (this.variantBranchRows[rowIndex]) {
        this.variantBranchRows[rowIndex].imageUrl = uploaded;
      }
      this.onVariantBranchMatrixChanged();
    } catch (e: any) {
      this.error = e?.error?.message || 'Không upload được ảnh.';
    } finally {
      (event.target as HTMLInputElement).value = '';
    }
  }

  clearMatrixImage(rowIndex: number): void {
    if (!this.variantBranchRows[rowIndex]) return;
    this.variantBranchRows[rowIndex].imageUrl = '';
    this.onVariantBranchMatrixChanged();
  }

  openCategoryModal(): void {
    this.categoryModalOpen = true;
    if (this.expandedCategoryIds.size === 0) {
      (this.categoryTree || []).forEach((x) => {
        if (x?.id != null) this.expandedCategoryIds.add(x.id);
      });
    }
  }

  closeCategoryModal(): void {
    this.categoryModalOpen = false;
  }

  isLeafCategory(cat: CategoryNode): boolean {
    return !Array.isArray(cat?.children) || cat.children.length === 0;
  }

  isExpandedCategory(cat: CategoryNode): boolean {
    if (!cat?.id) return false;
    return this.expandedCategoryIds.has(cat.id);
  }

  toggleExpandCategory(cat: CategoryNode): void {
    if (!cat?.id) return;
    if (this.expandedCategoryIds.has(cat.id)) this.expandedCategoryIds.delete(cat.id);
    else this.expandedCategoryIds.add(cat.id);
  }

  setImageLayout(layout: 'free' | '1-4' | '1-3' | '2-2'): void {
    this.imageLayout = layout;
    this.pendingMainPreview.clear();
    this.ensureImagesForLayout();
  }

  private layoutSlotsCount(): number {
    switch (this.imageLayout) {
      case '1-4':
        return 5;
      case '1-3':
        return 4;
      case '2-2':
        return 4;
      default:
        return Math.max(1, this.images.length || 1);
    }
  }

  private ensureImagesForLayout(): void {
    if (this.imageLayout === 'free') {
      if (this.images.length === 0) this.addImage();
      return;
    }

    const needed = this.layoutSlotsCount();
    while (this.images.length < needed) this.addImage('');
    while (this.images.length > needed) this.images.removeAt(this.images.length - 1);
    if (this.images.length === 0) this.addImage('');
  }

  get isEdit(): boolean {
    return this.id != null && Number.isFinite(this.id);
  }

  private hasValue(v: unknown): boolean {
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return Number.isFinite(v);
    return true;
  }

  private isPositiveNumber(v: unknown): boolean {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }

  get completionSummary(): { done: number; total: number; percent: number } {
    const checks: boolean[] = [];

    checks.push(this.hasValue(this.form.value.name));
    checks.push(this.hasValue(this.form.value.slug));
    checks.push(this.hasValue(this.form.value.brand));
    checks.push(this.form.value.productTypeId != null);
    checks.push((this.selectedCategoryLeafs || []).length > 0);
    checks.push(this.isPositiveNumber(this.form.value.price));

    const imgs = (this.images?.value || []) as unknown[];
    checks.push(imgs.some((x) => this.hasValue(x)));

    // Không bắt buộc nhập tồn kho ở đây vì tồn kho được xử lý theo kho chi nhánh.
    // Nếu có biến thể, phần tồn cũng không bắt buộc trên UI.

    const total = checks.length;
    const done = checks.filter(Boolean).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, percent };
  }

  get completionPercent(): number {
    return this.completionSummary.percent;
  }

  get images(): FormArray {
    return this.form.get('images') as FormArray;
  }

  get sizes(): FormArray {
    return this.form.get('sizes') as FormArray;
  }

  get colors(): FormArray {
    return this.form.get('colors') as FormArray;
  }

  get variants(): FormArray {
    return this.form.get('variants') as FormArray;
  }

  addSize(value = ''): void {
    this.sizes.push(this.fb.control(value));
    this.generateVariantsFromCsv();
  }

  removeSize(index: number): void {
    if (this.sizes.length > 1) {
      this.sizes.removeAt(index);
      this.generateVariantsFromCsv();
    }
  }

  updateSize(index: number, value: string): void {
    const ctrl = this.sizes.at(index);
    if (ctrl) {
      ctrl.setValue(value);
      this.generateVariantsFromCsv();
    }
  }

  addColor(value = ''): void {
    this.colors.push(this.fb.control(value));
    this.generateVariantsFromCsv();
  }

  removeColor(index: number): void {
    if (this.colors.length > 1) {
      this.colors.removeAt(index);
      this.generateVariantsFromCsv();
    }
  }

  updateColor(index: number, value: string): void {
    const ctrl = this.colors.at(index);
    if (ctrl) {
      ctrl.setValue(value);
      this.generateVariantsFromCsv();
    }
  }

  private computeTotalStockForSubmit(): number {
    const bs = this.branchStocks || [];
    if (bs.length > 0) {
      return Math.max(0, bs.reduce((sum, x) => sum + Math.max(0, Number(x?.stock || 0)), 0));
    }

    const fallback = Number(this.form.value.stock || 0);
    return Number.isFinite(fallback) ? Math.max(0, fallback) : 0;
  }

  back(): void {
    this.router.navigateByUrl('/admin/products');
  }

  autoSlug(): void {
    const name = (this.form.value.name || '').toString();
    const slug = this.slugify(name);
    this.form.patchValue({ slug });
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  addImage(value = ''): void {
    this.images.push(this.fb.control(value));
  }

  clearImage(i: number): void {
    if (i < 0 || i >= this.images.length) return;
    this.images.at(i).setValue('');
    this.pendingMainPreview.delete(i);
    if (this.images.length === 0) this.addImage();
  }

  removeImage(i: number): void {
    this.images.removeAt(i);
    if (this.images.length === 0) this.addImage();
  }

  async onFileSelect(index: number, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.error = '';
    try {
      const src = await this.readFileAsDataUrl(file);
      this.pendingMainPreview.set(index, src);
      this.openCrop(src, { type: 'main', index });
    } catch {
      this.error = 'Không đọc được file ảnh.';
    } finally {
      (event.target as HTMLInputElement).value = '';
    }
  }

  setMain(index: number): void {
    if (index <= 0) return;
    const val = this.images.at(index).value;
    const first = this.images.at(0).value;
    this.images.at(0).setValue(val);
    this.images.at(index).setValue(first);

    const p0 = this.pendingMainPreview.get(0);
    const pi = this.pendingMainPreview.get(index);
    if (p0 != null || pi != null) {
      if (pi != null) this.pendingMainPreview.set(0, pi);
      else this.pendingMainPreview.delete(0);

      if (p0 != null) this.pendingMainPreview.set(index, p0);
      else this.pendingMainPreview.delete(index);
    }
  }

  loadCategories(): void {
    const url = `${environment.apiBaseUrl}/api/categories/tree`;
    this.http.get<ApiResponse<CategoryNode[]>>(url).subscribe({
      next: (res) => {
        if (!res?.success) return;
        this.categoryTree = Array.isArray(res.data) ? res.data : [];
        // Defer heavy flattening to avoid blocking UI thread during initial route render.
        setTimeout(() => {
          this.leafCategories = this.flattenLeafCategories(this.categoryTree);
          this.allCategories = this.flattenAllCategories(this.categoryTree);
          this.refreshSelectedCategoryLeafs();
        }, 0);
      },
      error: () => {
        // ignore
      }
    });
  }

  private refreshSelectedCategoryLeafs(): void {
    const list = (this.allCategories && this.allCategories.length > 0) ? this.allCategories : this.leafCategories;
    this.selectedCategoryLeafs = (list || []).filter((x) => this.selectedCategoryIds.has(x.id));
    const firstSlug = this.selectedCategoryLeafs[0]?.slug || this.form.value.category || '';
    if ((this.form.value.category || '') !== firstSlug) {
      this.form.patchValue({ category: firstSlug }, { emitEvent: false });
    }
  }

  private flattenLeafCategories(nodes: CategoryNode[]): CategoryNode[] {
    const out: CategoryNode[] = [];
    const walk = (n: CategoryNode) => {
      const children = Array.isArray(n.children) ? n.children : [];
      if (children.length === 0) {
        out.push(n);
        return;
      }
      children.forEach(walk);
    };
    (nodes || []).forEach(walk);
    return out;
  }

  private flattenAllCategories(nodes: CategoryNode[]): CategoryNode[] {
    const out: CategoryNode[] = [];
    const walk = (n: CategoryNode) => {
      out.push(n);
      const children = Array.isArray(n.children) ? n.children : [];
      children.forEach(walk);
    };
    (nodes || []).forEach(walk);
    return out;
  }

  get filteredLeafCategories(): CategoryNode[] {
    const q = (this.categoryFilter || '').trim().toLowerCase();
    const list = this.leafCategories || [];
    if (!q) return list;
    return list.filter((x) => `${x.name} ${x.slug}`.toLowerCase().includes(q));
  }

  toggleCategory(cat: CategoryNode): void {
    if (!cat?.id) return;
    if (this.selectedCategoryIds.has(cat.id)) {
      this.selectedCategoryIds.delete(cat.id);
    } else {
      this.selectedCategoryIds.add(cat.id);
    }
    this.refreshSelectedCategoryLeafs();
  }

  clearSelectedCategories(): void {
    this.selectedCategoryIds.clear();
    this.selectedCategoryLeafs = [];
    this.form.patchValue({ category: '' });
  }

  private parseCsv(value: unknown): string[] {
    return (value || '')
      .toString()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  generateVariantsFromCsv(): void {
    const sizes = (this.sizes?.controls || [])
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);
    const colors = (this.colors?.controls || [])
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);

    if (this.selectedBranchIds.size === 0) {
      this.error = 'Vui lòng chọn ít nhất 1 kho (chi nhánh) trước khi tạo ma trận.';
      this.setTab('BASIC');
      // Đợi DOM update của tab rồi mới scroll
      setTimeout(() => this.scrollToSection('prod-sec-branches'), 0);
      return;
    }

    if (sizes.length === 0 || colors.length === 0) {
      this.error = 'Vui lòng nhập sizes và colors trước khi tạo biến thể.';
      this.setTab('BASIC');
      setTimeout(() => this.scrollToSection('prod-sec-basic'), 0);
      return;
    }

    const basePrice = Number(this.form.value.price || 0);
    const baseOld = this.form.value.oldPrice != null ? Number(this.form.value.oldPrice) : null;

    this.variants.clear();
    colors.forEach((color) => {
      const stocks = this.fb.array(
        sizes.map((size) =>
          this.fb.group({
            size: [size, [Validators.required]],
            stock: [0, [Validators.required]]
          })
        )
      );

      const images = this.fb.array<string>([]);
      images.push(this.fb.control(''));

      this.variants.push(
        this.fb.group({
          id: [null],
          color: [color, [Validators.required]],
          price: [basePrice, [Validators.required]],
          oldPrice: [baseOld],
          images,
          stocks,
          active: [true]
        })
      );
    });

    // Luôn sync lại rows sau khi generate để tránh state bị overwrite làm UI chỉ hiện header.
    this.recalculateTotalStock();
    this.ensureVariantBranchRows();
    if ((this.variantBranchRows || []).length === 0) {
      this.buildVariantBranchRowsFromCsv(sizes, colors);
    }
    // Một số trường hợp (do tick kho / valueChanges) có thể clear rows ngay sau đó,
    // nên defer một lượt nữa để đảm bảo rows vẫn còn.
    setTimeout(() => {
      if ((this.variantBranchRows || []).length === 0) {
        this.ensureVariantBranchRows();
        if ((this.variantBranchRows || []).length === 0) {
          this.buildVariantBranchRowsFromCsv(sizes, colors);
        }
      }
    }, 0);
  }

  recalculateTotalStock(): void {
    let total = 0;
    for (const vg of this.variants.controls) {
      const stocks = vg.get('stocks') as FormArray | null;
      if (!stocks) continue;
      for (const s of stocks.controls) {
        const v = Number(s.get('stock')?.value || 0);
        total += Number.isFinite(v) ? v : 0;
      }
    }
    this.form.patchValue({ stock: total });
  }

  copyPriceFromFirstVariant(): void {
    const first = this.variants.at(0);
    if (!first) return;
    const price = first.get('price')?.value;
    const oldPrice = first.get('oldPrice')?.value;
    for (let i = 1; i < this.variants.length; i++) {
      const v = this.variants.at(i);
      v.get('price')?.setValue(price);
      v.get('oldPrice')?.setValue(oldPrice);
    }
  }

  variantImages(variantIndex: number): FormArray {
    return this.variants.at(variantIndex).get('images') as FormArray;
  }

  variantStocks(variantIndex: number): FormArray {
    return this.variants.at(variantIndex).get('stocks') as FormArray;
  }

  genderLabelForSize(size: string): string {
    const s = String(size || '').trim();
    if (!s) return 'Unisex';
    const groups = this.selectedSizeGroups || [];
    if (groups.length === 0) return 'Unisex';
    const labels: string[] = [];
    for (const g of groups) {
      const list = this.sizesOfGroup(String(g.key));
      if (list.includes(s)) labels.push(g.label || String(g.key));
    }
    if (labels.length > 0) return labels.join(', ');
    const fallback = groups[0]?.label || groups[0]?.key;
    return (fallback || 'Unisex').toString();
  }

  get selectedGenderLabel(): string {
    const groups = this.selectedSizeGroups || [];
    const labels = groups
      .map((g) => (g?.label || g?.key || '').toString().trim())
      .filter(Boolean);
    if (labels.length === 0) return 'Unisex';
    return labels.join(', ');
  }

  get variantMatrixRows(): Array<{
    stt: number;
    variantIndex: number;
    stockIndex: number;
    gender: string;
    color: string;
    size: string;
  }> {
    const rows: Array<{ stt: number; variantIndex: number; stockIndex: number; gender: string; color: string; size: string }> = [];
    let stt = 1;
    for (let vi = 0; vi < this.variants.length; vi++) {
      const vg = this.variants.at(vi);
      const color = (vg.get('color')?.value || '').toString();
      const stocks = this.variantStocks(vi);
      for (let si = 0; si < stocks.length; si++) {
        const sc = stocks.at(si);
        const size = (sc.get('size')?.value || '').toString();
        rows.push({
          stt,
          variantIndex: vi,
          stockIndex: si,
          gender: this.genderLabelForSize(size),
          color,
          size
        });
        stt++;
      }
    }
    return rows;
  }

  addVariantImage(variantIndex: number, value = ''): void {
    this.variantImages(variantIndex).push(this.fb.control(value));
  }

  removeVariantImage(variantIndex: number, imageIndex: number): void {
    const arr = this.variantImages(variantIndex);
    arr.removeAt(imageIndex);
    if (arr.length === 0) arr.push(this.fb.control(''));
  }

  async onVariantFileSelect(variantIndex: number, imageIndex: number, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.error = '';
    try {
      const src = await this.readFileAsDataUrl(file);
      const key = `${variantIndex}:${imageIndex}`;
      this.pendingVariantPreview.set(key, src);
      this.openCrop(src, { type: 'variant', variantIndex, imageIndex });
    } catch {
      this.error = 'Không đọc được file ảnh.';
    } finally {
      (event.target as HTMLInputElement).value = '';
    }
  }

  mainPreview(index: number): string {
    const raw = this.pendingMainPreview.get(index) || (this.images.at(index)?.value || '').toString();
    return this.resolveImageUrl(raw);
  }

  variantPreview(variantIndex: number, imageIndex: number): string {
    const key = `${variantIndex}:${imageIndex}`;
    const arr = this.variantImages(variantIndex);
    const val = (arr.at(imageIndex)?.value || '').toString();
    const raw = this.pendingVariantPreview.get(key) || val;
    return this.resolveImageUrl(raw);
  }

  openCropMain(index: number): void {
    const src = this.mainPreview(index);
    if (!src) return;
    this.openCrop(src, { type: 'main', index });
  }

  openCropVariant(variantIndex: number, imageIndex: number): void {
    const src = this.variantPreview(variantIndex, imageIndex);
    if (!src) return;
    this.openCrop(src, { type: 'variant', variantIndex, imageIndex });
  }

  openCropMatrix(rowIndex: number): void {
    const ri = Number(rowIndex);
    if (!Number.isFinite(ri) || ri < 0) return;
    const row = (this.variantBranchRows || [])[ri];
    if (!row) return;
    const src = this.matrixImagePreview(row.imageUrl);
    if (!src) return;
    this.openCrop(src, { type: 'matrix', rowIndex: ri });
  }

  private openCrop(
    src: string,
    target:
      | { type: 'main'; index: number }
      | { type: 'variant'; variantIndex: number; imageIndex: number }
      | { type: 'matrix'; rowIndex: number }
  ): void {
    this.cropTarget = target;
    this.cropSrc = this.resolveImageUrl(src);
    this.cropOpen = true;
    this.cropBusy = false;
    this.cropImgLoaded = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.cropImg = img;
      this.cropImgLoaded = true;
      this.tryInitCropAndDraw(0);
    };
    img.onerror = () => {
      this.error = 'Không tải được ảnh để cắt.';
      this.closeCrop(true);
    };
    img.src = this.cropSrc;
  }

  private resolveImageUrl(src: string): string {
    const s = (src || '').toString().trim();
    if (!s) return '';
    if (s.startsWith('data:') || s.startsWith('blob:')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/')) return `${this.apiBaseUrl}${s}`;
    return `${this.apiBaseUrl}/${s}`;
  }

  private tryInitCropAndDraw(attempt: number): void {
    const canvas = this.cropCanvas?.nativeElement;
    if (canvas) {
      this.initCropRect();
      this.drawCrop();
      return;
    }

    if (attempt >= 20) {
      this.error = 'Không thể mở khung cắt ảnh.';
      this.closeCrop(true);
      return;
    }

    setTimeout(() => this.tryInitCropAndDraw(attempt + 1), 0);
  }

  closeCrop(clearPending = false): void {
    if (clearPending && this.cropTarget) {
      if (this.cropTarget.type === 'main') {
        this.pendingMainPreview.delete(this.cropTarget.index);
      } else if (this.cropTarget.type === 'variant') {
        this.pendingVariantPreview.delete(`${this.cropTarget.variantIndex}:${this.cropTarget.imageIndex}`);
      }
    }
    this.cropOpen = false;
    this.cropBusy = false;
    this.cropTarget = null;
    this.cropSrc = '';
  }

  onCropMouseDown(ev: MouseEvent): void {
    if (!this.cropImgLoaded) return;
    const pos = this.getCanvasPos(ev);
    if (!pos) return;

    const { x, y } = pos;
    const inside = this.pointInRect(x, y, this.cropRect);
    this.cropDrag.active = true;
    this.cropDrag.mode = inside ? 'move' : 'new';
    this.cropDrag.startX = x;
    this.cropDrag.startY = y;
    this.cropDrag.baseX = this.cropRect.x;
    this.cropDrag.baseY = this.cropRect.y;
    this.cropDrag.baseW = this.cropRect.w;
    this.cropDrag.baseH = this.cropRect.h;
    this.cropDrag.offsetX = x - this.cropRect.x;
    this.cropDrag.offsetY = y - this.cropRect.y;

    if (this.cropDrag.mode === 'new') {
      this.cropRect = { x, y, w: 0, h: 0 };
      this.clampCropRect();
      this.drawCrop();
    }
  }

  onCropMouseMove(ev: MouseEvent): void {
    if (!this.cropDrag.active) return;
    const pos = this.getCanvasPos(ev);
    if (!pos) return;

    const { x, y } = pos;

    if (this.cropDrag.mode === 'move') {
      const nx = x - this.cropDrag.offsetX;
      const ny = y - this.cropDrag.offsetY;
      this.cropRect = { x: nx, y: ny, w: this.cropDrag.baseW, h: this.cropDrag.baseH };
      this.clampCropRect();
      this.drawCrop();
      return;
    }

    const w = x - this.cropDrag.startX;
    const h = y - this.cropDrag.startY;
    this.cropRect = { x: this.cropDrag.startX, y: this.cropDrag.startY, w, h };
    this.normalizeCropRect();
    this.clampCropRect();
    this.drawCrop();
  }

  onCropMouseUp(_: MouseEvent): void {
    if (!this.cropDrag.active) return;
    this.cropDrag.active = false;
    this.normalizeCropRect();
    this.clampCropRect();
    this.drawCrop();
  }

  async applyCrop(): Promise<void> {
    if (!this.cropTarget) return;
    if (!this.cropImgLoaded) return;
    if (this.cropBusy) return;

    const r = this.getNormalizedRect(this.cropRect);
    if (r.w < 2 || r.h < 2) {
      this.error = 'Vùng cắt không hợp lệ.';
      return;
    }

    this.cropBusy = true;
    this.error = '';

    try {
      const blob = await this.cropToBlob();
      const formData = new FormData();
      formData.append('file', blob, 'crop.jpg');
      const url = `${environment.apiBaseUrl}/api/admin/uploads`;
      const res = await this.http.post<ApiResponse<{ url: string }>>(url, formData).toPromise();
      const uploaded = res?.data?.url;
      if (!uploaded) {
        this.error = res?.message || 'Upload thất bại.';
        this.cropBusy = false;
        return;
      }

      if (this.cropTarget.type === 'main') {
        this.images.at(this.cropTarget.index).setValue(uploaded);
        this.pendingMainPreview.delete(this.cropTarget.index);
      } else if (this.cropTarget.type === 'variant') {
        this.variantImages(this.cropTarget.variantIndex).at(this.cropTarget.imageIndex).setValue(uploaded);
        this.pendingVariantPreview.delete(`${this.cropTarget.variantIndex}:${this.cropTarget.imageIndex}`);
      } else {
        const ri = this.cropTarget.rowIndex;
        if (this.variantBranchRows[ri]) {
          this.variantBranchRows[ri].imageUrl = uploaded;
          this.onVariantBranchMatrixChanged();
        }
      }

      this.closeCrop(false);
    } catch (e: any) {
      this.error = e?.error?.message || 'Không upload được ảnh đã cắt.';
      this.cropBusy = false;
    }
  }

  private async cropToBlob(): Promise<Blob> {
    const canvas = this.cropCanvas?.nativeElement;
    if (!canvas) throw new Error('no canvas');

    const { x, y, w, h } = this.getNormalizedRect(this.cropRect);
    const d = this.cropDisplay;

    const ix = (x - d.x) / d.scale;
    const iy = (y - d.y) / d.scale;
    const iw = w / d.scale;
    const ih = h / d.scale;

    const srcW = this.cropImg.naturalWidth || this.cropImg.width;
    const srcH = this.cropImg.naturalHeight || this.cropImg.height;

    const sx = Math.max(0, Math.min(srcW, ix));
    const sy = Math.max(0, Math.min(srcH, iy));
    const sw = Math.max(1, Math.min(srcW - sx, iw));
    const sh = Math.max(1, Math.min(srcH - sy, ih));

    const maxOut = 1200;
    let outW = Math.floor(sw);
    let outH = Math.floor(sh);
    const ratio = Math.min(maxOut / outW, maxOut / outH, 1);
    outW = Math.max(1, Math.floor(outW * ratio));
    outH = Math.max(1, Math.floor(outH * ratio));

    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('no ctx');
    ctx.drawImage(this.cropImg, sx, sy, sw, sh, 0, 0, outW, outH);

    const blob = await new Promise<Blob>((resolve, reject) => {
      out.toBlob(
        (b) => {
          if (!b) reject(new Error('no blob'));
          else resolve(b);
        },
        'image/jpeg',
        0.92
      );
    });
    return blob;
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read error'));
      reader.readAsDataURL(file);
    });
  }

  private initCropRect(): void {
    const canvas = this.cropCanvas?.nativeElement;
    if (!canvas) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = this.cropImg.naturalWidth || this.cropImg.width;
    const ih = this.cropImg.naturalHeight || this.cropImg.height;
    if (!iw || !ih) return;

    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    this.cropDisplay = { x: dx, y: dy, w: dw, h: dh, scale };

    this.cropRect = { x: dx, y: dy, w: dw, h: dh };
  }

  private drawCrop(): void {
    const canvas = this.cropCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!this.cropImgLoaded) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const iw = this.cropImg.naturalWidth || this.cropImg.width;
    const ih = this.cropImg.naturalHeight || this.cropImg.height;
    if (!iw || !ih) return;

    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    this.cropDisplay = { x: dx, y: dy, w: dw, h: dh, scale };

    ctx.drawImage(this.cropImg, dx, dy, dw, dh);

    const r = this.getNormalizedRect(this.cropRect);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    ctx.restore();
  }

  private getCanvasPos(ev: MouseEvent): { x: number; y: number } | null {
    const canvas = this.cropCanvas?.nativeElement;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  }

  private pointInRect(px: number, py: number, rect: { x: number; y: number; w: number; h: number }): boolean {
    const r = this.getNormalizedRect(rect);
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  private getNormalizedRect(rect: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
    let { x, y, w, h } = rect;
    if (w < 0) {
      x += w;
      w = -w;
    }
    if (h < 0) {
      y += h;
      h = -h;
    }
    return { x, y, w, h };
  }

  private normalizeCropRect(): void {
    const r = this.getNormalizedRect(this.cropRect);
    this.cropRect = r;
  }

  private clampCropRect(): void {
    const d = this.cropDisplay;
    const r = this.getNormalizedRect(this.cropRect);
    const minSize = 20;

    let x = Math.max(d.x, Math.min(d.x + d.w - minSize, r.x));
    let y = Math.max(d.y, Math.min(d.y + d.h - minSize, r.y));
    let w = Math.max(minSize, Math.min(d.x + d.w - x, r.w));
    let h = Math.max(minSize, Math.min(d.y + d.h - y, r.h));

    this.cropRect = { x, y, w, h };
  }

  private loadProduct(id: number): void {
    this.loading = true;
    this.error = '';
    const url = `${environment.apiBaseUrl}/api/products/${id}`;
    this.http.get<ApiResponse<ProductResponse>>(url).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải sản phẩm.';
          return;
        }
        
        // Load branch stocks first before applying product to form
        const stockUrl = `${environment.apiBaseUrl}/api/admin/products/${id}/variant-branch-stocks`;
        this.http.get<ApiResponse<AdminProductVariantBranchStockResponse[]>>(stockUrl).subscribe({
          next: (sRes) => {
            if (sRes?.success && Array.isArray(sRes.data)) {
              const rows = sRes.data;
              const nextMap = new Map<string, { stock: number; imageUrl: string; weightKg: number | null }>();
              const uniqueBranchIds = new Set<number>();
              
              for (const x of rows) {
                if (!x || typeof x.branchId !== 'number') continue;
                uniqueBranchIds.add(x.branchId);
                const color = (x.color || '').toString();
                const size = (x.size || '').toString();
                // Don't set gender key yet - will be set after product data is loaded
                const key = this.variantCellKey(x.branchId, '', color, size);
                const value: { stock: number; imageUrl: string; weightKg: number | null } = {
                  stock: Number(x.stock || 0),
                  imageUrl: (x.imageUrl || '').toString().trim(),
                  weightKg: x.weightKg != null ? Number(x.weightKg) : null
                };
                nextMap.set(key, value);
              }
              
              this.variantBranchCellByKey = nextMap;
              // Pre-select branches that have stock
              uniqueBranchIds.forEach(bid => this.selectedBranchIds.add(bid));
              
              this.applyProductToForm(res.data);
            } else {
              this.applyProductToForm(res.data);
            }
          },
          error: () => {
            this.applyProductToForm(res.data);
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Không thể kết nối backend để tải sản phẩm.';
      }
    });
  }

  private applyProductToForm(p: ProductResponse): void {
    // Convert arrays to FormArray for sizes and colors
    const sizesArray = this.fb.array((Array.isArray(p?.sizes) ? p.sizes : []).map(s => this.fb.control(s)));
    const colorsArray = this.fb.array((Array.isArray(p?.colors) ? p.colors : []).map(c => this.fb.control(c)));
    
    console.log('Product data from API:', p);
    console.log('Category value from API:', p?.category);
    console.log('CategoryIds from API:', p?.categoryIds);

    this.form.patchValue({
      name: p?.name || '',
      slug: p?.slug || '',
      category: p?.category || '',
      productTypeId: p?.productTypeId ?? null,
      brand: p?.brand || 'FashionHub',
      price: Number(p?.price || 0),
      oldPrice: p?.oldPrice != null ? Number(p.oldPrice) : null,
      stock: Number(p?.stock || 0),
      badge: p?.badge || '',
      discountPercent: p?.discountPercent ?? null,
      rating: p?.rating ?? null,
      soldCount: p?.soldCount ?? null,
      sizesCsv: (Array.isArray(p?.sizes) ? p.sizes : []).join(', '),
      colorsCsv: (Array.isArray(p?.colors) ? p.colors : []).join(', '),
      description: p?.description || '',
      active: p?.active !== false
    });
    this.hydrateDescriptionBlocks(p?.description || '');

    console.log('Form category after patch:', this.form.value.category);

    console.log('Product weightKg from API:', p?.weightKg);
    console.log('Form weightKg after patch: (removed from form - now handled in matrix)');

    // Replace sizes and colors FormArray after patchValue
    this.form.setControl('sizes', sizesArray);
    this.form.setControl('colors', colorsArray);

    // Load gender from product
    if (p?.gender) {
      this.selectedSizeGroupKeys.clear();
      const genders = p.gender.split(',').map((g: string) => g.trim()).filter((g: string) => g);
      genders.forEach((g: string) => this.selectedSizeGroupKeys.add(g));
    }

    this.images.clear();
    const imgs = (Array.isArray(p?.images) && p.images.length > 0) ? p.images : (p?.imageUrl ? [p.imageUrl] : []);
    if (imgs.length > 0) {
      imgs.forEach((x) => this.addImage(x));
    }

    this.selectedCategoryIds.clear();
    (p?.categoryIds || []).forEach((x) => {
      if (x != null) this.selectedCategoryIds.add(x);
    });
    this.refreshSelectedCategoryLeafs();

    this.variants.clear();
    if (Array.isArray(p?.variants) && p.variants.length > 0) {
      p.variants.forEach((v) => {
        const stocksArray = this.fb.array(
          (v.stocks || []).map((s) =>
            this.fb.group({
              size: [s.size, [Validators.required]],
              stock: [Number(s.stock || 0), [Validators.required]]
            })
          )
        );

        const imagesArray = this.fb.array<string>([]);
        const vImgs = (v.images || []).filter(Boolean);
        if (vImgs.length === 0) imagesArray.push(this.fb.control(''));
        else vImgs.forEach((x) => imagesArray.push(this.fb.control(x)));

        this.variants.push(
          this.fb.group({
            id: [v.id || null],
            color: [v.color, [Validators.required]],
            price: [Number(v.price || 0), [Validators.required]],
            oldPrice: v.oldPrice != null ? Number(v.oldPrice) : null,
            images: imagesArray,
            stocks: stocksArray,
            active: [v.active !== false]
          })
        );
      });
    }

    this.recalculateTotalStock();
    console.log('=== Before ensureVariantBranchRows ===');
    console.log('SelectedBranchIds:', Array.from(this.selectedBranchIds));
    console.log('SelectedSizeGroupKeys:', Array.from(this.selectedSizeGroupKeys));
    console.log('Sizes:', (this.sizes?.controls || []).map(c => c.value));
    console.log('Colors:', (this.colors?.controls || []).map(c => c.value));
    console.log('VariantBranchCellByKey size:', this.variantBranchCellByKey.size);
    
    // Remap variantBranchCellByKey with correct gender keys after product data is loaded
    this.remapVariantBranchCellsWithGender();
    
    this.ensureVariantBranchRows();
    console.log('=== After ensureVariantBranchRows ===');
    console.log('VariantBranchRows count:', this.variantBranchRows.length);
  }

  submit(): void {
    if (this.saving) return;
    this.error = '';
    this.success = '';
    this.syncDescriptionToForm();

    if (this.form.invalid) {
      this.error = 'Vui lòng điền đầy đủ thông tin bắt buộc (Tên, Slug, Danh mục, Giá).';
      return;
    }

    const val = this.form.value;
    const body: any = {
      name: val.name,
      slug: val.slug,
      brand: val.brand,
      productTypeId: val.productTypeId,
      price: val.price,
      oldPrice: val.oldPrice,
      active: val.active !== false,
      description: val.description,
      stock: val.stock || 0,
      sizes: (this.sizes?.controls || [])
        .map((c) => (c.value || '').toString().trim())
        .filter(Boolean),
      colors: (this.colors?.controls || [])
        .map((c) => (c.value || '').toString().trim())
        .filter(Boolean),
      categoryIds: Array.from(this.selectedCategoryIds),
      images: (val.images || []).filter((img: string | null): img is string => !!img && img.trim() !== ''),
      variants: [] // Tạm thởi để trống hoặc xử lý sau
    };

    const categoryIds = Array.from(this.selectedCategoryIds);

    const productTypeId = this.form.value.productTypeId;
    if (productTypeId == null) {
      this.error = 'Vui lòng chọn loại sản phẩm.';
      return;
    }

    const sizes = (this.sizes?.controls || [])
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);
    const colors = (this.colors?.controls || [])
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);

    const images = this.images.controls
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);

    this.onVariantBranchMatrixChanged();

    // Nếu có ma trận biến thể (matrix), dùng data từ matrix
    // Nếu không, dùng variants từ form
    const hasMatrixVariants = (this.variantBranchRows || []).length > 0;
    
    let variants;
    if (hasMatrixVariants) {
      // Build variants từ matrix rows - group by color
      const variantsByColor = new Map<string, any>();
      
      // Build map existing variants by color to get IDs
      const existingVariantsByColor = new Map<string, any>();
      for (const vg of this.variants.controls) {
        const color = vg.get('color')?.value;
        if (color) {
          existingVariantsByColor.set(String(color).trim(), {
            id: vg.get('id')?.value || null
          });
        }
      }
      
      for (const row of this.variantBranchRows) {
        const colorKey = row.color;
        if (!variantsByColor.has(colorKey)) {
          const existingVariant = existingVariantsByColor.get(colorKey);
          variantsByColor.set(colorKey, {
            id: existingVariant?.id || null,
            color: row.color,
            price: row.price,
            oldPrice: row.oldPrice,
            images: [row.imageUrl].filter(Boolean),
            stocks: [],
            active: true
          });
        }
        const variant = variantsByColor.get(colorKey)!;
        variant.stocks.push({
          size: row.size,
          stock: row.total
        });
      }
      variants = Array.from(variantsByColor.values());
    } else {
      // Dùng variants từ form (cách cũ)
      variants = this.variants.controls.map((vg) => {
        const imgs = ((vg.get('images') as FormArray)?.controls || [])
          .map((c) => (c.value || '').toString().trim())
          .filter(Boolean);
        const stocks = ((vg.get('stocks') as FormArray)?.controls || [])
          .map((c) => ({
            size: (c.get('size')?.value || '').toString(),
            stock: Number(c.get('stock')?.value || 0)
          }));

        return {
          id: vg.get('id')?.value || null,
          color: (vg.get('color')?.value || '').toString(),
          price: Number(vg.get('price')?.value || 0),
          oldPrice: vg.get('oldPrice')?.value != null ? Number(vg.get('oldPrice')?.value) : null,
          images: imgs,
          stocks,
          active: vg.get('active')?.value
        };
      });
    }

    this.recalculateTotalStock();
    const computedStock = this.computeTotalStockForSubmit();

    const payload = {
      sku: null,
      name: this.form.value.name,
      slug: this.form.value.slug,
      description: this.form.value.description,
      productTypeId: productTypeId,
      categoryId: Array.from(this.selectedCategoryIds)[0] || null,
      categoryIds: Array.from(this.selectedCategoryIds),
      category: this.form.value.category,
      brand: this.form.value.brand,
      price: this.form.value.price,
      oldPrice: this.form.value.oldPrice,
      stock: computedStock,
      imageUrl: images[0] || null,
      badge: this.form.value.badge || null,
      discountPercent: this.form.value.discountPercent,
      rating: this.form.value.rating,
      soldCount: this.form.value.soldCount,
      gender: Array.from(this.selectedSizeGroupKeys).join(','),
      sizes: sizes,
      colors: colors,
      variants: variants,
      active: this.form.value.active === false ? false : true
    };

    console.log('===== SUBMIT PAYLOAD =====');
    console.log('Payload:', payload);
    console.log('Gender field:', payload.gender);
    console.log('SelectedSizeGroupKeys:', Array.from(this.selectedSizeGroupKeys));
    console.log('Variants:', variants);
    console.log('Branch stocks rows:', this.variantBranchRows);
    console.log('==========================');

    this.saving = true;

    const upsertBranchStocks = (productId: number) => {
      const url = `${environment.apiBaseUrl}/api/admin/products/${productId}/branch-stocks`;
      const body = (this.branchStocks || []).map((x) => ({
        branchId: x.branchId,
        stock: Math.max(0, Number(x.stock || 0))
      }));
      return this.http.put<ApiResponse<AdminProductBranchStockResponse[]>>(url, body);
    };

    const upsertVariantBranchStocks = (productId: number) => {
      const url = `${environment.apiBaseUrl}/api/admin/products/${productId}/variant-branch-stocks`;
      const body = (this.variantBranchRows || []).flatMap((r) =>
        (r.branchStocks || []).map((x: { branchId: number; stock: number }) => ({
          branchId: x.branchId,
          color: r.color,
          size: r.size,
          stock: Math.max(0, Number(x.stock || 0)),
          imageUrl: (r.imageUrl || '').toString().trim() || null,
          weightKg: r.weightKg != null ? Number(r.weightKg) : null
        }))
      );
      return this.http.put<ApiResponse<AdminProductVariantBranchStockResponse[]>>(url, body);
    };

    const hasVariants = (this.variants.controls || []).length > 0;
    const upsertStocks = (productId: number) => (hasVariants ? upsertVariantBranchStocks(productId) : upsertBranchStocks(productId));

    if (this.isEdit && this.id != null) {
      const url = `${environment.apiBaseUrl}/api/products/${this.id}`;
      this.http.put<ApiResponse<ProductResponse>>(url, payload).subscribe({
        next: (res) => {
          if (!res?.success) {
            this.saving = false;
            this.error = res?.message || 'Cập nhật sản phẩm thất bại.';
            return;
          }
          const pid = res.data?.id;
          if (!pid) {
            this.saving = false;
            this.success = 'Đã cập nhật sản phẩm.';
            return;
          }
          upsertStocks(pid).subscribe({
            next: (r2) => {
              this.saving = false;
              if (!r2?.success) {
                this.error = r2?.message || (hasVariants ? 'Lưu tồn kho theo chi nhánh (size+màu) thất bại.' : 'Lưu tồn kho theo chi nhánh thất bại.');
                return;
              }
              this.success = `Đã cập nhật sản phẩm #${pid} (${res.data?.name}).`;
              this.router.navigate(['/admin/products', pid]);
            },
            error: (err2) => {
              this.saving = false;
              this.error = err2?.error?.message || (hasVariants ? 'Lưu tồn kho theo chi nhánh (size+màu) thất bại.' : 'Lưu tồn kho theo chi nhánh thất bại.');
            }
          });
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Gọi API thất bại.';
        }
      });
      return;
    }

    const url = `${environment.apiBaseUrl}/api/products`;
    this.http.post<ApiResponse<ProductResponse>>(url, payload).subscribe({
      next: (res) => {
        console.log('===== POST RESPONSE =====');
        console.log('Response:', res);
        console.log('Product data saved:', res.data);
        console.log('==========================');
        
        if (!res?.success) {
          this.saving = false;
          this.error = res?.message || 'Tạo sản phẩm thất bại.';
          return;
        }
        const pid = res.data?.id;
        if (!pid) {
          this.saving = false;
          this.error = res?.message || 'Không thể tạo sản phẩm.';
          return;
        }

        const createdName = res.data?.name;
        upsertStocks(pid).subscribe({
          next: (r2) => {
            console.log('===== STOCK UPSERT RESPONSE =====');
            console.log('Variant/Branch stocks response:', r2);
            console.log('==================================');
            
            this.saving = false;
            if (!r2?.success) {
              this.error = r2?.message || (hasVariants ? 'Lưu tồn kho theo chi nhánh (size+màu) thất bại.' : 'Lưu tồn kho theo chi nhánh thất bại.');
              return;
            }
            this.success = `Đã tạo sản phẩm #${pid}${createdName ? ` (${createdName})` : ''}.`;
            this.router.navigateByUrl('/admin/products/new');
          },
          error: (err2) => {
            this.saving = false;
            this.error = err2?.error?.message || (hasVariants ? 'Lưu tồn kho theo chi nhánh (size+màu) thất bại.' : 'Lưu tồn kho theo chi nhánh thất bại.');
          }
        });
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Gọi API thất bại.';
      }
    });
  }
}
