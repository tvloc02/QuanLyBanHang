import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDataService, AdminProductTypeResponse } from '../../../core/services/admin-data.service';
import * as XLSX from 'xlsx-js-style';
import { firstValueFrom } from 'rxjs';

type SizeGroupKey = 'UNISEX' | 'NAM' | 'NU' | string;

type SizeGroup = {
  key: SizeGroupKey;
  label: string;
  builtIn?: boolean;
};

type SizeMatrixRow = {
  size: string;
  heightMin?: number | null;
  heightMax?: number | null;
  weightMin?: number | null;
  weightMax?: number | null;
};

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

  private gendersLabelCache = new Map<string, string>();

  createOpen = false;
  editOpen = false;

  splitSizesByGender = false;

  groups: SizeGroup[] = [
    { key: 'UNISEX', label: 'Unisex', builtIn: true },
    { key: 'NAM', label: 'Nam', builtIn: true },
    { key: 'NU', label: 'Nữ', builtIn: true }
  ];
  groupTab: SizeGroupKey = 'UNISEX';
  groupDraft = '';

  sizes: string[] = [];

  matrixByGroup: Record<string, SizeMatrixRow[]> = {
    UNISEX: [],
    NAM: [],
    NU: []
  };

  rowDraft: SizeMatrixRow = {
    size: '',
    heightMin: null,
    heightMax: null,
    weightMin: null,
    weightMax: null
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

  private productTypesExcelHeaders(): string[] {
    return [
      'Code',
      'Tên',
      'Bật',
      'Sizes',
      'Giới tính',
      'Cân nặng min(kg)',
      'Cân nặng max(kg)',
      'Chiều cao min(cm)',
      'Chiều cao max(cm)'
    ];
  }

  private applyExcelSheetLayout(ws: XLSX.WorkSheet, dataRows: Array<Record<string, any>>): void {
    const headers = this.productTypesExcelHeaders();

    const maxLenByCol = headers.map((h) => String(h || '').length);
    for (const r of dataRows || []) {
      headers.forEach((h, idx) => {
        const v = r?.[h];
        const s = v == null ? '' : String(v);
        maxLenByCol[idx] = Math.max(maxLenByCol[idx], s.length);
      });
    }

    ws['!cols'] = maxLenByCol.map((n, idx) => {
      const h = headers[idx];
      const base = Math.min(Math.max(n + 2, 10), 42);
      const bump = ['Tên', 'Giới tính'].includes(h) ? 6 : 0;
      return { wch: Math.min(base + bump, 55) };
    });

    const lastCol = String.fromCharCode('A'.charCodeAt(0) + headers.length - 1);
    ws['!autofilter'] = { ref: `A1:${lastCol}1` } as any;

    (ws as any)['!sheetViews'] = [{ state: 'frozen', ySplit: 1 }];

    const ref = (ws as any)['!ref'] as string | undefined;
    if (!ref) return;
    const range = XLSX.utils.decode_range(ref);

    const cellBorder: any = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    };

    const headerStyle: any = {
      font: { bold: true, color: { rgb: '0F172A' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'DBEAFE' } },
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
      border: cellBorder
    };

    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = (ws as any)[addr];
        if (!cell) continue;
        const curS = (cell as any).s || {};
        if (R === 0) {
          (cell as any).s = { ...curS, ...headerStyle };
        } else {
          (cell as any).s = {
            ...curS,
            border: cellBorder,
            alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
          };
        }
      }
    }
  }

  downloadProductTypesTemplateExcel(): void {
    const data = [
      {
        Code: 'clothing',
        'Tên': 'Thời trang',
        'Bật': 1,
        Sizes: 'S',
        'Giới tính': 'Nam',
        'Cân nặng min(kg)': 30,
        'Cân nặng max(kg)': 40,
        'Chiều cao min(cm)': 130,
        'Chiều cao max(cm)': 140
      },
      {
        Code: '',
        'Tên': '',
        'Bật': '',
        Sizes: 'M',
        'Giới tính': 'Nam',
        'Cân nặng min(kg)': '',
        'Cân nặng max(kg)': '',
        'Chiều cao min(cm)': '',
        'Chiều cao max(cm)': ''
      },
      {
        Code: '',
        'Tên': '',
        'Bật': '',
        Sizes: 'L',
        'Giới tính': 'Nam',
        'Cân nặng min(kg)': '',
        'Cân nặng max(kg)': '',
        'Chiều cao min(cm)': '',
        'Chiều cao max(cm)': ''
      },
      {
        Code: '',
        'Tên': '',
        'Bật': '',
        Sizes: 'S',
        'Giới tính': 'Nữ',
        'Cân nặng min(kg)': '',
        'Cân nặng max(kg)': '',
        'Chiều cao min(cm)': '',
        'Chiều cao max(cm)': ''
      },
      {
        Code: '',
        'Tên': '',
        'Bật': '',
        Sizes: 'M',
        'Giới tính': 'Nữ',
        'Cân nặng min(kg)': '',
        'Cân nặng max(kg)': '',
        'Chiều cao min(cm)': '',
        'Chiều cao max(cm)': ''
      },
      {
        Code: '',
        'Tên': '',
        'Bật': '',
        Sizes: 'L',
        'Giới tính': 'Nữ',
        'Cân nặng min(kg)': '',
        'Cân nặng max(kg)': '',
        'Chiều cao min(cm)': '',
        'Chiều cao max(cm)': ''
      },
      {
        Code: '',
        'Tên': '',
        'Bật': '',
        Sizes: 'M',
        'Giới tính': 'UniSex',
        'Cân nặng min(kg)': '',
        'Cân nặng max(kg)': '',
        'Chiều cao min(cm)': '',
        'Chiều cao max(cm)': ''
      },
      {
        Code: '',
        'Tên': '',
        'Bật': '',
        Sizes: 'L',
        'Giới tính': 'UniSex',
        'Cân nặng min(kg)': '',
        'Cân nặng max(kg)': '',
        'Chiều cao min(cm)': '',
        'Chiều cao max(cm)': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data, { header: this.productTypesExcelHeaders() });
    this.applyExcelSheetLayout(ws, data);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ProductTypes');
    XLSX.writeFile(wb, 'product-types-template.xlsx');
  }

  exportProductTypesExcel(): void {
    const data: any[] = [];
    for (const r of this.rows || []) {
      const code = String(r?.code || '').trim();
      const name = String(r?.name || '').trim();
      const active = r?.active === false ? 0 : 1;

      const parsed = this.parseSizesPayloadFromFieldsJson((r as any)?.fieldsJson);
      const groupsMap = new Map<string, string>();
      for (const g of parsed.groups || []) groupsMap.set(String(g.key || '').trim(), String(g.label || '').trim());

      const pushRow = (row: any, isFirst: boolean) => {
        data.push({
          Code: isFirst ? code : '',
          Tên: isFirst ? name : '',
          Bật: isFirst ? active : '',
          ...row
        });
      };

      let first = true;
      if (parsed.mode === 'single') {
        for (const s of parsed.sizes || []) {
          pushRow(
            {
              Sizes: s,
              'Giới tính': '',
              'Cân nặng min(kg)': '',
              'Cân nặng max(kg)': '',
              'Chiều cao min(cm)': '',
              'Chiều cao max(cm)': ''
            },
            first
          );
          first = false;
        }
      } else {
        const groups = Array.isArray(parsed.groups) ? parsed.groups : [];
        for (const g of groups) {
          const gk = String(g?.key || '').trim();
          if (!gk) continue;
          const rows = parsed.matrixByGroup?.[gk];
          if (!Array.isArray(rows) || rows.length === 0) continue;

          const glabel = String(g?.label || '').trim() || groupsMap.get(gk) || gk;
          for (const rr of rows) {
            pushRow(
              {
                Sizes: String(rr?.size || '').trim(),
                'Giới tính': glabel,
                'Cân nặng min(kg)': rr?.weightMin ?? '',
                'Cân nặng max(kg)': rr?.weightMax ?? '',
                'Chiều cao min(cm)': rr?.heightMin ?? '',
                'Chiều cao max(cm)': rr?.heightMax ?? ''
              },
              first
            );
            first = false;
          }
        }
      }

      if (first) {
        pushRow(
          {
            Sizes: '',
            'Giới tính': '',
            'Cân nặng min(kg)': '',
            'Cân nặng max(kg)': '',
            'Chiều cao min(cm)': '',
            'Chiều cao max(cm)': ''
          },
          true
        );
      }
    }

    const out =
      data.length
        ? data
        : [
            {
              Code: '',
              Tên: '',
              Bật: 1,
              Sizes: '',
              'Giới tính': '',
              'Cân nặng min(kg)': '',
              'Cân nặng max(kg)': '',
              'Chiều cao min(cm)': '',
              'Chiều cao max(cm)': ''
            }
          ];

    const ws = XLSX.utils.json_to_sheet(out, { header: this.productTypesExcelHeaders() });
    this.applyExcelSheetLayout(ws, out);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ProductTypes');
    XLSX.writeFile(wb, 'product-types.xlsx');
  }

  async importProductTypesExcel(file: File | null | undefined): Promise<void> {
    if (!file) return;
    this.error = '';
    this.saving = true;

    try {
      const data = await file.arrayBuffer();
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
      const kCode = keyOf(first, ['code', 'mã', 'ma', 'producttypecode', 'loai_code']);
      const kName = keyOf(first, ['tên', 'ten', 'name', 'producttypename', 'loai_ten']);
      const kActive = keyOf(first, ['bật', 'bat', 'active', 'enabled', 'trạng thái', 'trang thai', 'status']);
      const kFields = keyOf(first, ['fieldsjson', 'fields', 'fields_json', 'cấu hình', 'cau hinh', 'sizejson', 'sizesjson']);

      const kSize = keyOf(first, ['sizes', 'size', 'kích cỡ', 'kich co', 'kichco', 'kich_co']);
      const kGender = keyOf(first, ['giới tính', 'gioi tinh', 'gender']);
      const kWeightMin = keyOf(first, ['cân nặng min(kg)', 'can nang min(kg)', 'weight min', 'weightmin', 'weight_from', 'can_nang_tu']);
      const kWeightMax = keyOf(first, ['cân nặng max(kg)', 'can nang max(kg)', 'weight max', 'weightmax', 'weight_to', 'can_nang_den']);
      const kHeightMin = keyOf(first, ['chiều cao min(cm)', 'chieu cao min(cm)', 'height min', 'heightmin', 'height_from', 'chieu_cao_tu']);
      const kHeightMax = keyOf(first, ['chiều cao max(cm)', 'chieu cao max(cm)', 'height max', 'heightmax', 'height_to', 'chieu_cao_den']);

      if (!kCode || !kName) {
        this.error = 'File Excel cần có cột Code và Tên.';
        return;
      }

      const parseActive = (raw: any): boolean => {
        if (raw == null || raw === '') return true;
        if (typeof raw === 'boolean') return raw;
        const n = Number(raw);
        if (Number.isFinite(n)) return n !== 0;
        const s = String(raw || '').trim().toLowerCase();
        if (!s) return true;
        if (['0', 'false', 'off', 'tat', 'tắt', 'disable', 'disabled', 'ngung', 'ngừng'].includes(s)) return false;
        if (['1', 'true', 'on', 'bat', 'bật', 'enable', 'enabled'].includes(s)) return true;
        return true;
      };

      const genderKeyOf = (label: any): { key: string; label: string } | null => {
        const s0 = String(label || '').trim();
        if (!s0) return null;
        const s = s0.toLowerCase();
        if (['unisex', 'uni', 'chung', 'all'].includes(s)) return { key: 'UNISEX', label: 'Unisex' };
        if (['nam', 'male', 'man', 'men'].includes(s)) return { key: 'NAM', label: 'Nam' };
        if (['nữ', 'nu', 'female', 'woman', 'women'].includes(s)) return { key: 'NU', label: 'Nữ' };
        const key = this.slugGroupKey(s0);
        return key ? { key, label: s0 } : null;
      };

      const itemsRaw = rows
        .map((r, idx) => ({
          rowIndex: idx + 2,
          code: String(r[kCode] || '').trim(),
          name: String(r[kName] || '').trim(),
          active: kActive ? parseActive(r[kActive]) : true,
          fieldsJson: kFields ? String(r[kFields] || '').trim() : '',
          size: kSize ? String(r[kSize] || '').trim() : '',
          gender: kGender ? String(r[kGender] || '').trim() : '',
          weightMin: this.toNumOrNull(kWeightMin ? r[kWeightMin] : null),
          weightMax: this.toNumOrNull(kWeightMax ? r[kWeightMax] : null),
          heightMin: this.toNumOrNull(kHeightMin ? r[kHeightMin] : null),
          heightMax: this.toNumOrNull(kHeightMax ? r[kHeightMax] : null)
        }))
        .filter((x) => x.code || x.name || x.size || x.fieldsJson);

      const itemsFilled: Array<(typeof itemsRaw)[number]> = [];
      let lastCode = '';
      let lastName = '';
      let lastActive: boolean | null = null;
      for (const it of itemsRaw) {
        const code = it.code || lastCode;
        const name = it.name || lastName;
        const active: boolean = it.code || it.name ? Boolean(it.active) : Boolean(lastActive ?? it.active ?? true);
        if (code) lastCode = code;
        if (name) lastName = name;
        lastActive = active;
        itemsFilled.push({ ...it, code, name, active });
      }

      const groupsByCode = new Map<string, Array<(typeof itemsFilled)[number]>>();
      for (const it of itemsFilled) {
        if (!it.code && !it.name) continue;
        const k = it.code;
        if (!groupsByCode.has(k)) groupsByCode.set(k, []);
        groupsByCode.get(k)!.push(it);
      }

      const items: Array<{ rowIndex: number; code: string; name: string; active: boolean; fieldsJson: string }> = [];
      for (const [code, its] of groupsByCode.entries()) {
        const name = String(its.find((x) => x.name)?.name || '').trim();
        const active = its.find((x) => typeof x.active === 'boolean')?.active ?? true;
        const firstRowIndex = its[0]?.rowIndex ?? 2;

        const rawFieldsJson = String(its.find((x) => x.fieldsJson)?.fieldsJson || '').trim();
        if (rawFieldsJson) {
          items.push({ rowIndex: firstRowIndex, code, name, active, fieldsJson: rawFieldsJson });
          continue;
        }

        const anyGender = its.some((x) => String(x.gender || '').trim());
        if (anyGender) {
          const groupsMap = new Map<string, { key: string; label: string }>();
          const rowsByGroup: Record<string, SizeMatrixRow[]> = {};

          for (const it of its) {
            const size = String(it.size || '').trim();
            if (!size) continue;
            const g = genderKeyOf(it.gender) || { key: 'UNISEX', label: 'Unisex' };
            groupsMap.set(g.key, g);
            if (!rowsByGroup[g.key]) rowsByGroup[g.key] = [];
            rowsByGroup[g.key].push({
              size,
              weightMin: it.weightMin,
              weightMax: it.weightMax,
              heightMin: it.heightMin,
              heightMax: it.heightMax
            });
          }

          const groups = Array.from(groupsMap.values());
          const hasAny = Object.values(rowsByGroup).some((x) => Array.isArray(x) && x.length);
          const fieldsJson = hasAny ? JSON.stringify({ sizeMatrix: { groups, rowsByGroup } }) : '';
          items.push({ rowIndex: firstRowIndex, code, name, active, fieldsJson });
          continue;
        }

        const sizes = its
          .map((x) => String(x.size || '').trim())
          .filter((x) => x);

        const uniq = Array.from(new Set(sizes));
        const fieldsJson = uniq.length ? JSON.stringify({ sizes: uniq }) : '';
        items.push({ rowIndex: firstRowIndex, code, name, active, fieldsJson });
      }

      const errors: string[] = [];
      let okCount = 0;

      for (const it of items) {
        if (!it.code) {
          errors.push(`Dòng ${it.rowIndex}: thiếu Code`);
          continue;
        }
        if (!it.name) {
          errors.push(`Dòng ${it.rowIndex}: thiếu Tên`);
          continue;
        }

        try {
          const res: any = await firstValueFrom(
            this.adminData.createProductType({
              code: it.code,
              name: it.name,
              active: !!it.active,
              fieldsJson: it.fieldsJson || ''
            })
          );
          if (!res?.success) {
            errors.push(`Dòng ${it.rowIndex} (${it.code}): ${res?.message || 'Tạo thất bại'}`);
            continue;
          }
          okCount++;
        } catch (e: any) {
          const msg = e?.error?.message || e?.message;
          errors.push(`Dòng ${it.rowIndex} (${it.code}): ${typeof msg === 'string' && msg.trim() ? msg : 'Không thể tạo loại sản phẩm.'}`);
        }
      }

      await this.load();

      if (errors.length) {
        const head = errors.slice(0, 6).join('\n');
        const more = errors.length > 6 ? `\n... và ${errors.length - 6} lỗi khác` : '';
        this.error = `Import xong: ${okCount}/${items.length} dòng thành công.\n${head}${more}`;
      } else {
        this.error = '';
      }
    } catch {
      this.error = 'File Excel không hợp lệ.';
    } finally {
      this.saving = false;
    }
  }

  gendersLabelOfRow(row: AdminProductTypeResponse): string {
    const id = row?.id != null ? String(row.id) : '0';
    const fj = (row?.fieldsJson || '') as any;
    const key = `${id}|${String(fj || '')}`;

    const cached = this.gendersLabelCache.get(key);
    if (cached != null) return cached;

    const parsed = this.parseSizesPayloadFromFieldsJson(fj);
    if (parsed.mode !== 'gendered') {
      const out = 'Unisex';
      this.gendersLabelCache.set(key, out);
      return out;
    }

    const groups = Array.isArray(parsed.groups) ? parsed.groups : [];
    const labels: string[] = [];
    for (const g of groups) {
      const gk = String(g?.key || '').trim();
      if (!gk) continue;
      const rows = parsed.matrixByGroup?.[gk];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const lb = String(g?.label || '').trim() || gk;
      labels.push(lb);
    }

    const out = labels.length ? labels.join(', ') : 'Unisex';
    this.gendersLabelCache.set(key, out);
    return out;
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
        this.gendersLabelCache.clear();
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
    this.sizes = [];
    this.gendersLabelCache.clear();
    this.groups = [
      { key: 'UNISEX', label: 'Unisex', builtIn: true },
      { key: 'NAM', label: 'Nam', builtIn: true },
      { key: 'NU', label: 'Nữ', builtIn: true }
    ];
    this.groupTab = 'UNISEX';
    this.groupDraft = '';
    this.matrixByGroup = { UNISEX: [], NAM: [], NU: [], SINGLE: [] };
    this.rowDraft = { size: '', heightMin: null, heightMax: null, weightMin: null, weightMax: null };
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

    this.gendersLabelCache.clear();

    const parsed = this.parseSizesPayloadFromFieldsJson(row.fieldsJson);
    this.splitSizesByGender = parsed.mode === 'gendered';
    this.groups = parsed.groups;
    this.groupTab = parsed.groups?.[0]?.key || 'UNISEX';
    this.groupDraft = '';
    this.sizes = parsed.sizes;
    this.matrixByGroup = parsed.matrixByGroup;
    this.rowDraft = { size: '', heightMin: null, heightMax: null, weightMin: null, weightMax: null };
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

  addRow(): void {
    const size = String(this.rowDraft.size || '').trim();
    if (!size) return;

    const targetKey = this.splitSizesByGender ? String(this.groupTab) : 'SINGLE';
    const cur = this.matrixByGroup[targetKey] || [];
    if (cur.some((x) => String(x?.size || '').trim() === size)) {
      this.rowDraft = { ...this.rowDraft, size: '' };
      return;
    }

    const row: SizeMatrixRow = {
      size,
      heightMin: this.toNumOrNull(this.rowDraft.heightMin),
      heightMax: this.toNumOrNull(this.rowDraft.heightMax),
      weightMin: this.toNumOrNull(this.rowDraft.weightMin),
      weightMax: this.toNumOrNull(this.rowDraft.weightMax)
    };

    this.matrixByGroup = {
      ...this.matrixByGroup,
      [targetKey]: [...cur, row]
    };

    this.rowDraft = { size: '', heightMin: null, heightMax: null, weightMin: null, weightMax: null };
  }

  removeRow(i: number): void {
    const targetKey = this.splitSizesByGender ? String(this.groupTab) : 'SINGLE';
    const cur = this.matrixByGroup[targetKey] || [];
    this.matrixByGroup = {
      ...this.matrixByGroup,
      [targetKey]: cur.filter((_, idx) => idx !== i)
    };
  }

  get currentRows(): SizeMatrixRow[] {
    const targetKey = this.splitSizesByGender ? String(this.groupTab) : 'SINGLE';
    return this.matrixByGroup[targetKey] || [];
  }

  updateRow(i: number, patch: Partial<SizeMatrixRow>): void {
    const targetKey = this.splitSizesByGender ? String(this.groupTab) : 'SINGLE';
    const cur = this.matrixByGroup[targetKey] || [];
    const next = cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    this.matrixByGroup = { ...this.matrixByGroup, [targetKey]: next };
  }

  addGroup(): void {
    const label = (this.groupDraft || '').trim();
    if (!label) return;
    const key = this.slugGroupKey(label);
    if (this.groups.some((g) => String(g.key).toUpperCase() === key)) {
      this.groupDraft = '';
      this.groupTab = key;
      return;
    }
    this.groups = [...this.groups, { key, label, builtIn: false }];
    if (!this.matrixByGroup[key]) {
      this.matrixByGroup = { ...this.matrixByGroup, [key]: [] };
    }
    this.groupDraft = '';
    this.groupTab = key;
  }

  removeGroup(key: SizeGroupKey): void {
    const k = String(key);
    const g = this.groups.find((x) => String(x.key) === k);
    if (g?.builtIn) return;
    this.groups = this.groups.filter((x) => String(x.key) !== k);
    const { [k]: _, ...rest } = this.matrixByGroup as any;
    this.matrixByGroup = rest;
    const first = this.groups?.[0]?.key || 'UNISEX';
    this.groupTab = first;
  }

  toggleSplitSizesByGender(next: boolean): void {
    this.splitSizesByGender = !!next;
    if (this.splitSizesByGender) {
      const seed = (this.sizes || []).map((x) => String(x || '').trim()).filter((x) => x);
      const curUni = this.matrixByGroup['UNISEX'] || [];
      const mergedUni = [...curUni, ...seed.map((s) => ({ size: s }))].filter((x) => String((x as any)?.size || '').trim());
      const dedup: SizeMatrixRow[] = [];
      const seen = new Set<string>();
      for (const r of mergedUni) {
        const ss = String((r as any)?.size || '').trim();
        if (!ss || seen.has(ss)) continue;
        seen.add(ss);
        dedup.push({
          size: ss,
          heightMin: (r as any).heightMin ?? null,
          heightMax: (r as any).heightMax ?? null,
          weightMin: (r as any).weightMin ?? null,
          weightMax: (r as any).weightMax ?? null
        });
      }
      this.matrixByGroup = {
        ...this.matrixByGroup,
        UNISEX: dedup,
        NAM: this.matrixByGroup['NAM'] || [],
        NU: this.matrixByGroup['NU'] || []
      };
      this.sizes = [];
      this.groupTab = 'UNISEX';
      return;
    }

    const merged = this.groups
      .map((g) => this.matrixByGroup[String(g.key)] || [])
      .flat()
      .map((r) => String(r?.size || '').trim())
      .filter((x) => x);
    this.sizes = [...new Set(merged)];
    this.groupTab = 'UNISEX';
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
        const kGender = keyOf(first, ['gender', 'Gender', 'gioiTinh', 'giới tính', 'gioi tinh', 'group', 'Group', 'nhom', 'nhóm']);
        const kHMin = keyOf(first, ['heightMin', 'HeightMin', 'chieuCaoMin', 'chiều cao min', 'height min']);
        const kHMax = keyOf(first, ['heightMax', 'HeightMax', 'chieuCaoMax', 'chiều cao max', 'height max']);
        const kWMin = keyOf(first, ['weightMin', 'WeightMin', 'canNangMin', 'cân nặng min', 'weight min']);
        const kWMax = keyOf(first, ['weightMax', 'WeightMax', 'canNangMax', 'cân nặng max', 'weight max']);

        const normalizeGroup = (raw: any): string | null => {
          const s = String(raw || '').trim();
          if (!s) return null;
          const u = s.toUpperCase();
          if (['NAM', 'MALE', 'M'].includes(u) || s.trim().toLowerCase() === 'nam') return 'NAM';
          if (['NU', 'NỮ', 'FEMALE', 'F'].includes(u) || ['nu', 'nữ'].includes(s.trim().toLowerCase())) return 'NU';
          if (['UNISEX', 'ALL', 'U', 'CHUNG'].includes(u) || s.trim().toLowerCase() === 'chung') return 'UNISEX';
          const key = this.slugGroupKey(s);
          return key;
        };

        const addRowTo = (groupKey: string, row: SizeMatrixRow) => {
          const gk = String(groupKey || '').trim() || (this.splitSizesByGender ? String(this.groupTab) : 'SINGLE');
          const v = String(row?.size || '').trim();
          if (!v) return;

          if (this.splitSizesByGender && !this.groups.some((g) => String(g.key) === gk)) {
            this.groups = [...this.groups, { key: gk, label: rowGroupLabel(gk), builtIn: false }];
          }
          if (!this.matrixByGroup[gk]) {
            this.matrixByGroup = { ...this.matrixByGroup, [gk]: [] };
          }

          const cur = this.matrixByGroup[gk] || [];
          if (cur.some((x) => String(x?.size || '').trim() === v)) return;
          this.matrixByGroup = { ...this.matrixByGroup, [gk]: [...cur, { ...row, size: v }] };
        };

        const rowGroupLabel = (key: string) => {
          const found = this.groups.find((g) => String(g.key) === key);
          if (found) return found.label;
          if (key === 'UNISEX') return 'Unisex';
          if (key === 'NAM') return 'Nam';
          if (key === 'NU') return 'Nữ';
          return key;
        };

        if (kSize) {
          for (const r of rows) {
            const size = r[kSize];
            const g = kGender ? normalizeGroup(r[kGender]) : null;
            const groupKey = g || (this.splitSizesByGender ? String(this.groupTab) : 'SINGLE');
            const row: SizeMatrixRow = {
              size: String(size || '').trim(),
              heightMin: kHMin ? this.toNumOrNull(r[kHMin]) : null,
              heightMax: kHMax ? this.toNumOrNull(r[kHMax]) : null,
              weightMin: kWMin ? this.toNumOrNull(r[kWMin]) : null,
              weightMax: kWMax ? this.toNumOrNull(r[kWMax]) : null
            };
            if (this.splitSizesByGender) {
              addRowTo(groupKey, row);
            } else {
              const cur = this.matrixByGroup['SINGLE'] || [];
              if (!cur.some((x) => String(x?.size || '').trim() === row.size)) {
                this.matrixByGroup = { ...this.matrixByGroup, SINGLE: [...cur, row] };
              }
              if (!this.sizes.includes(row.size)) this.sizes = [...this.sizes, row.size];
            }
          }
          return;
        }

        const kUnisex = keyOf(first, ['unisex', 'UNISEX', 'chung', 'Chung']);
        const kNam = keyOf(first, ['nam', 'Nam', 'male', 'Male']);
        const kNu = keyOf(first, ['nu', 'Nữ', 'Nu', 'female', 'Female']);

        if (kUnisex || kNam || kNu) {
          const addSimple = (groupKey: string, rawSize: any) => {
            const size = String(rawSize || '').trim();
            if (!size) return;
            const row: SizeMatrixRow = { size, heightMin: null, heightMax: null, weightMin: null, weightMax: null };
            if (this.splitSizesByGender) {
              addRowTo(groupKey, row);
              return;
            }
            const cur = this.matrixByGroup['SINGLE'] || [];
            if (!cur.some((x) => String(x?.size || '').trim() === size)) {
              this.matrixByGroup = { ...this.matrixByGroup, SINGLE: [...cur, row] };
            }
            if (!this.sizes.includes(size)) this.sizes = [...this.sizes, size];
          };

          for (const r of rows) {
            if (kUnisex) addSimple('UNISEX', r[kUnisex]);
            if (kNam) addSimple('NAM', r[kNam]);
            if (kNu) addSimple('NU', r[kNu]);
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
      { Size: 'S', Group: 'UNISEX', HeightMin: 150, HeightMax: 160, WeightMin: 45, WeightMax: 52 },
      { Size: 'M', Group: 'UNISEX', HeightMin: 160, HeightMax: 170, WeightMin: 52, WeightMax: 60 },
      { Size: 'L', Group: 'NAM', HeightMin: 168, HeightMax: 175, WeightMin: 60, WeightMax: 70 },
      { Size: 'XL', Group: 'NAM', HeightMin: 175, HeightMax: 182, WeightMin: 70, WeightMax: 80 },
      { Size: 'XS', Group: 'NU', HeightMin: 145, HeightMax: 152, WeightMin: 38, WeightMax: 45 },
      { Size: 'S', Group: 'NU', HeightMin: 152, HeightMax: 160, WeightMin: 45, WeightMax: 52 }
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sizes');

    const fileName = 'size-template.xlsx';
    XLSX.writeFile(wb, fileName);
  }

  private parseSizesPayloadFromFieldsJson(raw: any): {
    mode: 'single' | 'gendered';
    sizes: string[];
    groups: SizeGroup[];
    matrixByGroup: Record<string, SizeMatrixRow[]>;
  } {
    const builtInGroups: SizeGroup[] = [
      { key: 'UNISEX', label: 'Unisex', builtIn: true },
      { key: 'NAM', label: 'Nam', builtIn: true },
      { key: 'NU', label: 'Nữ', builtIn: true }
    ];

    const empty = {
      mode: 'single' as const,
      sizes: [] as string[],
      groups: builtInGroups,
      matrixByGroup: { UNISEX: [], NAM: [], NU: [], SINGLE: [] as SizeMatrixRow[] }
    };
    const s = (raw == null ? '' : String(raw)).trim();
    if (!s) return empty;
    try {
      const parsed = JSON.parse(s);

      if (Array.isArray(parsed)) {
        const sizes = parsed
          .filter((x) => typeof x === 'string')
          .map((x) => x.trim())
          .filter((x) => x);
        return { ...empty, mode: 'single', sizes, matrixByGroup: { ...empty.matrixByGroup, SINGLE: sizes.map((x) => ({ size: x })) } };
      }

      const sizes = (parsed as any)?.sizes;
      if (Array.isArray(sizes)) {
        const out = sizes
          .filter((x: any) => typeof x === 'string')
          .map((x: string) => x.trim())
          .filter((x: string) => x);
        return { ...empty, mode: 'single', sizes: out, matrixByGroup: { ...empty.matrixByGroup, SINGLE: out.map((x) => ({ size: x })) } };
      }

      const sm = (parsed as any)?.sizeMatrix;
      if (sm && typeof sm === 'object') {
        const gRaw = (sm as any).groups;
        const rowsByGroup = (sm as any).rowsByGroup;

        const groups: SizeGroup[] = Array.isArray(gRaw)
          ? gRaw
              .filter((x: any) => x && typeof x === 'object')
              .map((x: any) => ({
                key: String(x.key || '').trim() || this.slugGroupKey(String(x.label || '').trim()),
                label: String(x.label || '').trim() || String(x.key || '').trim(),
                builtIn: ['UNISEX', 'NAM', 'NU'].includes(String(x.key || '').trim().toUpperCase())
              }))
              .filter((x: any) => x.key && x.label)
          : [];

        const ensureBuiltIns = () => {
          const map = new Map<string, SizeGroup>();
          for (const g of builtInGroups) map.set(String(g.key), g);
          for (const g of groups) map.set(String(g.key), g);
          return Array.from(map.values());
        };

        const normRow = (r: any): SizeMatrixRow | null => {
          if (!r || typeof r !== 'object') return null;
          const size = String(r.size || '').trim();
          if (!size) return null;
          return {
            size,
            heightMin: this.toNumOrNull(r.heightMin),
            heightMax: this.toNumOrNull(r.heightMax),
            weightMin: this.toNumOrNull(r.weightMin),
            weightMax: this.toNumOrNull(r.weightMax)
          };
        };

        const matrixByGroup: Record<string, SizeMatrixRow[]> = { UNISEX: [], NAM: [], NU: [], SINGLE: [] };
        if (rowsByGroup && typeof rowsByGroup === 'object') {
          for (const k of Object.keys(rowsByGroup)) {
            const arr = rowsByGroup[k];
            if (!Array.isArray(arr)) continue;
            const outRows = arr.map(normRow).filter((x: any) => !!x) as SizeMatrixRow[];
            matrixByGroup[String(k)] = outRows;
          }
        }

        return {
          mode: 'gendered',
          sizes: [],
          groups: ensureBuiltIns(),
          matrixByGroup
        };
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

        const matrixByGroup: Record<string, SizeMatrixRow[]> = {
          UNISEX: sizesByGender.UNISEX.map((x) => ({ size: x })),
          NAM: sizesByGender.NAM.map((x) => ({ size: x })),
          NU: sizesByGender.NU.map((x) => ({ size: x })),
          SINGLE: []
        };

        return { mode: 'gendered', sizes: [], groups: builtInGroups, matrixByGroup };
      }

      return empty;
    } catch {
      return empty;
    }
  }

  private serializeFieldsJson(): string {
    if (this.splitSizesByGender) {
      const normRows = (arr: any[]) =>
        (Array.isArray(arr) ? arr : [])
          .map((r: any) => ({
            size: String(r?.size || '').trim(),
            heightMin: this.toNumOrNull(r?.heightMin),
            heightMax: this.toNumOrNull(r?.heightMax),
            weightMin: this.toNumOrNull(r?.weightMin),
            weightMax: this.toNumOrNull(r?.weightMax)
          }))
          .filter((r: any) => r.size);

      const groups = (this.groups || [])
        .map((g) => ({ key: String(g.key || '').trim(), label: String(g.label || '').trim() }))
        .filter((g) => g.key && g.label);

      const rowsByGroup: Record<string, SizeMatrixRow[]> = {};
      for (const g of groups) {
        rowsByGroup[g.key] = normRows(this.matrixByGroup[g.key] || []);
      }

      const hasAny = Object.values(rowsByGroup).some((x) => Array.isArray(x) && x.length);
      if (!hasAny) return '';
      return JSON.stringify({ sizeMatrix: { groups, rowsByGroup } });
    }

    const payload = (this.sizes || []).map((x) => String(x || '').trim()).filter((x) => x);
    if (!payload.length) return '';
    return JSON.stringify({ sizes: payload });
  }

  private slugGroupKey(label: string): string {
    const s = String(label || '').trim();
    if (!s) return '';
    const noAccent = s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
    const key = noAccent
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);
    return key || s.toUpperCase();
  }

  private toNumOrNull(v: any): number | null {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}
