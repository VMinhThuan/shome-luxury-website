module.exports = {
  hero: {
    eyebrow: 'BÁO GIÁ THIẾT KẾ & THI CÔNG',
    title: 'Kiến tạo không gian sống',
    script: 'đúng gu, đúng ngân sách',
    description: 'Shome Luxury đồng hành từ ý tưởng, thiết kế đến thi công hoàn thiện. Nhận dự toán phù hợp với nhu cầu và hiện trạng của riêng bạn.',
    image: '/images/quote-apartment-hero-v1.png',
    ctaLabel: 'Nhận dự toán miễn phí',
    ctaHref: '#nhan-du-toan',
    isVisible: true
  },
  benefits: {
    title: 'Chúng tôi mang đến',
    script: 'nhiều hơn một báo giá',
    description: 'Một phương án rõ ràng để bạn chủ động quyết định cho tổ ấm của mình.',
    items: [
      { title: 'Tư vấn đúng nhu cầu', description: 'Lắng nghe hiện trạng, gu thẩm mỹ và ngân sách trước khi đề xuất phương án.', icon: 'spark', isVisible: true },
      { title: 'Dự toán minh bạch', description: 'Bóc tách hạng mục, vật liệu và khối lượng rõ ràng để dễ đối chiếu.', icon: 'document', isVisible: true },
      { title: 'Xưởng sản xuất trực tiếp', description: 'Chủ động chất lượng và tiến độ, tối ưu chi phí không qua trung gian.', icon: 'workshop', isVisible: true }
    ],
    isVisible: true
  },
  categories: {
    eyebrow: 'KHÔNG GIAN ĐƯỢC KIẾN TẠO',
    title: 'Thiết kế theo',
    script: 'câu chuyện của bạn',
    description: 'Khám phá các công trình thực tế theo từng loại hình không gian.',
    items: [
      { categoryCode: 'tk-nt-chung-cu', description: 'Tối ưu từng mét vuông, cân bằng công năng và cảm xúc sống.', ctaLabel: 'Xem công trình', isVisible: true, order: 1 },
      { categoryCode: 'tk-nt-biet-thu', description: 'Không gian riêng tư được hoàn thiện tinh tế trong từng chi tiết.', ctaLabel: 'Xem công trình', isVisible: true, order: 2 },
      { categoryCode: 'tk-nt-van-phong', description: 'Nơi bản sắc thương hiệu và trải nghiệm làm việc gặp nhau.', ctaLabel: 'Xem công trình', isVisible: true, order: 3 }
    ],
    isVisible: true
  },
  brandVideo: {
    eyebrow: 'SHOME LUXURY',
    title: 'Đơn vị thiết kế & thi công nội thất hàng đầu Việt Nam',
    description: 'Kiến tạo không gian sống – Nâng tầm giá trị cuộc sống',
    image: '/images/booking-luxury-interior.png',
    videoUrl: '',
    caption: 'Giới thiệu về Shome Luxury',
    duration: '02:15',
    ctaLabel: 'Xem trên YouTube',
    ctaHref: '',
    isVisible: true
  },
  capability: {
    eyebrow: 'SHOME LUXURY',
    title: 'Một quy trình khép kín',
    script: 'cho một tổ ấm trọn vẹn',
    description: 'Từ bản vẽ đầu tiên đến ngày bàn giao, mỗi công đoạn đều được kiểm soát bởi cùng một đội ngũ.',
    image: '/images/img-xuong-san-xuat/chinh-chu-chi-tiet.png',
    stats: [
      { value: '01', label: 'Đội ngũ thiết kế đồng hành' },
      { value: '02', label: 'Xưởng sản xuất trực tiếp' },
      { value: '03', label: 'Quy trình kiểm soát chất lượng' }
    ],
    isVisible: true
  },
  completed: {
    eyebrow: 'CÔNG TRÌNH HOÀN THIỆN',
    title: 'Chạm vào',
    script: 'chất lượng thực tế',
    description: 'Những không gian được hoàn thiện từ xưởng Shome Luxury.',
    gallery: [
      { image: '/images/hero_interior.jpg', alt: 'Không gian phòng khách hoàn thiện', isVisible: true, order: 1 },
      { image: '/images/service_interior.jpg', alt: 'Không gian nội thất hoàn thiện', isVisible: true, order: 2 },
      { image: '/images/hero_sofa_light.jpg', alt: 'Chi tiết nội thất Shome Luxury', isVisible: true, order: 3 },
      { image: '/images/project_villa.jpg', alt: 'Công trình biệt thự hoàn thiện', isVisible: true, order: 4 }
    ],
    isVisible: true
  },
  pricing: {
    eyebrow: 'BÁO GIÁ THAM KHẢO',
    title: 'Dự toán rõ ràng',
    script: 'để an tâm bắt đầu',
    description: 'Mỗi công trình có hiện trạng và yêu cầu riêng. Các hạng mục dưới đây giúp bạn hình dung phạm vi đầu tư trước khi nhận dự toán chi tiết.',
    items: [
      { number: '01', title: 'Chung cư 1 ngủ', price: '55 triệu', area: '< 70m²', description: 'Thiết kế trọn gói, tối ưu công năng và chi phí.', image: '/images/anh_san_pham_1.png', ctaLabel: 'Nhận tư vấn', ctaHref: '#nhan-du-toan', isVisible: true, order: 1 },
      { number: '02', title: 'Chung cư 2 ngủ', price: '90 triệu', area: '70 - 100m²', description: 'Thiết kế trọn gói, đồng bộ thẩm mỹ cho từng không gian.', image: '/images/anh_san_pham_2.png', ctaLabel: 'Nhận tư vấn', ctaHref: '#nhan-du-toan', isVisible: true, order: 2 },
      { number: '03', title: 'Chung cư 3 ngủ', price: '125 triệu', area: '> 100m²', description: 'Giải pháp thiết kế đầy đủ cho tổ ấm rộng rãi.', image: '/images/anh_san_pham_3.png', ctaLabel: 'Nhận tư vấn', ctaHref: '#nhan-du-toan', isVisible: true, order: 3 }
    ],
    isVisible: true
  },
  constructionCta: {
    eyebrow: 'THI CÔNG NỘI THẤT',
    title: 'Miễn phí thiết kế',
    description: 'Khi ký hợp đồng thi công trọn gói. Tối ưu chi phí, đồng bộ thẩm mỹ và trọn gói cho căn hộ, nhà phố, văn phòng.',
    image: '/images/booking-luxury-interior.png',
    ctaLabel: 'Nhận tư vấn ngay',
    ctaHref: '#nhan-du-toan',
    isVisible: true
  },
  process: {
    eyebrow: 'QUY TRÌNH LÀM VIỆC',
    title: 'Đơn giản để',
    script: 'bạn luôn chủ động',
    items: [
      { number: '01', title: 'Trao đổi nhu cầu', description: 'Chia sẻ hiện trạng, mong muốn và khoảng ngân sách dự kiến.', isVisible: true, order: 1 },
      { number: '02', title: 'Khảo sát & tư vấn', description: 'Đội ngũ khảo sát và đề xuất hướng triển khai phù hợp.', isVisible: true, order: 2 },
      { number: '03', title: 'Nhận phương án', description: 'Thống nhất thiết kế, vật liệu và bảng dự toán chi tiết.', isVisible: true, order: 3 },
      { number: '04', title: 'Sản xuất & bàn giao', description: 'Triển khai đúng tiến độ, nghiệm thu từng hạng mục.', isVisible: true, order: 4 }
    ],
    isVisible: true
  },
  estimate: {
    eyebrow: 'NHẬN DỰ TOÁN',
    title: 'Bắt đầu câu chuyện',
    script: 'không gian của bạn',
    description: 'Để lại thông tin, Shome Luxury sẽ liên hệ tư vấn và gửi dự toán phù hợp trong thời gian sớm nhất.',
    image: '/images/booking-estimate-visual.png',
    submitLabel: 'Gửi yêu cầu tư vấn',
    isVisible: true
  },
  faq: {
    eyebrow: 'GIẢI ĐÁP',
    title: 'Câu hỏi thường',
    script: 'gặp',
    items: [
      { question: 'Báo giá có bao gồm toàn bộ chi phí không?', answer: 'Bảng dự toán thể hiện rõ phạm vi công việc, vật liệu và các hạng mục liên quan. Mọi thay đổi đều được trao đổi trước khi thực hiện.', isVisible: true, order: 1 },
      { question: 'Bao lâu tôi nhận được dự toán?', answer: 'Sau khi tiếp nhận thông tin và khảo sát cần thiết, đội ngũ sẽ phản hồi lộ trình dự toán phù hợp với quy mô công trình.', isVisible: true, order: 2 },
      { question: 'Shome Luxury có thi công ngoài Hà Nội không?', answer: 'Chúng tôi hỗ trợ tư vấn thiết kế và thi công theo phạm vi công trình. Vui lòng để lại địa điểm để được tư vấn cụ thể.', isVisible: true, order: 3 },
      { question: 'Tôi có thể điều chỉnh thiết kế sau khi nhận phương án không?', answer: 'Có. Đội ngũ sẽ tiếp nhận phản hồi để điều chỉnh phương án trong giai đoạn thiết kế trước khi chốt hồ sơ triển khai.', isVisible: true, order: 4 }
    ],
    isVisible: true
  }
};
