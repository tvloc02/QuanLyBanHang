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
          'Chúng tôi cung cấp đa dạng sản phẩm thời trang theo mùa, theo xu hướng và theo nhu cầu thực tế.',
          'Mục tiêu của FashionHub là mang đến trải nghiệm mua sắm thuận tiện, thông tin minh bạch, giao hàng nhanh và hỗ trợ tận tâm.'
        ]
      },
      {
        heading: 'Giá trị cốt lõi',
        paragraphs: [
          'Minh bạch: mô tả sản phẩm rõ ràng, hình ảnh chân thực và chính sách công khai.',
          'Tốc độ: tối ưu khâu xử lý và giao hàng để bạn nhận hàng sớm nhất.',
          'Tận tâm: hỗ trợ trước - trong - sau mua, ưu tiên trải nghiệm khách hàng.'
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
          'Thông tin sản phẩm rõ ràng, minh bạch; kích thước, chất liệu và hướng dẫn bảo quản được mô tả cụ thể.',
          'Sản phẩm được kiểm tra trước khi đóng gói nhằm giảm thiểu lỗi phát sinh trong quá trình vận chuyển.',
          'Hỗ trợ đổi trả theo chính sách trong trường hợp sản phẩm không phù hợp hoặc có vấn đề kỹ thuật.'
        ]
      },
      {
        heading: 'Cam kết dịch vụ',
        paragraphs: [
          'CSKH nhanh chóng, ưu tiên xử lý khiếu nại và bảo hành.',
          'Theo dõi đơn hàng minh bạch và cập nhật trạng thái liên tục.',
          'Tối ưu trải nghiệm thanh toán và hỗ trợ nhiều phương thức thanh toán phổ biến.'
        ]
      }
    ]
  },
  'tuyen-dung': {
    title: 'Tin tuyển dụng',
    sections: [
      {
        paragraphs: [
          'Chúng tôi luôn tìm kiếm những ứng viên đam mê thời trang và dịch vụ khách hàng.',
          'Các vị trí thường xuyên: CSKH, vận hành, nội dung, thiết kế, kho vận.',
          'Vui lòng gửi CV và thông tin ứng tuyển qua email cskh@fashionhub.vn để nhận lịch phỏng vấn và mô tả công việc chi tiết.'
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
          'Danh sách cửa hàng sẽ được cập nhật liên tục theo từng khu vực.',
          'Nếu bạn cần hỗ trợ tìm cửa hàng phù hợp, vui lòng truy cập trang Liên hệ hoặc gọi hotline để được tư vấn.'
        ]
      }
    ]
  },
  'huong-dan-dat-hang': {
    title: 'Hướng dẫn đặt hàng',
    sections: [
      {
        heading: 'Các bước đặt hàng',
        paragraphs: [
          'Bước 1: Chọn sản phẩm và thêm vào giỏ hàng.',
          'Bước 2: Điền thông tin giao hàng và chọn phương thức thanh toán.',
          'Bước 3: Xác nhận đơn hàng và theo dõi trạng thái.'
        ]
      },
      {
        heading: 'Lưu ý',
        paragraphs: [
          'Vui lòng kiểm tra lại số điện thoại và địa chỉ để tránh giao hàng thất bại.',
          'Nếu cần thay đổi thông tin sau khi đặt, hãy liên hệ CSKH sớm nhất để được hỗ trợ.'
        ]
      }
    ]
  },
  'phuong-thuc-thanh-toan': {
    title: 'Phương thức thanh toán',
    sections: [
      {
        paragraphs: [
          'COD (thanh toán khi nhận hàng): thanh toán trực tiếp cho đơn vị vận chuyển khi nhận được hàng.',
          'VNPAY QR: thanh toán nhanh bằng quét QR (tuỳ khu vực hỗ trợ).',
          'Trong một số chương trình, phương thức thanh toán khả dụng có thể thay đổi theo từng thời điểm.'
        ]
      }
    ]
  },
  'chinh-sach-sinh-nhat': {
    title: 'Chính sách sinh nhật thành viên',
    sections: [
      {
        paragraphs: [
          'Ưu đãi sinh nhật được áp dụng theo chương trình tại từng thời điểm và có thể thay đổi theo hạng thành viên.',
          'Vui lòng đăng nhập tài khoản để xem ưu đãi khả dụng.',
          'Đảm bảo thông tin ngày sinh được cập nhật chính xác trong hồ sơ để hệ thống ghi nhận ưu đãi.'
        ]
      }
    ]
  },
  'chinh-sach-tich-diem': {
    title: 'Chính sách tích - tiêu điểm',
    sections: [
      {
        paragraphs: [
          'Điểm thưởng được cộng theo giá trị đơn hàng và hạng thành viên (nếu có).',
          'Điểm có thể được sử dụng theo điều kiện áp dụng của từng chương trình.',
          'Điểm thưởng thường có thời hạn sử dụng; vui lòng theo dõi trong tài khoản để tránh hết hạn.'
        ]
      }
    ]
  },
  'chinh-sach-hoan-tien': {
    title: 'Chính sách hoàn tiền',
    sections: [
      {
        paragraphs: [
          'Hoàn tiền được áp dụng khi đơn hàng đủ điều kiện theo chính sách đổi trả và được xác nhận bởi FashionHub.',
          'Thời gian hoàn tiền phụ thuộc phương thức thanh toán và ngân hàng/đơn vị trung gian.',
          'Trong trường hợp COD, hoàn tiền sẽ được xử lý theo hình thức thoả thuận (chuyển khoản hoặc ví điện tử tuỳ chương trình).'
        ]
      }
    ]
  },
  'chinh-sach-van-chuyen': {
    title: 'Chính sách vận chuyển',
    sections: [
      {
        heading: 'Thời gian giao hàng',
        paragraphs: [
          'Thời gian giao hàng tuỳ khu vực và phụ thuộc đơn vị vận chuyển.',
          'Khi đơn hàng được xác nhận, bạn sẽ nhận cập nhật trạng thái xử lý và vận chuyển.',
          'Phí vận chuyển hiển thị ở bước thanh toán và có thể thay đổi theo địa chỉ/khối lượng.'
        ]
      }
    ]
  },
  'chinh-sach-kiem-hang': {
    title: 'Chính sách kiểm hàng',
    sections: [
      {
        paragraphs: [
          'Bạn có thể kiểm tra sản phẩm theo quy định trước khi thanh toán (tuỳ đơn vị vận chuyển).',
          'Vui lòng quay video mở gói hàng để làm bằng chứng trong trường hợp cần hỗ trợ đổi trả.',
          'Nếu phát hiện thiếu/nhầm sản phẩm, hãy liên hệ CSKH ngay trong ngày nhận hàng.'
        ]
      }
    ]
  },
  'chinh-sach-doi-tra': {
    title: 'Chính sách đổi trả',
    sections: [
      {
        heading: 'Điều kiện đổi trả',
        paragraphs: [
          'Hỗ trợ đổi trả theo điều kiện sản phẩm còn nguyên tem/mác và hoá đơn/phiếu giao hàng (nếu có).',
          'Sản phẩm chưa qua sử dụng, không bị dơ bẩn/hư hỏng do người dùng.',
          'Thời hạn đổi trả tuỳ theo chương trình tại từng thời điểm.'
        ]
      },
      {
        heading: 'Quy trình',
        paragraphs: [
          'Liên hệ CSKH cung cấp mã đơn hàng và lý do đổi trả.',
          'Nhận hướng dẫn gửi hàng về kho/điểm tiếp nhận.',
          'FashionHub kiểm tra và tiến hành đổi hàng/hoàn tiền theo chính sách.'
        ]
      }
    ]
  },
  'dieu-kien-dieu-khoan': {
    title: 'Điều kiện & điều khoản',
    sections: [
      {
        paragraphs: [
          'Việc sử dụng dịch vụ đồng nghĩa bạn đồng ý với các điều khoản và quy định của FashionHub.',
          'FashionHub có thể cập nhật điều khoản theo thời điểm nhằm phù hợp quy định pháp luật và vận hành.',
          'Bạn vui lòng đọc kỹ chính sách vận chuyển, đổi trả và bảo mật trước khi đặt hàng.'
        ]
      }
    ]
  },
  'chinh-sach-bao-mat': {
    title: 'Chính sách bảo mật',
    sections: [
      {
        paragraphs: [
          'Chúng tôi tôn trọng quyền riêng tư và bảo vệ dữ liệu khách hàng.',
          'Dữ liệu được sử dụng nhằm phục vụ trải nghiệm mua sắm và chăm sóc khách hàng.',
          'Thông tin của bạn không được chia sẻ cho bên thứ ba khi không có sự đồng ý, trừ các trường hợp cần thiết để thực hiện giao hàng/thanh toán theo quy định.'
        ]
      }
    ]
  },
  'lien-he': {
    title: 'Liên hệ',
    sections: [
      {
        heading: 'Kênh hỗ trợ',
        paragraphs: [
          'Tư vấn mua online: 024 7308 2882',
          'Khiếu nại & bảo hành: 024 7300 6999',
          'Email: cskh@fashionhub.vn',
          'Giờ làm việc: 8:30 - 22:00 hằng ngày'
        ]
      },
      {
        heading: 'Gửi yêu cầu',
        paragraphs: [
          'Vui lòng chuẩn bị mã đơn hàng và nội dung cần hỗ trợ để xử lý nhanh hơn.',
          'Trong trường hợp đổi trả/bảo hành, nên chụp ảnh hoặc quay video tình trạng sản phẩm.'
        ]
      }
    ]
  },
  'fashionhub-news': {
    title: 'FashionHub News',
    sections: [
      {
        paragraphs: [
          'Tin tức và cập nhật sẽ được đăng tải tại đây.',
          'Bạn có thể theo dõi các chương trình khuyến mãi, bộ sưu tập mới và thông báo quan trọng từ FashionHub.'
        ]
      }
    ]
  },
  'tiktok': {
    title: 'TikTok',
    sections: [
      {
        paragraphs: [
          'Kênh TikTok chính thức của FashionHub sẽ được cập nhật tại đây.',
          'Nội dung bao gồm: tips phối đồ, review sản phẩm, livestream và các minigame.'
        ]
      }
    ]
  },
  'facebook': {
    title: 'Facebook',
    sections: [
      {
        paragraphs: [
          'Fanpage Facebook chính thức của FashionHub sẽ được cập nhật tại đây.',
          'Theo dõi fanpage để nhận thông báo ưu đãi, cập nhật đơn hàng và hỗ trợ nhanh.'
        ]
      }
    ]
  },
  'zalo': {
    title: 'Zalo',
    sections: [
      {
        paragraphs: [
          'Kênh Zalo OA chính thức của FashionHub sẽ được cập nhật tại đây.',
          'Zalo OA hỗ trợ: tư vấn sản phẩm, tra cứu đơn hàng và nhận thông báo ưu đãi.'
        ]
      }
    ]
  },
  'youtube': {
    title: 'YouTube',
    sections: [
      {
        paragraphs: [
          'Kênh YouTube chính thức của FashionHub sẽ được cập nhật tại đây.',
          'Nội dung bao gồm: lookbook, hướng dẫn phối đồ, hậu trường và review chi tiết.'
        ]
      }
    ]
  },
  'app-store': {
    title: 'Ứng dụng trên App Store',
    sections: [
      {
        paragraphs: [
          'Liên kết tải ứng dụng iOS sẽ được cập nhật tại đây.',
          'Khi có ứng dụng, bạn sẽ nhận được trải nghiệm mượt hơn, theo dõi đơn hàng nhanh và nhận ưu đãi cá nhân hoá.'
        ]
      }
    ]
  },
  'google-play': {
    title: 'Ứng dụng trên Google Play',
    sections: [
      {
        paragraphs: [
          'Liên kết tải ứng dụng Android sẽ được cập nhật tại đây.',
          'Khi có ứng dụng, bạn sẽ nhận được thông báo ưu đãi, cập nhật trạng thái đơn và hỗ trợ nhanh hơn.'
        ]
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
    <main class="page">
      <div class="container">
        <a class="back" routerLink="/sale">← Về trang chủ</a>
        <h1 class="title">{{ content.title }}</h1>

      <div class="card" *ngFor="let s of content.sections">
        <h2 class="h2" *ngIf="s.heading">{{ s.heading }}</h2>
        <p class="p" *ngFor="let p of s.paragraphs">{{ p }}</p>
      </div>

      <div class="note" *ngIf="isMissing">
        Nội dung trang này đang được cập nhật.
      </div>
      </div>
    </main>
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
