import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { rolesGuard } from './core/guards/roles.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'sale'
      },
      {
        path: 'order-lookup',
        loadComponent: () => import('./features/order-lookup/order-lookup.component').then((m) => m.OrderLookupComponent)
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
        path: 'wishlist',
        loadComponent: () => import('./features/placeholder/placeholder.component').then((m) => m.PlaceholderComponent)
      },
      {
        path: 'cart',
        loadComponent: () => import('./features/cart/cart.component').then((m) => m.CartComponent)
      },
      {
        path: 'sale',
        loadComponent: () => import('./features/sale/sale.component').then((m) => m.SaleComponent)
      },
      {
        path: 'category/:slug',
        loadComponent: () => import('./features/category/category-detail.component').then((m) => m.CategoryDetailComponent)
      },
      {
        path: 'news',
        loadComponent: () => import('./features/news/news.component').then((m) => m.NewsComponent)
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent)
      },
      {
        path: 'pages/:slug',
        loadComponent: () => import('./features/pages/static-page.component').then((m) => m.StaticPageComponent)
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
        canActivate: [rolesGuard(['ADMIN', 'MANAGER'])],
        children: [
          {
            path: '',
            loadComponent: () => import('./features/admin/products/admin-products-list.component').then((m) => m.AdminProductsListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./features/admin/products/admin-product-form.component').then((m) => m.AdminProductFormComponent)
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./features/admin/products/admin-product-form.component').then((m) => m.AdminProductFormComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./features/admin/products/admin-product-detail.component').then((m) => m.AdminProductDetailComponent)
          }
        ]
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/admin/orders/admin-orders.component').then((m) => m.AdminOrdersComponent)
      },
      {
        path: 'categories',
        canActivate: [rolesGuard(['ADMIN', 'MANAGER'])],
        loadComponent: () => import('./features/admin/categories/admin-categories.component').then((m) => m.AdminCategoriesComponent)
      },
      {
        path: 'coupons',
        canActivate: [rolesGuard(['ADMIN', 'MANAGER'])],
        loadComponent: () => import('./features/admin/coupons/admin-coupons.component').then((m) => m.AdminCouponsComponent)
      },
      {
        path: 'users',
        canActivate: [rolesGuard(['ADMIN'])],
        loadComponent: () => import('./features/admin/users/admin-users.component').then((m) => m.AdminUsersComponent)
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/admin/customers/admin-customers.component').then((m) => m.AdminCustomersComponent)
      },
      {
        path: 'branches',
        canActivate: [rolesGuard(['ADMIN', 'MANAGER'])],
        loadComponent: () => import('./features/admin/branches/admin-branches.component').then((m) => m.AdminBranchesComponent)
      },
      {
        path: 'shipping',
        canActivate: [rolesGuard(['ADMIN', 'MANAGER'])],
        loadComponent: () => import('./features/admin/shipping/admin-shipping.component').then((m) => m.AdminShippingComponent)
      },
      {
        path: 'shipping-settings',
        canActivate: [rolesGuard(['ADMIN', 'MANAGER'])],
        loadComponent: () => import('./features/admin/shipping-settings/admin-shipping-settings.component').then((m) => m.AdminShippingSettingsComponent)
      },
      {
        path: 'sale-page',
        canActivate: [rolesGuard(['ADMIN', 'MANAGER'])],
        loadComponent: () => import('./features/admin/sale-page/admin-sale-page.component').then((m) => m.AdminSalePageComponent)
      },
      {
        path: 'category-config/:id',
        canActivate: [rolesGuard(['ADMIN', 'MANAGER'])],
        loadComponent: () => import('./features/admin/sale-page/admin-sale-page.component').then((m) => m.AdminSalePageComponent)
      },
      {
        path: 'reviews',
        loadComponent: () => import('./features/admin/reviews/admin-reviews.component').then((m) => m.AdminReviewsComponent)
      },
      {
        path: 'profile',
        canActivate: [rolesGuard(['ADMIN', 'MANAGER', 'STAFF'])],
        loadComponent: () => import('./features/admin/profile/admin-profile.component').then((m) => m.AdminProfileComponent)
      },
      {
        path: 'settings',
        canActivate: [rolesGuard(['ADMIN'])],
        children: [
          {
            path: '',
            loadComponent: () => import('./features/admin/settings/admin-settings.component').then((m) => m.AdminSettingsComponent)
          },
          {
            path: 'product-types',
            loadComponent: () => import('./features/admin/settings/admin-product-types-settings.component').then((m) => m.AdminProductTypesSettingsComponent)
          },
          {
            path: 'mail',
            loadComponent: () => import('./features/admin/settings/admin-mail-settings.component').then((m) => m.AdminMailSettingsComponent)
          },
          {
            path: 'notifications',
            loadComponent: () => import('./features/admin/settings/admin-notification-settings.component').then((m) => m.AdminNotificationSettingsComponent)
          },
          {
            path: 'home-sections',
            loadComponent: () => import('./features/admin/settings/admin-home-sections.component').then((m) => m.AdminHomeSectionsComponent)
          }
          ,
          {
            path: 'news-banner',
            loadComponent: () => import('./features/admin/settings/admin-news-banner-settings.component').then((m) => m.AdminNewsBannerSettingsComponent)
          }
        ]
      }
      ,
      {
        path: 'support-chat',
        loadComponent: () => import('./features/admin/support-chat/admin-support-chat.component').then((m) => m.AdminSupportChatComponent)
      },
      {
        path: 'home-config',
        canActivate: [rolesGuard(['ADMIN', 'MANAGER'])],
        loadComponent: () => import('./features/admin/home/admin-home-config.component').then((m) => m.AdminHomeConfigComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
