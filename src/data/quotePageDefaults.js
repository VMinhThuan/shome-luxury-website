module.exports = {
  hero: {
    eyebrow: 'BÁO GIÁ THIẾT KẾ & THI CÔNG',
    title: 'Chung cư trọn gói',
    script: 'Nội thất',
    description: 'Kiến tạo không gian sống thượng lưu với dấu ấn riêng của bạn.',
    image: '/images/banner-bao-gia.png',
    traits: ['Tinh tế', 'Đẳng cấp', 'Khác biệt'],
    cornerScript: 'Không gian\nkiến tạo hạnh phúc',
    ctaLabel: 'Nhận dự toán miễn phí',
    ctaHref: '#nhan-du-toan',
    isVisible: true
  },
  benefits: {
    title: 'Chúng tôi mang đến',
    script: 'nhiều hơn một báo giá',
    description: 'Một phương án rõ ràng để bạn chủ động quyết định cho tổ ấm của mình.',
    items: [
      { title: 'Thiết kế chuyên nghiệp', description: 'Ý tưởng tinh tế, tối ưu từng chi tiết', icon: 'design', isVisible: true },
      { title: 'Thi công chuẩn chất lượng', description: 'Đội ngũ lành nghề, quy trình chuẩn.', icon: 'construction', isVisible: true },
      { title: 'Bảo hành 5 năm', description: 'Cam kết bền đẹp, đồng hành dài lâu', icon: 'warranty', isVisible: true }
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
    title: 'Kiến tạo không gian sống theo cách riêng',
    description: 'Kiến tạo không gian sống thượng lưu',
    image: '/images/Luxury Interior with Golden Wave Accents.png',
    videoUrl: 'https://www.youtube.com/watch?v=hoUvh1w9tII',
    caption: 'Giới thiệu về Shome Luxury',
    duration: '02:15',
    ctaLabel: 'Xem trên YouTube',
    ctaHref: 'https://www.youtube.com/watch?v=hoUvh1w9tII',
    isVisible: true
  },
  capability: {
    eyebrow: 'Xưởng sản xuất',
    title: 'Trực tiếp',
    script: '',
    description: 'Quy mô trên 2000m² - Chủ động chất lượng và tiến độ.',
    image: '/images/factory_workers.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=hoUvh1w9tII',
    caption: 'Xưởng sản xuất Shome Luxury - Đơn vị thiết kế thi công tại Hà Nội',
    stats: [
      { value: '2000m²', label: 'Diện tích xưởng' },
      { value: '50+', label: 'Nhân sự lành nghề' },
      { value: '1000+', label: 'Sản phẩm/năm' }
    ],
    gallery: [
      { image: '/images/img-xuong-san-xuat/factory-tour-cnc.png', title: 'Máy móc hiện đại', alt: 'Máy móc hiện đại tại xưởng' },
      { image: '/images/img-xuong-san-xuat/factory-tour-assembly.png', title: 'Sản xuất trực tiếp', alt: 'Khu vực sản xuất trực tiếp' },
      { image: '/images/img-xuong-san-xuat/factory-tour-quality-check.png', title: 'Kiểm soát chất lượng', alt: 'Kiểm soát chất lượng nội thất' },
      { image: '/images/img-xuong-san-xuat/factory-tour-edge-banding.png', title: 'Máy dán cạnh tự động', alt: 'Máy dán cạnh tự động tại xưởng nội thất Shome Luxury', description: 'Hoàn thiện cạnh tấm gỗ đồng đều, sắc nét và bền đẹp.' }
    ],
    isVisible: true
  },
  completed: {
    eyebrow: 'Thước phim thực tế',
    title: 'Công trình',
    script: 'hoàn thiện',
    description: 'Ghi lại không gian thực tế sau khi hoàn tất thi công.',
    gallery: [
      { image: '/images/completed-project-living-room.png', alt: 'Căn hộ 1 phòng ngủ hiện đại ấm cúng', title: 'Hiện đại & ấm cúng', location: 'Vinhomes Ocean Park', isVisible: true, order: 1 },
      { image: '/images/service_interior.jpg', alt: 'Căn hộ 2 phòng ngủ tinh tế tiện nghi', title: 'Tinh tế & tiện nghi', location: 'Masteri Centre Point', isVisible: true, order: 2 },
      { image: '/images/hero_sofa_light.jpg', alt: 'Căn hộ 3 phòng ngủ rộng rãi đẳng cấp', title: 'Rộng rãi & đẳng cấp', location: 'Royal City', isVisible: true, order: 3 },
      { image: '/images/project_villa.jpg', alt: 'Không gian nội thất hoàn thiện', title: 'Đẳng cấp & tinh tế', location: 'Hà Nội', isVisible: true, order: 4 }
    ],
    isVisible: true
  },
  pricing: {
    eyebrow: 'BÁO GIÁ THAM KHẢO',
    title: 'Thiết kế thi công nội thất',
    script: 'Chung cư',
    description: 'Minh bạch chi phí - Tối ưu ngân sách - Hiệu quả vượt mong đợi',
    items: [
      { number: '01', title: 'Chung cư 1 ngủ', price: '55 triệu', area: '< 70m²', description: 'Thiết kế trọn gói', image: '/images/anh_san_pham_1.png', ctaLabel: 'Nhận tư vấn', ctaHref: '#nhan-du-toan', isVisible: true, order: 1 },
      { number: '02', title: 'Chung cư 2 ngủ', price: '90 triệu', area: '= 70 - 100m²', description: 'Thiết kế trọn gói', image: '/images/anh_san_pham_2.png', ctaLabel: 'Nhận tư vấn', ctaHref: '#nhan-du-toan', isVisible: true, order: 2 },
      { number: '03', title: 'Chung cư 3 ngủ', price: '125 triệu', area: '> 100m²', description: 'Thiết kế trọn gói', image: '/images/anh_san_pham_3.png', ctaLabel: 'Nhận tư vấn', ctaHref: '#nhan-du-toan', isVisible: true, order: 3 }
    ],
    isVisible: true
  },
  constructionCta: {
    eyebrow: 'THI CÔNG NỘI THẤT',
    title: 'Miễn phí thiết kế',
    description: 'Khi ký hợp đồng thi công trọn gói',
    image: '/images/quote-construction-interior.png',
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
