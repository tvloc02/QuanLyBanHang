export type HomeSectionId =
  | 'hero'
  | 'vouchers'
  | 'quick-categories'
  | 'featured'
  | 'hot'
  | 'exclusive'
  | 'news'
  | 'footer';

export interface HomeNavItem {
  label: string;
  sectionId?: HomeSectionId;
  route?: string;
}

export interface HomeThemeConfig {
  primary: string;
  accent: string;
  bg: string;
  text: string;
  muted: string;
  border: string;
}

export interface HomeHeroConfig {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaRoute: string;
  imageUrl: string;
}

export interface HomeVoucherConfig {
  title: string;
  code: string;
  note: string;
  buttonText: string;
}

export interface HomeCategory {
  label: string;
  imageUrl: string;
  route: string;
}

export interface HomeCategoryGroup {
  label: string;
  items: HomeCategory[];
}

export interface HomeCardProduct {
  title: string;
  imageUrl: string;
  tag?: string;
  priceText?: string;
  route: string;
}

export interface HomeViewAllConfig {
  text: string;
  route: string;
}

export interface HomeNewsItem {
  title: string;
  description: string;
  imageUrl: string;
  route: string;
}

export interface HomeConfig {
  theme: HomeThemeConfig;
  topBarText: string;
  brandText: string;
  nav: HomeNavItem[];
  hero: HomeHeroConfig;
  vouchersTitle: string;
  vouchers: HomeVoucherConfig[];
  circleTitle: string;
  quickTiles?: HomeCategory[];
  circleCategories?: HomeCategory[];
  categoryGroups: HomeCategoryGroup[];
  featuredTitle: string;
  featuredProducts: HomeCardProduct[];
  featuredViewAll: HomeViewAllConfig;
  hotTitle: string;
  hotProducts: HomeCardProduct[];
  hotViewAll: HomeViewAllConfig;
  exclusiveTitle: string;
  exclusiveProducts: HomeCardProduct[];
  exclusiveViewAll: HomeViewAllConfig;
  newsTitle: string;
  news: HomeNewsItem[];
  footerQuoteTitle: string;
  footerQuote: string;
}

export const HOME_CONFIG: HomeConfig = {
  theme: {
    primary: '#c1121f',
    accent: '#0ea5e9',
    bg: '#ffffff',
    text: '#111827',
    muted: '#6b7280',
    border: '#e5e7eb'
  },
  topBarText: 'NĂM MỚI DEAL HỜI TỚI 50%  <<  SĂN NGAY  >>',
  brandText: 'FASHIONHUB',
  nav: [
    { label: 'Sale', sectionId: 'hero' },
    { label: 'Voucher', sectionId: 'vouchers' },
    { label: 'Danh mục', sectionId: 'quick-categories' },
    { label: 'Yêu thích', sectionId: 'featured' },
    { label: 'Hot', sectionId: 'hot' },
    { label: 'Độc quyền', sectionId: 'exclusive' },
    { label: 'Tin tức', sectionId: 'news', route: '/news' }
  ],
  hero: {
    title: 'ĐÓN TẾT SỚM',
    subtitle: 'SALE UP TO 50% - Voucher đến 200K | Freeship',
    ctaText: 'MUA NGAY',
    ctaRoute: '/sale',
    imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1400&q=80'
  },
  vouchersTitle: 'VOUCHER ĐỘC QUYỀN ONLINE',
  vouchers: [
    { title: 'Giảm đến 300K', code: 'NEWYA26', note: 'Cho đơn hàng từ 399.000đ', buttonText: 'Sao chép mã' },
    { title: 'Giảm đến 100K', code: 'YAERA26', note: 'Cho đơn hàng từ 699.000đ', buttonText: 'Sao chép mã' },
    { title: 'Giảm ngay 126K', code: 'HAPPY2026', note: 'Cho đơn hàng từ 999.000đ', buttonText: 'Sao chép mã' }
  ],
  circleTitle: 'HÔM NAY MUA GÌ?',
  quickTiles: [
    {
      label: 'Áo khoác phao & lông vũ',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
      route: '/category/ao-khoac-phao-long-vu'
    },
    {
      label: 'Áo khoác lông cừu',
      imageUrl: 'https://images.unsplash.com/photo-1520974735194-6b4b8b1f2d0e?auto=format&fit=crop&w=600&q=80',
      route: '/category/ao-khoac-long-cuu'
    },
    {
      label: 'Áo khoác gió',
      imageUrl: 'https://images.unsplash.com/photo-1516822003754-cca485356ecb?auto=format&fit=crop&w=600&q=80',
      route: '/category/ao-khoac-gio'
    },
    {
      label: 'Áo khoác chống nắng',
      imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
      route: '/category/ao-khoac-chong-nang'
    },
    {
      label: 'Áo giữ nhiệt',
      imageUrl: 'https://images.unsplash.com/photo-1520974735194-6b4b8b1f2d0e?auto=format&fit=crop&w=600&q=80',
      route: '/category/ao-giu-nhiet'
    },
    {
      label: 'Áo thu đông',
      imageUrl: 'https://images.unsplash.com/photo-1520975682031-a4c2d7d185d1?auto=format&fit=crop&w=600&q=80',
      route: '/category/ao-thu-dong'
    },
    {
      label: 'Áo thun&polo',
      imageUrl: 'https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=600&q=80',
      route: '/category/ao-thun-polo'
    },
    {
      label: 'Quần jeans&dài',
      imageUrl: 'https://images.unsplash.com/photo-1542272564-9a2b01f4ac8e?auto=format&fit=crop&w=600&q=80',
      route: '/category/quan-jeans-dai'
    },
    {
      label: 'Váy đầm',
      imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8e2a8e3293f?auto=format&fit=crop&w=600&q=80',
      route: '/category/vay-dam'
    },
    {
      label: 'Quần short& chân váy',
      imageUrl: 'https://images.unsplash.com/photo-1583496329127-f097a97d661f?auto=format&fit=crop&w=600&q=80',
      route: '/category/quan-short-chan-vay'
    },
    {
      label: 'Áo lót &bra',
      imageUrl: 'https://images.unsplash.com/photo-1583496329127-f097a97d661f?auto=format&fit=crop&w=600&q=80',
      route: '/category/ao-lot-bra'
    },
    {
      label: 'Quần lót',
      imageUrl: 'https://images.unsplash.com/photo-1583496329127-f097a97d661f?auto=format&fit=crop&w=600&q=80',
      route: '/category/quan-lot'
    },
    {
      label: 'Giày dép',
      imageUrl: 'https://images.unsplash.com/photo-1528701800489-20be3c1ea2c3?auto=format&fit=crop&w=600&q=80',
      route: '/category/giay-dep'
    },
    {
      label: 'Túi sách',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
      route: '/category/tui-sach'
    },
    {
      label: 'Phụ kiện',
      imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80',
      route: '/category/phu-kien'
    }
  ],
  circleCategories: [],
  categoryGroups: [
    {
      label: 'Thời trang giữ ấm',
      items: [
        { label: 'Áo khoác', imageUrl: 'https://images.unsplash.com/photo-1520975682031-a4c2d7d185d1?auto=format&fit=crop&w=600&q=80', route: '/category/ao-khoac' },
        { label: 'Áo khoác phao & lông vũ', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/ao-khoac-phao-long-vu' },
        { label: 'Áo khoác lông cừu', imageUrl: 'https://images.unsplash.com/photo-1520974735194-6b4b8b1f2d0e?auto=format&fit=crop&w=600&q=80', route: '/category/ao-khoac-long-cuu' },
        { label: 'Áo khoác gió', imageUrl: 'https://images.unsplash.com/photo-1516822003754-cca485356ecb?auto=format&fit=crop&w=600&q=80', route: '/category/ao-khoac-gio' },
        { label: 'Áo khoác chống nắng', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80', route: '/category/ao-khoac-chong-nang' },
        { label: 'Áo giữ nhiệt', imageUrl: 'https://images.unsplash.com/photo-1520974735194-6b4b8b1f2d0e?auto=format&fit=crop&w=600&q=80', route: '/category/ao-giu-nhiet' },
        { label: 'Áo thu đông', imageUrl: 'https://images.unsplash.com/photo-1520975682031-a4c2d7d185d1?auto=format&fit=crop&w=600&q=80', route: '/category/ao-thu-dong' }
      ]
    },
    {
      label: 'Nữ',
      items: [
        { label: 'Áo khoác', imageUrl: 'https://images.unsplash.com/photo-1520975682031-a4c2d7d185d1?auto=format&fit=crop&w=600&q=80', route: '/category/nu/ao-khoac' },
        { label: 'Áo khoác phao & lông vũ', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/nu/ao-khoac-phao-long-vu' },
        { label: 'Áo khoác lông cừu', imageUrl: 'https://images.unsplash.com/photo-1520974735194-6b4b8b1f2d0e?auto=format&fit=crop&w=600&q=80', route: '/category/nu/ao-khoac-long-cuu' },
        { label: 'Áo khoác gió', imageUrl: 'https://images.unsplash.com/photo-1516822003754-cca485356ecb?auto=format&fit=crop&w=600&q=80', route: '/category/nu/ao-khoac-gio' },
        { label: 'Áo khoác chống nắng', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80', route: '/category/nu/ao-khoac-chong-nang' },
        { label: 'Áo', imageUrl: 'https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=600&q=80', route: '/category/nu/ao' },
        { label: 'Áo giữ nhiệt', imageUrl: 'https://images.unsplash.com/photo-1520974735194-6b4b8b1f2d0e?auto=format&fit=crop&w=600&q=80', route: '/category/nu/ao-giu-nhiet' },
        { label: 'Áo thu đông', imageUrl: 'https://images.unsplash.com/photo-1520975682031-a4c2d7d185d1?auto=format&fit=crop&w=600&q=80', route: '/category/nu/ao-thu-dong' },
        { label: 'Áo thun & polo', imageUrl: 'https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=600&q=80', route: '/category/nu/ao-thun-polo' },
        { label: 'Quần & đầm váy', imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8e2a8e3293f?auto=format&fit=crop&w=600&q=80', route: '/category/nu/quan-dam-vay' },
        { label: 'Quần jeans & dài', imageUrl: 'https://images.unsplash.com/photo-1542272564-9a2b01f4ac8e?auto=format&fit=crop&w=600&q=80', route: '/category/nu/quan-jeans-dai' },
        { label: 'Váy đầm', imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8e2a8e3293f?auto=format&fit=crop&w=600&q=80', route: '/category/nu/vay-dam' },
        { label: 'Quần short & chân váy', imageUrl: 'https://images.unsplash.com/photo-1583496329127-f097a97d661f?auto=format&fit=crop&w=600&q=80', route: '/category/nu/quan-short-chan-vay' },
        { label: 'Đồ lót', imageUrl: 'https://images.unsplash.com/photo-1583496329127-f097a97d661f?auto=format&fit=crop&w=600&q=80', route: '/category/nu/do-lot' },
        { label: 'Áo lót & bra', imageUrl: 'https://images.unsplash.com/photo-1583496329127-f097a97d661f?auto=format&fit=crop&w=600&q=80', route: '/category/nu/ao-lot-bra' },
        { label: 'Quần lót', imageUrl: 'https://images.unsplash.com/photo-1583496329127-f097a97d661f?auto=format&fit=crop&w=600&q=80', route: '/category/nu/quan-lot' },
        { label: 'Giày dép', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/nu/giay-dep' },
        { label: 'Balo & Túi ví', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', route: '/category/nu/balo-tui-vi' },
        { label: 'Balo đi làm & đi học', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', route: '/category/nu/balo-di-lam-di-hoc' },
        { label: 'Túi sách', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', route: '/category/nu/tui-sach' },
        { label: 'Phụ kiện', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/nu/phu-kien' },
        { label: 'Vòng tay', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/nu/vong-tay' },
        { label: 'Lắc chân', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/nu/lac-chan' },
        { label: 'Găng tay', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/nu/gang-tay' },
        { label: 'Mũ', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/nu/mu' },
        { label: 'Vòng cổ', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/nu/vong-co' },
        { label: 'Kính', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/nu/kinh' }
      ]
    },
    {
      label: 'Nam',
      items: [
        { label: 'Áo khoác', imageUrl: 'https://images.unsplash.com/photo-1520975682031-a4c2d7d185d1?auto=format&fit=crop&w=600&q=80', route: '/category/nam/ao-khoac' },
        { label: 'Áo khoác phao & lông vũ', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/nam/ao-khoac-phao-long-vu' },
        { label: 'Áo khoác lông cừu', imageUrl: 'https://images.unsplash.com/photo-1520974735194-6b4b8b1f2d0e?auto=format&fit=crop&w=600&q=80', route: '/category/nam/ao-khoac-long-cuu' },
        { label: 'Áo khoác gió', imageUrl: 'https://images.unsplash.com/photo-1516822003754-cca485356ecb?auto=format&fit=crop&w=600&q=80', route: '/category/nam/ao-khoac-gio' },
        { label: 'Áo khoác chống nắng', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80', route: '/category/nam/ao-khoac-chong-nang' },
        { label: 'Áo', imageUrl: 'https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=600&q=80', route: '/category/nam/ao' },
        { label: 'Áo giữ nhiệt', imageUrl: 'https://images.unsplash.com/photo-1520974735194-6b4b8b1f2d0e?auto=format&fit=crop&w=600&q=80', route: '/category/nam/ao-giu-nhiet' },
        { label: 'Áo thu đông', imageUrl: 'https://images.unsplash.com/photo-1520975682031-a4c2d7d185d1?auto=format&fit=crop&w=600&q=80', route: '/category/nam/ao-thu-dong' },
        { label: 'Áo polo & thun', imageUrl: 'https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=600&q=80', route: '/category/nam/ao-polo-thun' },
        { label: 'Quần', imageUrl: 'https://images.unsplash.com/photo-1542272564-9a2b01f4ac8e?auto=format&fit=crop&w=600&q=80', route: '/category/nam/quan' },
        { label: 'Quần jeans & dài', imageUrl: 'https://images.unsplash.com/photo-1542272564-9a2b01f4ac8e?auto=format&fit=crop&w=600&q=80', route: '/category/nam/quan-jeans-dai' },
        { label: 'Quần', imageUrl: 'https://images.unsplash.com/photo-1542272564-9a2b01f4ac8e?auto=format&fit=crop&w=600&q=80', route: '/category/nam/quan' },
        { label: 'Đồ lót', imageUrl: 'https://images.unsplash.com/photo-1583496329127-f097a97d661f?auto=format&fit=crop&w=600&q=80', route: '/category/nam/do-lot' },
        { label: 'Quần lót', imageUrl: 'https://images.unsplash.com/photo-1583496329127-f097a97d661f?auto=format&fit=crop&w=600&q=80', route: '/category/nam/quan-lot' },
        { label: 'Áo ba lỗ', imageUrl: 'https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=600&q=80', route: '/category/nam/ao-ba-lo' },
        { label: 'Giày thể thao và dép nhựa', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/nam/giay-the-thao-dep-nhua' },
        { label: 'Giày thể thao & chạy bộ', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/nam/giay-the-thao-chay-bo' },
        { label: 'Dép nhựa', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/nam/dep-nhua' },
        { label: 'Phụ kiện', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/nam/phu-kien' },
        { label: 'Găng tay, khẩu trang & tất', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/nam/gang-tay-khau-trang-tat' },
        { label: 'Dây lưng, kính & mũ nón', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/nam/day-lung-kinh-mu-non' },
        { label: 'Balo đi làm, đi học', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', route: '/category/nam/balo-di-lam-di-hoc' }
      ]
    },
    {
      label: 'Unisex',
      items: [
        { label: 'Quần', imageUrl: 'https://images.unsplash.com/photo-1542272564-9a2b01f4ac8e?auto=format&fit=crop&w=600&q=80', route: '/category/unisex/quan' },
        { label: 'Áo', imageUrl: 'https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=600&q=80', route: '/category/unisex/ao' },
        { label: 'Đồ đôi', imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8e2a8e3293f?auto=format&fit=crop&w=600&q=80', route: '/category/unisex/do-doi' },
        { label: 'Mũ', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/unisex/mu' },
        { label: 'Balo', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', route: '/category/unisex/balo' }
      ]
    },
    {
      label: 'PHỤ KIỆN',
      items: [
        { label: 'Ba lô chống nước', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/balo-chong-nuoc' },
        { label: 'Ba lô chống trộm', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/balo-chong-trom' },
        { label: 'Ba lô thời trang', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/balo-thoi-trang' },
        { label: 'Túi xách thời trang', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/tui-xach-thoi-trang' },
        { label: 'Túi du lịch', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/tui-du-lich' },
        { label: 'Giày thể thao chạy bộ', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/giay-the-thao-chay-bo' },
        { label: 'Dép sục & sandals', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/dep-suc-sandals' },
        { label: 'Bốt', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/bot' },
        { label: 'Giày thể thao & chạy bộ', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/giay-the-thao-chay-bo' },
        { label: 'Dép sục & dép nhựa', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/dep-suc-dep-nhua' },
        { label: 'Dây lưng', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/day-lung' },
        { label: 'Mũ len', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/mu-len' },
        { label: 'Mũ lưỡi trai', imageUrl: 'https://images.unsplash.com/photo-1596944924613-2a1f8c5e9e5d?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/mu-luoi-trai' },
        { label: 'Quần lót', imageUrl: 'https://images.unsplash.com/photo-1583496329127-f097a97d661f?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/quan-lot' },
        { label: 'Tất', imageUrl: 'https://images.unsplash.com/photo-1583496329127-f097a97d661f?auto=format&fit=crop&w=600&q=80', route: '/category/phu-kien/tat' }
      ]
    }
  ],
  featuredTitle: 'ĐƯỢC YÊU THÍCH NHẤT',
  featuredProducts: [
    { title: 'Giày thể thao nữ', imageUrl: 'https://images.unsplash.com/photo-1528701800489-20be3c1ea2c3?auto=format&fit=crop&w=900&q=80', tag: 'HAPPY HOLIDAY', priceText: '299.000đ', route: '/category/giay' },
    { title: 'Áo khoác lông vũ', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', tag: 'SALE', priceText: '499.000đ', route: '/category/ao-khoac' },
    { title: 'Chăn lông cừu', imageUrl: 'https://images.unsplash.com/photo-1616627984690-7fcb1d6ae2bc?auto=format&fit=crop&w=900&q=80', tag: 'ĐỘC QUYỀN', priceText: '399.000đ', route: '/category/nha-cua-doi-song' },
    { title: 'Giày thể thao nam', imageUrl: 'https://images.unsplash.com/photo-1528701800489-20be3c1ea2c3?auto=format&fit=crop&w=900&q=80', tag: 'HOT', priceText: '359.000đ', route: '/category/giay' }
  ],
  featuredViewAll: { text: 'Xem tất cả sản phẩm', route: '/category/featured' },
  hotTitle: 'SẢN PHẨM HOT NHẤT MỖI NGÀY',
  hotProducts: [
    { title: 'Áo khoác nỉ', imageUrl: 'https://images.unsplash.com/photo-1516822003754-cca485356ecb?auto=format&fit=crop&w=900&q=80', tag: 'GIÁ TỐT', priceText: '349.000đ', route: '/category/ao-khoac' },
    { title: 'Áo lông cừu', imageUrl: 'https://images.unsplash.com/photo-1520975682031-a4c2d7d185d1?auto=format&fit=crop&w=900&q=80', tag: 'HAPPY', priceText: '199.000đ', route: '/category/ao-len' },
    { title: 'Áo giữ nhiệt', imageUrl: 'https://images.unsplash.com/photo-1520974735194-6b4b8b1f2d0e?auto=format&fit=crop&w=900&q=80', tag: 'SALE', priceText: '189.000đ', route: '/category/ao-giu-nhiet' },
    { title: 'Quần legging', imageUrl: 'https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=900&q=80', tag: 'HOT', priceText: '179.000đ', route: '/category/quan' }
  ],
  hotViewAll: { text: 'Xem tất cả sản phẩm', route: '/category/hot' },
  exclusiveTitle: 'GIỎ HÀNG TIẾT KIỆM ĐỘC QUYỀN ONLINE',
  exclusiveProducts: [
    { title: 'Combo 2 áo', imageUrl: 'https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=900&q=80', tag: 'COMBO', priceText: '299.000đ', route: '/category/combo' },
    { title: 'Combo quần & áo', imageUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80', tag: 'COMBO', priceText: '399.000đ', route: '/category/combo' },
    { title: 'Đồ tập nữ', imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80', tag: 'HOT', priceText: '259.000đ', route: '/category/the-thao' },
    { title: 'Bra thể thao', imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80', tag: 'SALE', priceText: '159.000đ', route: '/category/the-thao' }
  ],
  exclusiveViewAll: { text: 'Xem tất cả sản phẩm', route: '/category/exclusive' },
  newsTitle: 'TIN TỨC',
  news: [
    { title: 'Chính sách đổi - hoàn tiền', description: 'Hoàn tiền/đổi trả trong 30 ngày.', imageUrl: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=900&q=80', route: '/news' },
    { title: 'Hành trình thiện thần', description: 'Chia sẻ hành trình cùng cộng đồng.', imageUrl: 'https://images.unsplash.com/photo-1520975682031-a4c2d7d185d1?auto=format&fit=crop&w=900&q=80', route: '/news' },
    { title: 'Tưng bừng chào đón', description: 'Ưu đãi mới mỗi ngày.', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80', route: '/news' }
  ],
  footerQuoteTitle: 'FASHIONHUB',
  footerQuote:
    'FashionHub trân trọng cảm ơn Quý Khách đã ủng hộ và góp phần tạo thêm cơ hội việc làm. Đây là bản giao diện demo, bạn có thể chỉnh màu/ảnh trong home.config.ts.'
};

const normalizeCategoryRoute = (route: string): string => {
  if (!route.startsWith('/category/')) return route;
  const parts = route.split('/').filter(Boolean);
  // parts: ['category', ...]
  if (parts.length <= 2) return route;
  const slug = parts.slice(1).join('-');
  return `/category/${slug}`;
};

HOME_CONFIG.categoryGroups = HOME_CONFIG.categoryGroups.map((g) => ({
  ...g,
  items: g.items.map((item) => ({
    ...item,
    route: normalizeCategoryRoute(item.route)
  }))
}));

if (HOME_CONFIG.quickTiles && HOME_CONFIG.quickTiles.length > 0) {
  HOME_CONFIG.quickTiles = HOME_CONFIG.quickTiles.map((item) => ({
    ...item,
    route: normalizeCategoryRoute(item.route)
  }));
}

HOME_CONFIG.circleCategories = HOME_CONFIG.categoryGroups.flatMap((g) => g.items);

if (HOME_CONFIG.quickTiles && HOME_CONFIG.quickTiles.length > 0) {
  HOME_CONFIG.circleCategories = HOME_CONFIG.quickTiles;
}
