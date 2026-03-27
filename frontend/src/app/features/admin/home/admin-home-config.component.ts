import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-home-config',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="admin-home-config p-6">
      <h2 class="text-2xl font-bold mb-6">Cấu Hình Giao Diện</h2>
      
      <!-- Trang Sale -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4">Trang Sale</h3>
        <form [formGroup]="saleForm" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium mb-1">Tiêu đề</label>
            <input type="text" formControlName="title" class="w-full border rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Subtitle</label>
            <input type="text" formControlName="subtitle" class="w-full border rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Button Text</label>
            <input type="text" formControlName="ctaText" class="w-full border rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Button Route</label>
            <input type="text" formControlName="ctaRoute" class="w-full border rounded px-3 py-2">
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1">Banner Image URL</label>
            <input type="text" formControlName="imageUrl" class="w-full border rounded px-3 py-2">
          </div>
        </form>

        <h4 class="font-medium mb-3">Sản phẩm Sale</h4>
        <div formArrayName="products">
          <div *ngFor="let product of saleProductsArray.controls; let i = index" [formGroupName]="i" class="border rounded p-4 mb-4">
            <div class="flex justify-between items-center mb-3">
              <span class="font-medium">Sản phẩm {{ i + 1 }}</span>
              <button type="button" (click)="removeSaleProduct(i)" class="text-red-600 hover:text-red-800">Xóa</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1">Tên</label>
                <input type="text" formControlName="title" class="w-full border rounded px-3 py-2">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Tag</label>
                <input type="text" formControlName="tag" class="w-full border rounded px-3 py-2">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Giá</label>
                <input type="text" formControlName="priceText" class="w-full border rounded px-3 py-2">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Route</label>
                <input type="text" formControlName="route" class="w-full border rounded px-3 py-2">
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium mb-1">Image URL</label>
                <input type="text" formControlName="imageUrl" class="w-full border rounded px-3 py-2">
              </div>
            </div>
          </div>
        </div>
        
        <button type="button" (click)="addSaleProduct()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Thêm sản phẩm Sale
        </button>
      </div>

      <!-- Danh mục lớn -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4">Danh Mục Lớn</h3>
        <div formArrayName="categoryGroups">
          <div *ngFor="let group of categoryGroupsArray.controls; let i = index" [formGroupName]="i" class="border rounded p-4 mb-4">
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-medium">Danh mục {{ i + 1 }}</h4>
              <button type="button" (click)="removeCategoryGroup(i)" class="text-red-600 hover:text-red-800">Xóa</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label class="block text-sm font-medium mb-1">Tên danh mục</label>
                <input type="text" formControlName="label" class="w-full border rounded px-3 py-2">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Route</label>
                <input type="text" formControlName="route" class="w-full border rounded px-3 py-2">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Banner Image URL</label>
                <input type="text" formControlName="imageUrl" class="w-full border rounded px-3 py-2">
              </div>
            </div>
            
            <div formArrayName="items">
              <div *ngFor="let item of getItemsArray(i).controls; let j = index" [formGroupName]="j" class="border-l-2 border-gray-200 pl-4 ml-4 mb-3">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium">Danh mục con {{ j + 1 }}</span>
                  <button type="button" (click)="removeCategoryItem(i, j)" class="text-red-600 hover:text-red-800 text-sm">Xóa</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label class="block text-sm font-medium mb-1">Tên</label>
                    <input type="text" formControlName="label" class="w-full border rounded px-2 py-1 text-sm">
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Route</label>
                    <input type="text" formControlName="route" class="w-full border rounded px-2 py-1 text-sm">
                  </div>
                  <div>
                    <label class="block text-sm font-medium mb-1">Image URL</label>
                    <input type="text" formControlName="imageUrl" class="w-full border rounded px-2 py-1 text-sm">
                  </div>
                </div>
              </div>
            </div>
            
            <button type="button" (click)="addCategoryItem(i)" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
              Thêm danh mục con
            </button>
          </div>
        </div>
        
        <button type="button" (click)="addCategoryGroup()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Thêm danh mục lớn
        </button>
      </div>

      <!-- Trang tin tức -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4">Trang Tin Tức</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Tiêu đề trang tin tức</label>
          <input type="text" formControlName="newsTitle" class="w-full border rounded px-3 py-2">
        </div>
        
        <div formArrayName="newsItems">
          <div *ngFor="let news of newsItemsArray.controls; let i = index" [formGroupName]="i" class="border rounded p-4 mb-4">
            <div class="flex justify-between items-center mb-3">
              <span class="font-medium">Tin tức {{ i + 1 }}</span>
              <button type="button" (click)="removeNewsItem(i)" class="text-red-600 hover:text-red-800">Xóa</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium mb-1">Tiêu đề</label>
                <input type="text" formControlName="title" class="w-full border rounded px-3 py-2">
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Route</label>
                <input type="text" formControlName="route" class="w-full border rounded px-3 py-2">
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium mb-1">Mô tả</label>
                <textarea formControlName="description" class="w-full border rounded px-3 py-2" rows="2"></textarea>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium mb-1">Image URL</label>
                <input type="text" formControlName="imageUrl" class="w-full border rounded px-3 py-2">
              </div>
            </div>
          </div>
        </div>
        
        <button type="button" (click)="addNewsItem()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Thêm tin tức
        </button>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end gap-4">
        <button type="button" (click)="loadConfig()" class="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700">
          Tải lại
        </button>
        <button type="button" (click)="saveConfig()" class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
          Lưu cấu hình
        </button>
      </div>
    </div>
  `,
  styles: [`
    .admin-home-config {
      max-width: 1200px;
      margin: 0 auto;
    }
  `]
})
export class AdminHomeConfigComponent implements OnInit {
  configForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.configForm = this.fb.group({
      salePage: this.fb.group({
        title: [''],
        subtitle: [''],
        ctaText: [''],
        ctaRoute: [''],
        imageUrl: [''],
        products: this.fb.array([])
      }),
      categoryGroups: this.fb.array([]),
      newsPage: this.fb.group({
        title: [''],
        items: this.fb.array([])
      })
    });
  }

  ngOnInit() {
    this.loadConfig();
  }

  get saleForm() { return this.configForm.get('salePage') as FormGroup; }
  get saleProductsArray() { return this.saleForm.get('products') as FormArray; }
  get categoryGroupsArray() { return this.configForm.get('categoryGroups') as FormArray; }
  get newsForm() { return this.configForm.get('newsPage') as FormGroup; }
  get newsItemsArray() { return this.newsForm.get('items') as FormArray; }

  getItemsArray(groupIndex: number) {
    const group = this.categoryGroupsArray.at(groupIndex) as FormGroup;
    return group.get('items') as FormArray;
  }

  // Sale Products
  addSaleProduct() {
    this.saleProductsArray.push(this.fb.group({
      title: [''],
      imageUrl: [''],
      tag: [''],
      priceText: [''],
      route: ['']
    }));
  }

  removeSaleProduct(index: number) {
    this.saleProductsArray.removeAt(index);
  }

  // Category Groups
  addCategoryGroup() {
    this.categoryGroupsArray.push(this.fb.group({
      label: [''],
      imageUrl: [''],
      route: [''],
      items: this.fb.array([])
    }));
  }

  removeCategoryGroup(index: number) {
    this.categoryGroupsArray.removeAt(index);
  }

  addCategoryItem(groupIndex: number) {
    const itemsArray = this.getItemsArray(groupIndex);
    itemsArray.push(this.fb.group({
      label: [''],
      imageUrl: [''],
      route: ['']
    }));
  }

  removeCategoryItem(groupIndex: number, itemIndex: number) {
    const itemsArray = this.getItemsArray(groupIndex);
    itemsArray.removeAt(itemIndex);
  }

  // News Items
  addNewsItem() {
    this.newsItemsArray.push(this.fb.group({
      title: [''],
      description: [''],
      imageUrl: [''],
      route: ['']
    }));
  }

  removeNewsItem(index: number) {
    this.newsItemsArray.removeAt(index);
  }

  loadConfig() {
    this.http.get(`${environment.apiBaseUrl}/api/admin/home-config`).subscribe({
      next: (config: any) => {
        this.configForm.patchValue(config);
      },
      error: () => {
        console.log('Using default config');
        this.addSaleProduct();
        this.addCategoryGroup();
        this.addNewsItem();
      }
    });
  }

  saveConfig() {
    const config = this.configForm.value;
    
    this.http.post(`${environment.apiBaseUrl}/api/admin/home-config`, config).subscribe({
      next: () => {
        alert('Cấu hình đã được lưu thành công!');
      },
      error: () => {
        alert('Lỗi khi lưu cấu hình!');
      }
    });
  }
}
