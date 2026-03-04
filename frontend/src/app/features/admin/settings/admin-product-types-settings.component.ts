import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataService, AdminProductTypeResponse } from '../../../core/services/admin-data.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin-product-types-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-product-types-settings.component.html',
  styleUrls: ['./admin-product-types-settings.component.scss']
})
export class AdminProductTypesSettingsComponent {
  loading = false;
  saving = false;
  error = '';

  rows: AdminProductTypeResponse[] = [];

  createOpen = false;
  editOpen = false;

  splitSizesByGender = false;
  genderTab: 'UNISEX' | 'NAM' | 'NU' = 'UNISEX';

  sizes: string[] = [];
  sizeDraft = '';

  sizesByGender: Record<'UNISEX' | 'NAM' | 'NU', string[]> = {
    UNISEX: [],
    NAM: [],
    NU: []
  };

  form: { id?: number; code: string; name: string; active: boolean; fieldsJson: string } = {
    code: '',
    name: '',
    active: true,
    fieldsJson: ''
  };

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.adminData.listProductTypes().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách loại sản phẩm.';
          return;
        }
        this.rows = Array.isArray(res.data) ? res.data : [];
      },
      error: (err: any) => {
        this.loading = false;

        if (err?.status === 0) {
          this.error = 'Không thể kết nối backend để lấy loại sản phẩm. Vui lòng kiểm tra backend đang chạy ở http://localhost:8081.';
          return;
        }

        const msg = err?.error?.message || err?.message;
        if (typeof msg === 'string' && msg.trim()) {
          this.error = msg;
          return;
        }

        this.error = `Không thể tải loại sản phẩm (HTTP ${err?.status ?? 'unknown'}).`;
      }
    });
  }

  openCreate(): void {
    this.form = { code: '', name: '', active: true, fieldsJson: '' };
    this.splitSizesByGender = false;
    this.genderTab = 'UNISEX';
    this.sizes = [];
    this.sizesByGender = { UNISEX: [], NAM: [], NU: [] };
    this.sizeDraft = '';
    this.createOpen = true;
  }

  cancelCreate(): void {
    this.createOpen = false;
  }

  submitCreate(): void {
    const code = (this.form.code || '').trim();
    const name = (this.form.name || '').trim();
    if (!code) {
      this.error = 'Vui lòng nhập code.';
      return;
    }
    if (!name) {
      this.error = 'Vui lòng nhập tên loại sản phẩm.';
      return;
    }

    this.saving = true;
    this.error = '';

    const fieldsJson = this.serializeFieldsJson();
    this.adminData
      .createProductType({
        code,
        name,
        active: !!this.form.active,
        fieldsJson
      })
      .subscribe({
        next: (res: any) => {
          this.saving = false;
          if (!res?.success) {
            this.error = res?.message || 'Tạo loại sản phẩm thất bại.';
            return;
          }
          this.createOpen = false;
          this.load();
        },
        error: () => {
          this.saving = false;
          this.error = 'Không thể tạo loại sản phẩm.';
        }
      });
  }

  openEdit(row: AdminProductTypeResponse): void {
    this.form = {
      id: row.id,
      code: row.code || '',
      name: row.name || '',
      active: row.active !== false,
      fieldsJson: (row.fieldsJson || '') as any
    };

    const parsed = this.parseSizesPayloadFromFieldsJson(row.fieldsJson);
    this.splitSizesByGender = parsed.mode === 'gendered';
    this.genderTab = 'UNISEX';
    this.sizes = parsed.sizes;
    this.sizesByGender = parsed.sizesByGender;
    this.sizeDraft = '';
    this.editOpen = true;
  }

  cancelEdit(): void {
    this.editOpen = false;
  }

  submitEdit(): void {
    if (!this.form.id) return;
    const code = (this.form.code || '').trim();
    const name = (this.form.name || '').trim();
    if (!code) {
      this.error = 'Vui lòng nhập code.';
      return;
    }
    if (!name) {
      this.error = 'Vui lòng nhập tên loại sản phẩm.';
      return;
    }

    this.saving = true;
    this.error = '';

    const fieldsJson = this.serializeFieldsJson();
    this.adminData
      .updateProductType(this.form.id, {
        code,
        name,
        active: !!this.form.active,
        fieldsJson
      })
      .subscribe({
        next: (res: any) => {
          this.saving = false;
          if (!res?.success) {
            this.error = res?.message || 'Cập nhật loại sản phẩm thất bại.';
            return;
          }
          this.editOpen = false;
          this.load();
        },
        error: () => {
          this.saving = false;
          this.error = 'Không thể cập nhật loại sản phẩm.';
        }
      });
  }

  onDelete(row: AdminProductTypeResponse): void {
    if (!row?.id) return;
    const ok = confirm(`Xóa loại sản phẩm "${row.name || row.code}"?`);
    if (!ok) return;

    this.saving = true;
    this.error = '';
    this.adminData.deleteProductType(row.id).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (!res?.success) {
          this.error = res?.message || 'Xóa loại sản phẩm thất bại.';
          return;
        }
        this.load();
      },
      error: () => {
        this.saving = false;
        this.error = 'Không thể xóa loại sản phẩm.';
      }
    });
  }

  addSize(): void {
    const v = (this.sizeDraft || '').trim();
    if (!v) return;
    if (this.splitSizesByGender) {
      const target = this.genderTab;
      const cur = this.sizesByGender[target] || [];
      if (cur.includes(v)) {
        this.sizeDraft = '';
        return;
      }
      this.sizesByGender = {
        ...this.sizesByGender,
        [target]: [...cur, v]
      };
    } else {
      if (this.sizes.includes(v)) {
        this.sizeDraft = '';
        return;
      }
      this.sizes = [...this.sizes, v];
    }
    this.sizeDraft = '';
  }

  removeSize(i: number): void {
    if (this.splitSizesByGender) {
      const target = this.genderTab;
      const cur = this.sizesByGender[target] || [];
      this.sizesByGender = {
        ...this.sizesByGender,
        [target]: cur.filter((_, idx) => idx !== i)
      };
      return;
    }
    this.sizes = this.sizes.filter((_, idx) => idx !== i);
  }

  get currentSizes(): string[] {
    if (this.splitSizesByGender) {
      return this.sizesByGender[this.genderTab] || [];
    }
    return this.sizes || [];
  }

  toggleSplitSizesByGender(next: boolean): void {
    this.splitSizesByGender = !!next;
    if (this.splitSizesByGender) {
      const seed = (this.sizes || []).map((x) => String(x || '').trim()).filter((x) => x);
      this.sizesByGender = {
        UNISEX: [...new Set([...(this.sizesByGender.UNISEX || []), ...seed])],
        NAM: this.sizesByGender.NAM || [],
        NU: this.sizesByGender.NU || []
      };
      this.sizes = [];
      this.genderTab = 'UNISEX';
      return;
    }

    const merged = [...(this.sizesByGender.UNISEX || []), ...(this.sizesByGender.NAM || []), ...(this.sizesByGender.NU || [])]
      .map((x) => String(x || '').trim())
      .filter((x) => x);
    this.sizes = [...new Set(merged)];
    this.sizesByGender = { UNISEX: [], NAM: [], NU: [] };
    this.genderTab = 'UNISEX';
  }

  onImportExcel(file: File | null | undefined): void {
    if (!file) return;
    this.error = '';

    const reader = new FileReader();
    reader.onerror = () => {
      this.error = 'Không thể đọc file Excel.';
    };
    reader.onload = () => {
      try {
        const data = reader.result as ArrayBuffer;
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames?.[0];
        if (!sheetName) {
          this.error = 'File Excel không có sheet.';
          return;
        }
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        if (!rows.length) return;

        const keyOf = (obj: Record<string, any>, names: string[]): string | null => {
          const keys = Object.keys(obj || {});
          for (const n of names) {
            const found = keys.find((k) => k.trim().toLowerCase() === n.trim().toLowerCase());
            if (found) return found;
          }
          return null;
        };

        const first = rows[0];
        const kSize = keyOf(first, ['size', 'Size', 'kichCo', 'kích cỡ', 'kich co', 'kích cỡ (size)']);
        const kGender = keyOf(first, ['gender', 'Gender', 'gioiTinh', 'giới tính', 'gioi tinh']);

        const normalizeGender = (raw: any): 'UNISEX' | 'NAM' | 'NU' | null => {
          const s = String(raw || '').trim().toLowerCase();
          if (!s) return null;
          if (['nam', 'male', 'm'].includes(s)) return 'NAM';
          if (['nu', 'nữ', 'female', 'f'].includes(s)) return 'NU';
          if (['unisex', 'all', 'u', 'chung'].includes(s)) return 'UNISEX';
          return null;
        };

        const addTo = (gender: 'UNISEX' | 'NAM' | 'NU', size: string) => {
          const v = String(size || '').trim();
          if (!v) return;
          if (this.splitSizesByGender) {
            const cur = this.sizesByGender[gender] || [];
            if (cur.includes(v)) return;
            this.sizesByGender = { ...this.sizesByGender, [gender]: [...cur, v] };
            return;
          }
          if (this.sizes.includes(v)) return;
          this.sizes = [...this.sizes, v];
        };

        if (kSize) {
          for (const r of rows) {
            const size = r[kSize];
            const g = kGender ? normalizeGender(r[kGender]) : null;
            const gender = g || (this.splitSizesByGender ? this.genderTab : 'UNISEX');
            addTo(gender, size);
          }
          return;
        }

        const kUnisex = keyOf(first, ['unisex', 'UNISEX', 'chung', 'Chung']);
        const kNam = keyOf(first, ['nam', 'Nam', 'male', 'Male']);
        const kNu = keyOf(first, ['nu', 'Nữ', 'Nu', 'female', 'Female']);

        if (kUnisex || kNam || kNu) {
          for (const r of rows) {
            if (kUnisex) addTo('UNISEX', r[kUnisex]);
            if (kNam) addTo('NAM', r[kNam]);
            if (kNu) addTo('NU', r[kNu]);
          }
          return;
        }

        this.error = 'Không nhận diện được cột size trong Excel. Cần cột "Size" hoặc cột Nam/Nữ/Unisex.';
      } catch {
        this.error = 'File Excel không hợp lệ.';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  downloadSizeTemplate(): void {
    const ws = XLSX.utils.json_to_sheet([
      { Size: 'S', Gender: 'UNISEX' },
      { Size: 'M', Gender: 'UNISEX' },
      { Size: 'L', Gender: 'NAM' },
      { Size: 'XL', Gender: 'NAM' },
      { Size: 'XS', Gender: 'NU' },
      { Size: 'S', Gender: 'NU' }
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sizes');

    const fileName = 'size-template.xlsx';
    XLSX.writeFile(wb, fileName);
  }

  private parseSizesPayloadFromFieldsJson(raw: any): {
    mode: 'single' | 'gendered';
    sizes: string[];
    sizesByGender: Record<'UNISEX' | 'NAM' | 'NU', string[]>;
  } {
    const empty = { mode: 'single' as const, sizes: [], sizesByGender: { UNISEX: [], NAM: [], NU: [] } };
    const s = (raw == null ? '' : String(raw)).trim();
    if (!s) return empty;
    try {
      const parsed = JSON.parse(s);

      if (Array.isArray(parsed)) {
        const sizes = parsed
          .filter((x) => typeof x === 'string')
          .map((x) => x.trim())
          .filter((x) => x);
        return { mode: 'single', sizes, sizesByGender: { UNISEX: [], NAM: [], NU: [] } };
      }

      const sizes = (parsed as any)?.sizes;
      if (Array.isArray(sizes)) {
        const out = sizes
          .filter((x: any) => typeof x === 'string')
          .map((x: string) => x.trim())
          .filter((x: string) => x);
        return { mode: 'single', sizes: out, sizesByGender: { UNISEX: [], NAM: [], NU: [] } };
      }

      const sbg = (parsed as any)?.sizesByGender;
      if (sbg && typeof sbg === 'object') {
        const norm = (v: any) =>
          (Array.isArray(v) ? v : [])
            .filter((x: any) => typeof x === 'string')
            .map((x: string) => x.trim())
            .filter((x: string) => x);

        const sizesByGender = {
          UNISEX: norm((sbg as any).UNISEX ?? (sbg as any).unisex),
          NAM: norm((sbg as any).NAM ?? (sbg as any).nam ?? (sbg as any).male),
          NU: norm((sbg as any).NU ?? (sbg as any).nu ?? (sbg as any).female)
        };

        return { mode: 'gendered', sizes: [], sizesByGender };
      }

      return empty;
    } catch {
      return empty;
    }
  }

  private serializeFieldsJson(): string {
    if (this.splitSizesByGender) {
      const norm = (arr: any[]) => (arr || []).map((x) => String(x || '').trim()).filter((x) => x);
      const sizesByGender = {
        UNISEX: norm(this.sizesByGender.UNISEX || []),
        NAM: norm(this.sizesByGender.NAM || []),
        NU: norm(this.sizesByGender.NU || [])
      };
      const hasAny = sizesByGender.UNISEX.length || sizesByGender.NAM.length || sizesByGender.NU.length;
      if (!hasAny) return '';
      return JSON.stringify({ sizesByGender });
    }

    const payload = (this.sizes || []).map((x) => String(x || '').trim()).filter((x) => x);
    if (!payload.length) return '';
    return JSON.stringify({ sizes: payload });
  }
}
