import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

type PageContent = {
  title: string;
  sections: Array<{ heading?: string; paragraphs: string[] }>;
};

const PAGES: Record<string, PageContent> = {
  'chung-toi-la-ai': {
    title: 'Chúng tôi là ai',
    sections: [
      {
        paragraphs: [
          'FashionHub là nền tảng mua sắm thời trang hướng đến trải nghiệm đơn giản, nhanh và tin cậy.',
          'Chúng tôi tập trung vào chất lượng sản phẩm, dịch vụ khách hàng và chính sách minh bạch.'
        ]
      }
    ]
  },
  'cam-ket': {
    title: 'Cam kết của chúng tôi',
    sections: [
      {
        heading: 'Cam kết chất lượng',
        paragraphs: [
          'Thông tin sản phẩm rõ ràng, minh bạch.',
          'Hỗ trợ đổi trả theo chính sách.'
        ]
      },
      {
        heading: 'Cam kết dịch vụ',
        paragraphs: ['CSKH nhanh chóng, ưu tiên xử lý khiếu nại và bảo hành.']
      }
    ]
  },
  'tuyen-dung': {
    title: 'Tin tuyển dụng',
    sections: [
      {
        paragraphs: [
          'Chúng tôi luôn tìm kiếm những ứng viên đam mê thời trang và dịch vụ khách hàng.',
          'Vui lòng liên hệ email cskh@fashionhub.vn để nhận thông tin tuyển dụng mới nhất.'
        ]
      }
    ]
  },
  'he-thong-cua-hang': {
    title: 'Hệ thống cửa hàng',
    sections: [
      {
        paragraphs: [
          'Bạn có thể mua sắm online hoặc ghé cửa hàng gần nhất để trải nghiệm sản phẩm.',
          'Danh sách cửa hàng sẽ được cập nhật liên tục theo từng khu vực.'
        ]
      }
    ]
  },
  'huong-dan-dat-hang': {
    title: 'Hướng dẫn đặt hàng',
    sections: [
      {
        paragraphs: [
          'Bước 1: Chọn sản phẩm và thêm vào giỏ hàng.',
          'Bước 2: Điền thông tin giao hàng và chọn phương thức thanh toán.',
          'Bước 3: Xác nhận đơn hàng và theo dõi trạng thái.'
        ]
      }
    ]
  },
  'phuong-thuc-thanh-toan': {
    title: 'Phương thức thanh toán',
    sections: [
      {
        paragraphs: [
          'COD (thanh toán khi nhận hàng).',
          'Thanh toán qua cổng VNPAY QR (tuỳ khu vực hỗ trợ).'
        ]
      }
    ]
  },
  'chinh-sach-sinh-nhat': {
    title: 'Chính sách sinh nhật thành viên',
    sections: [
      {
        paragraphs: [
          'Ưu đãi sinh nhật được áp dụng theo chương trình tại từng thời điểm.',
          'Vui lòng đăng nhập tài khoản để xem ưu đãi khả dụng.'
        ]
      }
    ]
  },
  'chinh-sach-tich-diem': {
    title: 'Chính sách tích - tiêu điểm',
    sections: [
      {
        paragraphs: [
          'Điểm thưởng được cộng theo giá trị đơn hàng và hạng thành viên.',
          'Điểm có thể được sử dụng theo điều kiện áp dụng của từng chương trình.'
        ]
      }
    ]
  },
  'chinh-sach-hoan-tien': {
    title: 'Chính sách hoàn tiền',
    sections: [
      {
        paragraphs: [
          'Hoàn tiền được áp dụng khi đơn hàng đủ điều kiện theo chính sách đổi trả.',
          'Thời gian hoàn tiền phụ thuộc phương thức thanh toán và ngân hàng.'
        ]
      }
    ]
  },
  'chinh-sach-van-chuyen': {
    title: 'Chính sách vận chuyển',
    sections: [
      {
        paragraphs: [
          'Thời gian giao hàng tuỳ khu vực.',
          'Phí vận chuyển hiển thị ở bước thanh toán.'
        ]
      }
    ]
  },
  'chinh-sach-kiem-hang': {
    title: 'Chính sách kiểm hàng',
    sections: [
      {
        paragraphs: ['Bạn có thể kiểm tra sản phẩm theo quy định trước khi thanh toán (tuỳ đơn vị vận chuyển).']
      }
    ]
  },
  'chinh-sach-doi-tra': {
    title: 'Chính sách đổi trả',
    sections: [
      {
        paragraphs: [
          'Hỗ trợ đổi trả theo điều kiện sản phẩm còn nguyên tem/mác và hoá đơn.',
          'Thời hạn đổi trả tuỳ theo chương trình tại từng thời điểm.'
        ]
      }
    ]
  },
  'dieu-kien-dieu-khoan': {
    title: 'Điều kiện & điều khoản',
    sections: [
      {
        paragraphs: ['Việc sử dụng dịch vụ đồng nghĩa bạn đồng ý với các điều khoản và quy định của FashionHub.']
      }
    ]
  },
  'chinh-sach-bao-mat': {
    title: 'Chính sách bảo mật',
    sections: [
      {
        paragraphs: [
          'Chúng tôi tôn trọng quyền riêng tư và bảo vệ dữ liệu khách hàng.',
          'Dữ liệu được sử dụng nhằm phục vụ trải nghiệm mua sắm và chăm sóc khách hàng.'
        ]
      }
    ]
  },
  'lien-he': {
    title: 'Liên hệ',
    sections: [
      {
        paragraphs: [
          'Tư vấn mua online: 024 7308 2882',
          'Khiếu nại & bảo hành: 024 7300 6999',
          'Email: cskh@fashionhub.vn',
          'Giờ làm việc: 8:30 - 22:00 hằng ngày'
        ]
      }
    ]
  },
  'fashionhub-news': {
    title: 'FashionHub News',
    sections: [
      {
        paragraphs: ['Tin tức và cập nhật sẽ được đăng tải tại đây.']
      }
    ]
  },
  'tiktok': {
    title: 'TikTok',
    sections: [
      {
        paragraphs: ['Kênh TikTok chính thức của FashionHub sẽ được cập nhật tại đây.']
      }
    ]
  },
  'facebook': {
    title: 'Facebook',
    sections: [
      {
        paragraphs: ['Fanpage Facebook chính thức của FashionHub sẽ được cập nhật tại đây.']
      }
    ]
  },
  'zalo': {
    title: 'Zalo',
    sections: [
      {
        paragraphs: ['Kênh Zalo OA chính thức của FashionHub sẽ được cập nhật tại đây.']
      }
    ]
  },
  'youtube': {
    title: 'YouTube',
    sections: [
      {
        paragraphs: ['Kênh YouTube chính thức của FashionHub sẽ được cập nhật tại đây.']
      }
    ]
  },
  'app-store': {
    title: 'Ứng dụng trên App Store',
    sections: [
      {
        paragraphs: ['Liên kết tải ứng dụng iOS sẽ được cập nhật tại đây.']
      }
    ]
  },
  'google-play': {
    title: 'Ứng dụng trên Google Play',
    sections: [
      {
        paragraphs: ['Liên kết tải ứng dụng Android sẽ được cập nhật tại đây.']
      }
    ]
  },
  'yeu-thich': {
    title: 'Yêu thích',
    sections: [
      {
        paragraphs: [
          'Bạn có thể lưu lại các sản phẩm yêu thích để xem lại nhanh hơn.',
          'Tính năng đồng bộ danh sách yêu thích sẽ được cập nhật trong thời gian tới.'
        ]
      }
    ]
  }
};

@Component({
  selector: 'app-static-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <a routerLink="/" class="back">← Về trang chủ</a>
      <h1 class="title">{{ content.title }}</h1>

      <div class="card" *ngFor="let s of content.sections">
        <h2 class="h2" *ngIf="s.heading">{{ s.heading }}</h2>
        <p class="p" *ngFor="let p of s.paragraphs">{{ p }}</p>
      </div>

      <div class="note" *ngIf="isMissing">
        Nội dung trang này đang được cập nhật.
      </div>
    </div>
  `,
  styles: [
    `
      .page { max-width: 1100px; margin: 0 auto; padding: 48px 16px; }
      .back { display: inline-block; margin-bottom: 16px; color: var(--fh-primary); }
      .title { margin: 0 0 14px; font-weight: 900; }
      .card { background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 14px; padding: 16px; margin: 12px 0; }
      .h2 { margin: 0 0 8px; font-size: 16px; font-weight: 900; }
      .p { margin: 6px 0; color: rgba(55,65,81,1); line-height: 1.65; }
      .note { margin-top: 14px; color: rgba(107,114,128,1); }
    `
  ]
})
export class StaticPageComponent {
  slug = '';
  content: PageContent = { title: 'Trang nội dung', sections: [{ paragraphs: ['Nội dung trang này đang được cập nhật.'] }] };
  isMissing = false;

  constructor(route: ActivatedRoute) {
    this.slug = route.snapshot.paramMap.get('slug') || '';
    const found = PAGES[this.slug];
    if (found) {
      this.content = found;
      this.isMissing = false;
    } else {
      this.isMissing = true;
      this.content = { title: 'Trang nội dung', sections: [{ paragraphs: ['Nội dung trang này đang được cập nhật.'] }] };
    }
  }
}
