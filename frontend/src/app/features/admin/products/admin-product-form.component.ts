import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

interface ProductResponse {
  id: number;
  sku?: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  oldPrice?: number;
  stock: number;
  categoryId?: number;
  categoryIds?: number[];
  category: string;
  brand: string;
  imageUrl?: string;
  images?: string[];
  variants?: ProductVariantResponse[];
  badge?: string;
  discountPercent?: number;
  rating?: number;
  soldCount?: number;
  sizes?: string[];
  colors?: string[];
  active?: boolean;
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
  error = '';
  success = '';

  private readonly apiBaseUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  imageLayout: 'free' | '1-4' | '1-3' | '2-2' = 'free';

  categoryTree: CategoryNode[] = [];
  leafCategories: CategoryNode[] = [];
  categoryFilter = '';
  selectedCategoryIds = new Set<number>();
  selectedCategoryLeafs: CategoryNode[] = [];

  categoryModalOpen = false;
  expandedCategoryIds = new Set<number>();

  private id: number | null = null;

  form = this.fb.group({
    name: ['', [Validators.required]],
    slug: ['', [Validators.required]],
    category: ['', [Validators.required]],
    brand: ['FashionHub', [Validators.required]],
    price: [199000, [Validators.required]],
    oldPrice: [null as number | null],
    stock: [0, [Validators.required]],
    images: this.fb.array<string>([]),
    badge: [''],
    discountPercent: [null as number | null],
    rating: [null as number | null],
    soldCount: [null as number | null],
    sizesCsv: ['S,M,L'],
    colorsCsv: ['Đen,Trắng'],
    variants: this.fb.array([]),
    description: [''],
    active: [true]
  });

  private pendingMainPreview = new Map<number, string>();
  private pendingVariantPreview = new Map<string, string>();

  cropOpen = false;
  cropBusy = false;
  private cropTarget: { type: 'main'; index: number } | { type: 'variant'; variantIndex: number; imageIndex: number } | null = null;
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

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.loadCategories();

    const rawId = this.route.snapshot.paramMap.get('id');
    this.id = rawId ? Number(rawId) : null;
    if (this.id && Number.isFinite(this.id)) {
      this.loadProduct(this.id);
    } else {
      this.images.clear();
      this.addImage();
    }
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

  get images(): FormArray {
    return this.form.get('images') as FormArray;
  }

  get variants(): FormArray {
    return this.form.get('variants') as FormArray;
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
        this.leafCategories = this.flattenLeafCategories(this.categoryTree);
        this.refreshSelectedCategoryLeafs();
      },
      error: () => {
        // ignore
      }
    });
  }

  private refreshSelectedCategoryLeafs(): void {
    this.selectedCategoryLeafs = (this.leafCategories || []).filter((x) => this.selectedCategoryIds.has(x.id));
    const firstSlug = this.selectedCategoryLeafs[0]?.slug || this.form.value.category || '';
    this.form.patchValue({ category: firstSlug });
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
    const sizes = this.parseCsv(this.form.value.sizesCsv);
    const colors = this.parseCsv(this.form.value.colorsCsv);

    if (sizes.length === 0 || colors.length === 0) {
      this.error = 'Vui lòng nhập sizes và colors trước khi tạo biến thể.';
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
          color: [color, [Validators.required]],
          price: [basePrice, [Validators.required]],
          oldPrice: [baseOld],
          images,
          stocks,
          active: [true]
        })
      );
    });

    this.recalculateTotalStock();
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

  private openCrop(src: string, target: { type: 'main'; index: number } | { type: 'variant'; variantIndex: number; imageIndex: number }): void {
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
      } else {
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
      } else {
        this.variantImages(this.cropTarget.variantIndex).at(this.cropTarget.imageIndex).setValue(uploaded);
        this.pendingVariantPreview.delete(`${this.cropTarget.variantIndex}:${this.cropTarget.imageIndex}`);
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
        this.applyProductToForm(res.data);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Không thể kết nối backend để tải sản phẩm.';
      }
    });
  }

  private applyProductToForm(p: ProductResponse): void {
    this.form.patchValue({
      name: p?.name || '',
      slug: p?.slug || '',
      category: p?.category || '',
      brand: p?.brand || 'FashionHub',
      price: Number(p?.price || 0),
      oldPrice: p?.oldPrice != null ? Number(p.oldPrice) : null,
      stock: Number(p?.stock || 0),
      badge: p?.badge || '',
      discountPercent: (p as any)?.discountPercent ?? null,
      rating: (p as any)?.rating ?? null,
      soldCount: (p as any)?.soldCount ?? null,
      sizesCsv: Array.isArray(p?.sizes) ? p.sizes.join(',') : 'S,M,L',
      colorsCsv: Array.isArray(p?.colors) ? p.colors.join(',') : 'Đen,Trắng',
      description: p?.description || '',
      active: p?.active !== false
    });

    this.images.clear();
    const imgs = (Array.isArray(p?.images) && p.images.length > 0) ? p.images : (p?.imageUrl ? [p.imageUrl] : []);
    if (imgs.length === 0) {
      this.addImage();
    } else {
      imgs.forEach((x) => this.addImage(x));
    }

    this.imageLayout = 'free';
    this.pendingMainPreview.clear();

    this.selectedCategoryIds.clear();
    (p?.categoryIds || []).forEach((x) => {
      if (x != null) this.selectedCategoryIds.add(x);
    });
    this.refreshSelectedCategoryLeafs();

    this.variants.clear();
    if (Array.isArray(p?.variants) && p.variants.length > 0) {
      p.variants.forEach((v) => {
        const stocks = this.fb.array(
          (v.stocks || []).map((s) =>
            this.fb.group({
              size: [s.size, [Validators.required]],
              stock: [s.stock, [Validators.required]]
            })
          )
        );

        const images = this.fb.array<string>([]);
        const vImgs = (v.images || []).filter(Boolean);
        if (vImgs.length === 0) images.push(this.fb.control(''));
        else vImgs.forEach((x) => images.push(this.fb.control(x)));

        this.variants.push(
          this.fb.group({
            color: [v.color, [Validators.required]],
            price: [Number(v.price || 0), [Validators.required]],
            oldPrice: [v.oldPrice != null ? Number(v.oldPrice) : null],
            images,
            stocks,
            active: [v.active !== false]
          })
        );
      });
    }

    this.recalculateTotalStock();
  }

  submit(): void {
    this.error = '';
    this.success = '';

    if (this.form.invalid) {
      this.error = 'Vui lòng nhập đủ các trường bắt buộc.';
      return;
    }

    const categoryIds = Array.from(this.selectedCategoryIds);
    if (categoryIds.length === 0) {
      this.error = 'Vui lòng chọn ít nhất 1 danh mục cấp 3.';
      return;
    }

    const sizes = this.parseCsv(this.form.value.sizesCsv);
    const colors = this.parseCsv(this.form.value.colorsCsv);

    const images = this.images.controls
      .map((c) => (c.value || '').toString().trim())
      .filter(Boolean);

    const variants = this.variants.controls.map((vg) => {
      const imgs = ((vg.get('images') as FormArray)?.controls || [])
        .map((c) => (c.value || '').toString().trim())
        .filter(Boolean);
      const stocks = ((vg.get('stocks') as FormArray)?.controls || [])
        .map((c) => ({
          size: (c.get('size')?.value || '').toString(),
          stock: Number(c.get('stock')?.value || 0)
        }));

      return {
        color: (vg.get('color')?.value || '').toString(),
        price: Number(vg.get('price')?.value || 0),
        oldPrice: vg.get('oldPrice')?.value != null ? Number(vg.get('oldPrice')?.value) : null,
        images: imgs,
        stocks,
        active: vg.get('active')?.value
      };
    });

    this.recalculateTotalStock();

    const payload = {
      sku: null,
      name: this.form.value.name,
      slug: this.form.value.slug,
      category: this.form.value.category,
      categoryIds,
      brand: this.form.value.brand,
      price: this.form.value.price,
      oldPrice: this.form.value.oldPrice,
      stock: this.form.value.stock,
      imageUrl: images[0] || null,
      badge: this.form.value.badge || null,
      discountPercent: this.form.value.discountPercent,
      rating: this.form.value.rating,
      soldCount: this.form.value.soldCount,
      sizes,
      colors,
      images,
      variants,
      description: this.form.value.description || null,
      active: this.form.value.active
    };

    this.saving = true;

    if (this.isEdit && this.id != null) {
      const url = `${environment.apiBaseUrl}/api/products/${this.id}`;
      this.http.put<ApiResponse<ProductResponse>>(url, payload).subscribe({
        next: (res) => {
          this.saving = false;
          if (!res?.success) {
            this.error = res?.message || 'Cập nhật sản phẩm thất bại.';
            return;
          }
          this.success = `Đã cập nhật sản phẩm #${res.data?.id} (${res.data?.name}).`;
          this.router.navigate(['/admin/products', res.data.id]);
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
        this.saving = false;
        if (!res?.success) {
          this.error = res?.message || 'Tạo sản phẩm thất bại.';
          return;
        }
        this.success = `Đã tạo sản phẩm #${res.data?.id} (${res.data?.name}).`;
        this.router.navigate(['/admin/products', res.data.id]);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Gọi API thất bại.';
      }
    });
  }
}
