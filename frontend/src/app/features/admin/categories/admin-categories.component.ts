import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { AdminCategoryResponse, AdminDataService } from '../../../core/services/admin-data.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.scss']
})
export class AdminCategoriesComponent {
  iconOptions: Array<{ key: string; label: string }> = [
    { key: '', label: 'Không chọn' },
    { key: 'home', label: 'Trang chủ' },
    { key: 'grid', label: 'Danh mục' },
    { key: 'folder', label: 'Thư mục' },
    { key: 'box', label: 'Hộp/Sản phẩm' },
    { key: 'tag', label: 'Nhãn/Tag' },
    { key: 'sparkle', label: 'Nổi bật' },
    { key: 'gift', label: 'Quà tặng' },
    { key: 'star', label: 'Yêu thích' },
    { key: 'heart', label: 'Trái tim' },
    { key: 'truck', label: 'Vận chuyển' },
    { key: 'phone', label: 'Liên hệ' },
    { key: 'user', label: 'Người dùng' },
    { key: 'settings', label: 'Cài đặt' },
    { key: 'shirt', label: 'Áo' },
    { key: 'pants', label: 'Quần' },
    { key: 'dress', label: 'Váy/Đầm' },
    { key: 'shoe', label: 'Giày' },
    { key: 'bag', label: 'Túi' },
    { key: 'watch', label: 'Đồng hồ' },
    { key: 'hat', label: 'Mũ' },
    { key: 'sale', label: 'Sale' },
    { key: 'new', label: 'Mới' }
  ];

  loading = false;
  error = '';
  viewRows: Array<{ node: AdminCategoryResponse; depth: number; hasChildren: boolean; expanded: boolean; pipes: boolean[]; isLast: boolean }> = [];
  all: AdminCategoryResponse[] = [];
  createOpen = false;
  createLoading = false;
  createMode: 'root' | 'child' = 'root';
  form: { name: string; slug?: string | null; parentId?: number | null; icon?: string | null; description?: string; active: boolean } = {
    name: '',
    slug: '',
    parentId: null,
    icon: '',
    description: '',
    active: true
  };
  createSlugEdited = false;
  createParentLocked = false;
  createParentLabel = '';

  lv2Forms: Array<{ name: string; slug: string; slugEdited: boolean; lv3: Array<{ name: string; slug: string; slugEdited: boolean }> }> = [];

  editLv2Forms: Array<{
    id?: number;
    name: string;
    slug: string;
    slugEdited: boolean;
    deleted?: boolean;
    lv3: Array<{ id?: number; name: string; slug: string; slugEdited: boolean; deleted?: boolean }>;
  }> = [];

  // Edit (Configure) modal state
  editOpen = false;
  editLoading = false;
  editForm: { id?: number; name: string; slug?: string | null; parentId?: number | null; icon?: string | null; description?: string; active: boolean } = {
    id: undefined,
    name: '',
    slug: '',
    parentId: null,
    icon: '',
    description: '',
    active: true
  };
  editSlugEdited = false;

  private byId = new Map<number, AdminCategoryResponse>();
  private depthById = new Map<number, number>();
  private heightById = new Map<number, number>();
  private childrenByParent = new Map<number | null, AdminCategoryResponse[]>();
  private expanded = new Set<number>();

  constructor(private adminData: AdminDataService) {
    this.load();
  }

  private buildRootRows(): Array<{ node: AdminCategoryResponse; depth: number; hasChildren: boolean; expanded: boolean; pipes: boolean[]; isLast: boolean }> {
    const roots = this.all.filter((c) => c.parentId == null);
    return roots.map((n, idx) => ({
      node: n,
      depth: 1,
      hasChildren: this.hasChildren(n.id),
      expanded: false,
      pipes: [],
      isLast: idx === roots.length - 1
    }));
  }

  toggleExpanded(node: AdminCategoryResponse): void {
    if (!this.hasChildren(node.id)) return;
    if (this.expanded.has(node.id)) {
      this.expanded.delete(node.id);
    } else {
      this.expanded.add(node.id);
    }
    this.viewRows = this.buildViewRows();
  }

  isExpanded(id: number): boolean {
    return this.expanded.has(id);
  }

  load(): void {
    this.error = '';
    this.loading = true;
    this.adminData.getCategories().subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể tải danh sách danh mục.';
          return;
        }
        this.all = Array.isArray(res.data) ? res.data : [];
        this.rebuildMeta();
        this.viewRows = this.buildRootRows();
      },
      error: (err: any) => {
        this.loading = false;
        const status = err?.status;
        const suffix = status ? ` (HTTP ${status})` : '';
        this.error = this.extractHttpErrorMessage(err, `Không thể tải danh mục${suffix}.`);
      }
    });
  }

  openCreate(): void {
    this.form = { name: '', slug: '', parentId: null, icon: '', description: '', active: true };
    this.createSlugEdited = false;
    this.createParentLocked = false;
    this.createParentLabel = '';
    this.createMode = 'root';
    this.lv2Forms = [];
    this.createOpen = true;
  }

  openCreateChild(parent: AdminCategoryResponse): void {
    const parentDepth = this.depthById.get(parent.id) ?? 1;
    if (parentDepth >= 3) {
      this.error = 'Không thể tạo danh mục con vượt quá 3 cấp.';
      return;
    }
    this.form = { name: '', slug: '', parentId: parent.id, icon: '', description: '', active: true };
    this.createSlugEdited = false;
    this.createParentLocked = true;
    this.createParentLabel = parent.name;
    this.createMode = 'child';
    this.lv2Forms = [];
    this.createOpen = true;
    this.expanded.add(parent.id);
    this.viewRows = this.buildRootRows();
  }

  cancelCreate(): void {
    this.createOpen = false;
  }

  async submitCreate(): Promise<void> {
    if (!this.form.name?.trim()) {
      this.error = 'Vui lòng nhập tên danh mục.';
      return;
    }
    if (this.createMode === 'root') {
      this.form.parentId = null;
    } else {
      if (!this.isValidParentForMove(null, this.form.parentId ?? null)) {
        this.error = 'Danh mục cha không hợp lệ.';
        return;
      }
    }

    this.createLoading = true;
    this.error = '';
    try {
      const rootRes = await firstValueFrom(
        this.adminData.createCategory({
          name: this.form.name.trim(),
          slug: this.form.slug?.trim() || null,
          parentId: this.form.parentId ?? null,
          icon: (this.form.icon || '').trim() || null,
          description: this.form.description?.trim() || undefined,
          active: !!this.form.active
        })
      );

      if (!rootRes?.success) {
        this.error = rootRes?.message || 'Tạo danh mục thất bại.';
        return;
      }
      const rootId = rootRes.data?.id;
      if (!rootId) {
        this.error = 'Tạo danh mục thất bại.';
        return;
      }

      if (this.createMode === 'root') {
        for (const lv2 of this.lv2Forms) {
          const lv2Name = lv2.name.trim();
          if (!lv2Name) continue;

          const lv2Res = await firstValueFrom(
            this.adminData.createCategory({
              name: lv2Name,
              slug: (lv2.slug || this.slugify(lv2Name)).trim() || null,
              parentId: rootId,
              active: true
            })
          );
          if (!lv2Res?.success) {
            this.error = lv2Res?.message || 'Tạo danh mục cấp 2 thất bại.';
            return;
          }
          const lv2Id = lv2Res.data?.id;
          if (!lv2Id) {
            this.error = 'Tạo danh mục cấp 2 thất bại.';
            return;
          }

          for (const lv3 of lv2.lv3) {
            const lv3Name = lv3.name.trim();
            if (!lv3Name) continue;
            const lv3Res = await firstValueFrom(
              this.adminData.createCategory({
                name: lv3Name,
                slug: (lv3.slug || this.slugify(lv3Name)).trim() || null,
                parentId: lv2Id,
                active: true
              })
            );
            if (!lv3Res?.success) {
              this.error = lv3Res?.message || 'Tạo danh mục cấp 3 thất bại.';
              return;
            }
          }
        }
      }

      this.createOpen = false;
      this.load();
    } catch (e) {
      this.error = this.extractHttpErrorMessage(e, 'Không thể tạo danh mục. Vui lòng thử lại.');
    } finally {
      this.createLoading = false;
    }
  }

  addLv2(): void {
    this.lv2Forms.push({ name: '', slug: '', slugEdited: false, lv3: [] });
  }

  removeLv2(idx: number): void {
    this.lv2Forms.splice(idx, 1);
  }

  onLv2NameChange(idx: number, value: string): void {
    const item = this.lv2Forms[idx];
    if (!item) return;
    item.name = value;
    if (!item.slugEdited) item.slug = this.slugify(value);
  }

  onLv2SlugChange(idx: number, value: string): void {
    const item = this.lv2Forms[idx];
    if (!item) return;
    item.slug = value;
    item.slugEdited = true;
  }

  addLv3(idx: number): void {
    const item = this.lv2Forms[idx];
    if (!item) return;
    item.lv3.push({ name: '', slug: '', slugEdited: false });
  }

  removeLv3(i: number, j: number): void {
    const item = this.lv2Forms[i];
    if (!item) return;
    item.lv3.splice(j, 1);
  }

  onLv3NameChange(i: number, j: number, value: string): void {
    const item = this.lv2Forms[i];
    const c = item?.lv3?.[j];
    if (!c) return;
    c.name = value;
    if (!c.slugEdited) c.slug = this.slugify(value);
  }

  onLv3SlugChange(i: number, j: number, value: string): void {
    const item = this.lv2Forms[i];
    const c = item?.lv3?.[j];
    if (!c) return;
    c.slug = value;
    c.slugEdited = true;
  }

  onEdit(row: AdminCategoryResponse): void {
    this.editForm = {
      id: row.id,
      name: row.name,
      slug: row.slug ?? '',
      parentId: row.parentId ?? null,
      icon: row.icon ?? '',
      description: row.description || '',
      active: row.active !== false
    };
    this.editSlugEdited = false;

    const lv2Nodes = this.childrenByParent.get(row.id) || [];
    this.editLv2Forms = lv2Nodes.map((c) => {
      const lv3Nodes = this.childrenByParent.get(c.id) || [];
      return {
        id: c.id,
        name: c.name,
        slug: c.slug || '',
        slugEdited: false,
        deleted: false,
        lv3: lv3Nodes.map((x) => ({
          id: x.id,
          name: x.name,
          slug: x.slug || '',
          slugEdited: false,
          deleted: false
        }))
      };
    });

    this.editOpen = true;
  }

  cancelEdit(): void {
    this.editOpen = false;
  }

  async submitEdit(): Promise<void> {
    if (!this.editForm.id || !this.editForm.name?.trim()) {
      this.error = 'Vui lòng nhập tên danh mục.';
      return;
    }

    // Cấu hình ở màn danh sách chỉ áp dụng cho danh mục cha (cấp 1)
    this.editForm.parentId = null;

    this.editLoading = true;
    this.error = '';
    try {
      const rootId = this.editForm.id;
      const updRoot = await firstValueFrom(
        this.adminData.updateCategory(rootId, {
          name: this.editForm.name.trim(),
          slug: this.editForm.slug?.trim() || null,
          parentId: null,
          icon: (this.editForm.icon || '').trim() || null,
          description: this.editForm.description?.trim() || undefined,
          active: !!this.editForm.active
        })
      );
      if (!updRoot?.success) {
        this.error = updRoot?.message || 'Cập nhật danh mục thất bại.';
        return;
      }

      // Snapshot existing tree
      const existingLv2 = (this.childrenByParent.get(rootId) || []).map((c) => c.id);
      const keepLv2 = new Set<number>();
      const toDeleteLv2: number[] = [];

      // Handle lv2 create/update
      for (const item of this.editLv2Forms) {
        if (item.deleted) continue;
        const name = item.name.trim();
        if (!name) continue;

        try {
          if (item.id) {
            keepLv2.add(item.id);
            const upd = await firstValueFrom(
              this.adminData.updateCategory(item.id, {
                name,
                slug: (item.slug || this.slugify(name)).trim() || null,
                parentId: rootId,
                active: true
              })
            );
            if (!upd?.success) {
              this.error = upd?.message || `Cập nhật danh mục cấp 2 thất bại: ${name}`;
              return;
            }
          } else {
            const created = await firstValueFrom(
              this.adminData.createCategory({
                name,
                slug: (item.slug || this.slugify(name)).trim() || null,
                parentId: rootId,
                active: true
              })
            );
            if (!created?.success || !created.data?.id) {
              this.error = created?.message || `Tạo danh mục cấp 2 thất bại: ${name}`;
              return;
            }
            item.id = created.data.id;
            keepLv2.add(item.id);
          }
        } catch (e) {
          this.error = this.extractHttpErrorMessage(e, `Lỗi khi lưu danh mục cấp 2: ${name}`);
          return;
        }

        // Handle lv3 for this lv2
        const lv2Id = item.id!;
        const existingLv3 = (this.childrenByParent.get(lv2Id) || []).map((c) => c.id);
        const keepLv3 = new Set<number>();

        for (const c3 of item.lv3) {
          if (c3.deleted) continue;
          const n3 = c3.name.trim();
          if (!n3) continue;
          try {
            if (c3.id) {
              keepLv3.add(c3.id);
              const upd3 = await firstValueFrom(
                this.adminData.updateCategory(c3.id, {
                  name: n3,
                  slug: (c3.slug || this.slugify(n3)).trim() || null,
                  parentId: lv2Id,
                  active: true
                })
              );
              if (!upd3?.success) {
                this.error = upd3?.message || `Cập nhật danh mục cấp 3 thất bại: ${n3}`;
                return;
              }
            } else {
              const created3 = await firstValueFrom(
                this.adminData.createCategory({
                  name: n3,
                  slug: (c3.slug || this.slugify(n3)).trim() || null,
                  parentId: lv2Id,
                  active: true
                })
              );
              if (!created3?.success) {
                this.error = created3?.message || `Tạo danh mục cấp 3 thất bại: ${n3}`;
                return;
              }
              if (created3.data?.id) {
                c3.id = created3.data.id;
                keepLv3.add(c3.id);
              }
            }
          } catch (e) {
            this.error = this.extractHttpErrorMessage(e, `Lỗi khi lưu danh mục cấp 3: ${n3}`);
            return;
          }
        }

        // Delete lv3 removed
        for (const id3 of existingLv3) {
          if (!keepLv3.has(id3)) {
            try {
              const del3 = await firstValueFrom(this.adminData.deleteCategory(id3));
              if (!del3?.success) {
                this.error = del3?.message || 'Không thể xóa danh mục cấp 3.';
                return;
              }
            } catch (e) {
              this.error = this.extractHttpErrorMessage(e, 'Không thể xóa danh mục cấp 3.');
              return;
            }
          }
        }
      }

      for (const id2 of existingLv2) {
        if (!keepLv2.has(id2)) toDeleteLv2.push(id2);
      }

      // Delete removed lv2 (and its lv3 first)
      for (const id2 of toDeleteLv2) {
        const kids3 = (this.childrenByParent.get(id2) || []).map((c) => c.id);
        for (const id3 of kids3) {
          try {
            const del3 = await firstValueFrom(this.adminData.deleteCategory(id3));
            if (!del3?.success) {
              this.error = del3?.message || 'Không thể xóa danh mục cấp 3.';
              return;
            }
          } catch (e) {
            this.error = this.extractHttpErrorMessage(e, 'Không thể xóa danh mục cấp 3.');
            return;
          }
        }
        try {
          const del2 = await firstValueFrom(this.adminData.deleteCategory(id2));
          if (!del2?.success) {
            this.error = del2?.message || 'Không thể xóa danh mục cấp 2.';
            return;
          }
        } catch (e) {
          this.error = this.extractHttpErrorMessage(e, 'Không thể xóa danh mục cấp 2.');
          return;
        }
      }

      this.editOpen = false;
      this.load();
    } catch (e) {
      this.error = this.extractHttpErrorMessage(e, 'Không thể cập nhật danh mục. Vui lòng thử lại.');
    } finally {
      this.editLoading = false;
    }
  }

  private extractHttpErrorMessage(e: any, fallback: string): string {
    const err = e as any;
    const body = err?.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body?.message) return String(body.message);
    if (err?.message) return String(err.message);
    return fallback;
  }

  addEditLv2(): void {
    this.editLv2Forms.push({ name: '', slug: '', slugEdited: false, lv3: [] });
  }

  removeEditLv2(i: number): void {
    const item = this.editLv2Forms[i];
    if (!item) return;
    if (item.id) {
      item.deleted = true;
    } else {
      this.editLv2Forms.splice(i, 1);
    }
  }

  onEditLv2NameChange(i: number, value: string): void {
    const item = this.editLv2Forms[i];
    if (!item) return;
    item.name = value;
    if (!item.slugEdited) item.slug = this.slugify(value);
  }

  onEditLv2SlugChange(i: number, value: string): void {
    const item = this.editLv2Forms[i];
    if (!item) return;
    item.slug = value;
    item.slugEdited = true;
  }

  addEditLv3(i: number): void {
    const item = this.editLv2Forms[i];
    if (!item) return;
    item.lv3.push({ name: '', slug: '', slugEdited: false });
  }

  removeEditLv3(i: number, j: number): void {
    const item = this.editLv2Forms[i];
    const c = item?.lv3?.[j];
    if (!c) return;
    if (c.id) {
      c.deleted = true;
    } else {
      item.lv3.splice(j, 1);
    }
  }

  onEditLv3NameChange(i: number, j: number, value: string): void {
    const item = this.editLv2Forms[i];
    const c = item?.lv3?.[j];
    if (!c) return;
    c.name = value;
    if (!c.slugEdited) c.slug = this.slugify(value);
  }

  onEditLv3SlugChange(i: number, j: number, value: string): void {
    const item = this.editLv2Forms[i];
    const c = item?.lv3?.[j];
    if (!c) return;
    c.slug = value;
    c.slugEdited = true;
  }

  onDelete(row: AdminCategoryResponse): void {
    const ok = confirm(`Xóa danh mục "${row.name}"?`);
    if (!ok) return;
    this.loading = true;
    this.error = '';
    this.adminData.deleteCategory(row.id).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.success) {
          this.error = res?.message || 'Không thể xóa danh mục.';
          return;
        }
        this.load();
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể xóa danh mục do ràng buộc dữ liệu hoặc lỗi hệ thống.';
      }
    });
  }

  getParentOptions(movingId?: number): AdminCategoryResponse[] {
    const moveId = movingId ?? null;
    return this.all.filter((c) => this.isAllowedParentCandidate(moveId, c.id));
  }

  optionLabel(row: AdminCategoryResponse): string {
    const depth = this.depthById.get(row.id) ?? 1;
    const prefix = depth > 1 ? `${'—'.repeat(depth - 1)} ` : '';
    return `${prefix}${row.name}`;
  }

  parentName(parentId?: number | null): string {
    if (parentId == null) return '-';
    return this.byId.get(parentId)?.name || '-';
  }

  onCreateNameChange(value: string): void {
    this.form.name = value;
    if (!this.createSlugEdited) {
      this.form.slug = this.slugify(value);
    }
  }

  onEditNameChange(value: string): void {
    this.editForm.name = value;
    if (!this.editSlugEdited) {
      this.editForm.slug = this.slugify(value);
    }
  }

  displayName(row: AdminCategoryResponse): string {
    const depth = this.depthById.get(row.id) ?? 1;
    return `${'—'.repeat(Math.max(0, depth - 1))}${depth > 1 ? ' ' : ''}${row.name}`;
  }

  hasChildren(id: number): boolean {
    const kids = this.childrenByParent.get(id);
    return Array.isArray(kids) && kids.length > 0;
  }

  lv2Count(rootId: number): number {
    const kids = this.childrenByParent.get(rootId) || [];
    return kids.length;
  }

  lv3Count(rootId: number): number {
    const lv2 = this.childrenByParent.get(rootId) || [];
    let total = 0;
    for (const c2 of lv2) {
      total += (this.childrenByParent.get(c2.id) || []).length;
    }
    return total;
  }

  private rebuildMeta(): void {
    this.byId = new Map<number, AdminCategoryResponse>();
    for (const c of this.all) this.byId.set(c.id, c);

    this.childrenByParent = new Map<number | null, AdminCategoryResponse[]>();
    for (const c of this.all) {
      const pid = (c.parentId ?? null) as number | null;
      const arr = this.childrenByParent.get(pid) || [];
      arr.push(c);
      this.childrenByParent.set(pid, arr);
    }

    for (const [, arr] of this.childrenByParent) {
      arr.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
    }

    this.depthById = new Map<number, number>();
    const depthOf = (id: number, visiting: Set<number>): number => {
      if (this.depthById.has(id)) return this.depthById.get(id)!;
      if (visiting.has(id)) {
        this.depthById.set(id, 1);
        return 1;
      }
      visiting.add(id);
      const node = this.byId.get(id);
      const pid = (node?.parentId ?? null) as number | null;
      const depth = pid == null ? 1 : depthOf(pid, visiting) + 1;
      visiting.delete(id);
      this.depthById.set(id, depth);
      return depth;
    };
    for (const c of this.all) depthOf(c.id, new Set<number>());

    this.heightById = new Map<number, number>();
    const heightOf = (id: number): number => {
      if (this.heightById.has(id)) return this.heightById.get(id)!;
      const kids = this.childrenByParent.get(id) || [];
      let h = 1;
      for (const k of kids) {
        h = Math.max(h, 1 + heightOf(k.id));
      }
      this.heightById.set(id, h);
      return h;
    };
    for (const c of this.all) heightOf(c.id);
  }

  private buildViewRows(): Array<{ node: AdminCategoryResponse; depth: number; hasChildren: boolean; expanded: boolean; pipes: boolean[]; isLast: boolean }> {
    const out: Array<{ node: AdminCategoryResponse; depth: number; hasChildren: boolean; expanded: boolean; pipes: boolean[]; isLast: boolean }> = [];
    const walk = (parentId: number | null, depth: number, pipes: boolean[]) => {
      const kids = this.childrenByParent.get(parentId) || [];
      for (let i = 0; i < kids.length; i++) {
        const k = kids[i];
        const isLast = i === kids.length - 1;
        const hc = this.hasChildren(k.id);
        const ex = this.expanded.has(k.id);
        out.push({ node: k, depth, hasChildren: hc, expanded: ex, pipes, isLast });
        if (hc && ex) {
          walk(k.id, depth + 1, pipes.concat(!isLast));
        }
      }
    };
    walk(null, 1, []);
    return out;
  }

  private ensureDefaultExpanded(): void {
    if (this.expanded.size > 0) return;
    const roots = this.childrenByParent.get(null) || [];
    if (roots.length === 1) {
      this.expanded.add(roots[0].id);
    }
  }

  private collectDescendants(id: number): Set<number> {
    const out = new Set<number>();
    const stack: number[] = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      const kids = this.childrenByParent.get(cur) || [];
      for (const k of kids) {
        if (!out.has(k.id)) {
          out.add(k.id);
          stack.push(k.id);
        }
      }
    }
    return out;
  }

  private isAllowedParentCandidate(movingId: number | null, candidateId: number): boolean {
    const candidateDepth = this.depthById.get(candidateId) ?? 1;
    if (candidateDepth >= 3) return false;
    if (movingId == null) return true;
    if (candidateId === movingId) return false;
    const descendants = this.collectDescendants(movingId);
    if (descendants.has(candidateId)) return false;
    const movingHeight = this.heightById.get(movingId) ?? 1;
    return candidateDepth + movingHeight <= 3;
  }

  private isValidParentForMove(movingId: number | null, parentId: number | null): boolean {
    if (parentId == null) return true;
    return this.isAllowedParentCandidate(movingId, parentId);
  }

  private slugify(input: string): string {
    return String(input || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
