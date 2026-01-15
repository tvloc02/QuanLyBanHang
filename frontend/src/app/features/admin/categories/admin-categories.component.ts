import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { AdminCategoryResponse, AdminDataService } from '../../../core/services/admin-data.service';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.scss']
})
export class AdminCategoriesComponent {
  loading = false;
  error = '';
  rows: AdminCategoryResponse[] = [];
  createOpen = false;
  createLoading = false;
  form: { name: string; description?: string; active: boolean } = { name: '', description: '', active: true };

  // Edit (Configure) modal state
  editOpen = false;
  editLoading = false;
  editForm: { id?: number; name: string; description?: string; active: boolean } = { id: undefined, name: '', description: '', active: true };

  constructor(private adminData: AdminDataService) {
    this.load();
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
        this.rows = Array.isArray(res.data) ? res.data : [];
      },
      error: () => {
        this.loading = false;
        this.error = 'Không thể kết nối backend để lấy danh mục.';
      }
    });
  }

  openCreate(): void {
    this.form = { name: '', description: '', active: true };
    this.createOpen = true;
  }

  cancelCreate(): void {
    this.createOpen = false;
  }

  submitCreate(): void {
    if (!this.form.name?.trim()) {
      this.error = 'Vui lòng nhập tên danh mục.';
      return;
    }
    this.createLoading = true;
    this.error = '';
    this.adminData.createCategory({
      name: this.form.name.trim(),
      description: this.form.description?.trim() || undefined,
      active: !!this.form.active
    }).subscribe({
      next: (res) => {
        this.createLoading = false;
        if (!res?.success) {
          this.error = res?.message || 'Tạo danh mục thất bại.';
          return;
        }
        this.createOpen = false;
        this.load();
      },
      error: () => {
        this.createLoading = false;
        this.error = 'Không thể tạo danh mục. Vui lòng thử lại.';
      }
    });
  }

  onEdit(row: AdminCategoryResponse): void {
    this.editForm = {
      id: row.id,
      name: row.name,
      description: row.description || '',
      active: row.active !== false
    };
    this.editOpen = true;
  }

  cancelEdit(): void {
    this.editOpen = false;
  }

  submitEdit(): void {
    if (!this.editForm.id || !this.editForm.name?.trim()) {
      this.error = 'Vui lòng nhập tên danh mục.';
      return;
    }
    this.editLoading = true;
    this.error = '';
    this.adminData.updateCategory(this.editForm.id, {
      name: this.editForm.name.trim(),
      description: this.editForm.description?.trim() || undefined,
      active: !!this.editForm.active
    }).subscribe({
      next: (res) => {
        this.editLoading = false;
        if (!res?.success) {
          this.error = res?.message || 'Cập nhật danh mục thất bại.';
          return;
        }
        this.editOpen = false;
        this.load();
      },
      error: () => {
        this.editLoading = false;
        this.error = 'Không thể cập nhật danh mục. Vui lòng thử lại.';
      }
    });
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
}
