import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent)
      },
      {
        path: 'checkout',
        loadComponent: () => import('./features/checkout/checkout.component').then((m) => m.CheckoutComponent)
      },
      {
        path: 'product/:slug',
        loadComponent: () => import('./features/product/product-detail.component').then((m) => m.ProductDetailComponent)
      },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent)
      },
      {
        path: 'wishlist',
        loadComponent: () => import('./features/placeholder/placeholder.component').then((m) => m.PlaceholderComponent)
      },
      {
        path: 'cart',
        loadComponent: () => import('./features/cart/cart.component').then((m) => m.CartComponent)
      },
      {
        path: 'category/:slug',
        loadComponent: () => import('./features/category/category-detail.component').then((m) => m.CategoryDetailComponent)
      },
      {
        path: 'news',
        loadComponent: () => import('./features/placeholder/placeholder.component').then((m) => m.PlaceholderComponent)
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./layout/admin-shell/admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/admin/admin-products.component').then((m) => m.AdminProductsComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/admin/orders/admin-orders.component').then((m) => m.AdminOrdersComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/admin/categories/admin-categories.component').then((m) => m.AdminCategoriesComponent)
      },
      {
        path: 'coupons',
        loadComponent: () => import('./features/admin/coupons/admin-coupons.component').then((m) => m.AdminCouponsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/admin-users.component').then((m) => m.AdminUsersComponent)
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/admin/customers/admin-customers.component').then((m) => m.AdminCustomersComponent)
      },
      {
        path: 'reviews',
        loadComponent: () => import('./features/admin/reviews/admin-reviews.component').then((m) => m.AdminReviewsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
