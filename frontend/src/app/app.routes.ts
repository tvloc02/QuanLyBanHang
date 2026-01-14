import { Routes } from '@angular/router';

export const routes: Routes = [
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
  },
  {
    path: 'admin/products',
    loadComponent: () => import('./features/admin/admin-products.component').then((m) => m.AdminProductsComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
