const PAGE_LABELS = {
  home: 'Trang chủ',
  factory: 'Xưởng sản xuất',
  quote: 'Báo giá',
  news: 'Tin tức',
  recruitment: 'Tuyển dụng',
  booking: 'Đặt lịch tư vấn'
};

const rawSlots = [
  // 1. TRANG CHỦ (home) - 14 slots
  ['home', 'hero', 'hero_banner_1', 'Hero — Banner 1', '/images/home-hero-banner.jpg'],
  ['home', 'hero', 'hero_banner_2', 'Hero — Banner 2', '/images/home-hero-banner-2.jpg'],
  ['home', 'hero', 'hero_banner_3', 'Hero — Banner 3', '/images/home-hero-banner-3.jpg'],
  ['home', 'about_showroom', 'about_showroom_image', 'Về chúng tôi — Showroom', '/images/showroom-shome-luxury.jpg'],
  ['home', 'project_types', 'project_type_apartment', 'Loại công trình — Chung cư', '/images/project-cat-chung-cu-v2.png'],
  ['home', 'project_types', 'project_type_townhouse', 'Loại công trình — Nhà phố', '/images/project-cat-nha-pho.jpg'],
  ['home', 'project_types', 'project_type_villa', 'Loại công trình — Biệt thự', '/images/project-cat-biet-thu.jpg'],
  ['home', 'project_types', 'project_type_office', 'Loại công trình — Văn phòng', '/images/project-cat-van-phong.jpg'],
  ['home', 'why_choose_us', 'why_choose_architect', 'Tại sao chọn chúng tôi — Kiến trúc sư', '/images/why-choose-architect-v2.webp'],
  ['home', 'why_choose_us', 'why_choose_warranty', 'Tại sao chọn chúng tôi — Bảo hành', '/images/why-choose-warranty-v2.webp'],
  ['home', 'why_choose_us', 'why_choose_craftsman', 'Tại sao chọn chúng tôi — Thợ lành nghề', '/images/why-choose-craftsman-v2.webp'],
  ['home', 'why_choose_us', 'why_choose_pricing', 'Tại sao chọn chúng tôi — Giá cả', '/images/why-choose-pricing-v2.webp'],
  ['home', 'why_choose_us', 'why_choose_background', 'Tại sao chọn chúng tôi — Ảnh nền (giao diện sáng)', '/images/home-why-choose-background.png'],
  ['home', 'office_team', 'office_team_image', 'Văn phòng & đội ngũ', '/images/office-team-meeting.jpg'],
  ['home', 'home_workshop', 'home_workshop_image', 'Xưởng sản xuất', '/images/factory-worker-shome-v2.png'],
  ['home', 'home_workshop', 'home_workshop_background', 'Xưởng sản xuất — Ảnh nền (giao diện tối)', '/images/home-workshop-background.png'],
  ['home', 'home_faq', 'home_faq_background', 'Câu hỏi thường gặp — Ảnh nền (giao diện sáng)', '/images/home-faq-background.png'],
  ['home', 'about_showroom', 'about_showroom_background', 'Về chúng tôi — Ảnh nền (giao diện tối)', '/images/home-about-background.png'],

  // 2. XƯỞNG SẢN XUẤT (factory) - 21 slots
  ['factory', 'hero', 'factory_hero_banner_1', 'Hero — Banner 1 (Máy CNC)', '/images/factory_cnc.jpg'],
  ['factory', 'hero', 'factory_hero_banner_2', 'Hero — Banner 2 (Hệ thống CNC)', '/images/cnc_machine.jpg'],
  ['factory', 'hero', 'factory_hero_banner_3', 'Hero — Banner 3 (Máy khoan & thợ)', '/images/drill_machine.jpg'],
  ['factory', 'video', 'factory_video_thumb', 'Quy trình sản xuất — Ảnh đại diện video', '/images/sanxuat/1790821107047_6043215661779559246_6043215661779559246_12e6fb8d5bd86d38262d68c3ac2b66c2.jpg'],
  ['factory', 'capacity', 'factory_equip_1', 'Trang thiết bị 01 — Máy cắt CNC', '/images/cnc_machine.jpg'],
  ['factory', 'capacity', 'factory_equip_2', 'Trang thiết bị 02 — Dây chuyền tự động', '/images/auto_line.jpg'],
  ['factory', 'capacity', 'factory_equip_3', 'Trang thiết bị 03 — Máy khoan phay', '/images/drill_machine.jpg'],
  ['factory', 'capacity', 'factory_equip_4', 'Trang thiết bị 04 — Máy dán cạnh', '/images/edge_banding.jpg'],
  ['factory', 'detail', 'factory_detail_image', 'Chỉnh chu chi tiết — Ảnh không gian', '/images/img-xuong-san-xuat/chinh-chu-chi-tiet.png'],
  ['factory', 'tour', 'factory_tour_1', 'Một vòng quanh xưởng — Bước 1: Lưu trữ vật liệu', '/images/img-xuong-san-xuat/factory-tour-storage.png'],
  ['factory', 'tour', 'factory_tour_2', 'Một vòng quanh xưởng — Bước 2: Gia công chi tiết', '/images/img-xuong-san-xuat/factory-tour-cnc.png'],
  ['factory', 'tour', 'factory_tour_3', 'Một vòng quanh xưởng — Bước 3: Lắp thử & đối chiếu', '/images/img-xuong-san-xuat/factory-tour-assembly.png'],
  ['factory', 'tour', 'factory_tour_4', 'Một vòng quanh xưởng — Bước 4: Kiểm tra xuất xưởng', '/images/img-xuong-san-xuat/factory-tour-quality-check.png'],
  ['factory', 'renovation', 'factory_reno_living_before', 'Hiện trạng đến hoàn thiện — Phòng khách (Trước)', '/images/img-xuong-san-xuat/renovation-living-before.png'],
  ['factory', 'renovation', 'factory_reno_living_after', 'Hiện trạng đến hoàn thiện — Phòng khách (Sau)', '/images/img-xuong-san-xuat/renovation-living-after.png'],
  ['factory', 'renovation', 'factory_reno_office_before', 'Hiện trạng đến hoàn thiện — Phòng làm việc (Trước)', '/images/img-xuong-san-xuat/renovation-office-before.png'],
  ['factory', 'renovation', 'factory_reno_office_after', 'Hiện trạng đến hoàn thiện — Phòng làm việc (Sau)', '/images/img-xuong-san-xuat/renovation-office-after.png'],
  ['factory', 'renovation', 'factory_reno_bath_before', 'Hiện trạng đến hoàn thiện — Phòng tắm (Trước)', '/images/img-xuong-san-xuat/renovation-bathroom-before.png'],
  ['factory', 'renovation', 'factory_reno_bath_after', 'Hiện trạng đến hoàn thiện — Phòng tắm (Sau)', '/images/img-xuong-san-xuat/renovation-bathroom-after.png'],
  ['factory', 'renovation', 'factory_reno_bed_before', 'Hiện trạng đến hoàn thiện — Phòng ngủ (Trước)', '/images/img-xuong-san-xuat/renovation-bedroom-before.png'],
  ['factory', 'renovation', 'factory_reno_bed_after', 'Hiện trạng đến hoàn thiện — Phòng ngủ (Sau)', '/images/img-xuong-san-xuat/renovation-bedroom-after.png'],

  // 3. BÁO GIÁ (quote) - 7 slots
  ['quote', 'hero', 'quote_hero_banner_1', 'Hero — Banner 1 (Chính)', '/images/banner-bao-gia.png'],
  ['quote', 'hero', 'quote_hero_banner_2', 'Hero — Banner 2 (Phòng ngủ)', '/images/booking-hero-banner-bedroom.png'],
  ['quote', 'hero', 'quote_hero_banner_3', 'Hero — Banner 3 (Phòng ăn)', '/images/booking-hero-banner-dining.png'],
  ['quote', 'brand_video', 'quote_brand_video_thumb', 'Video thương hiệu — Ảnh bìa', '/images/Luxury Interior with Golden Wave Accents.png'],
  ['quote', 'capability', 'quote_capability_image', 'Năng lực Shome Luxury — Ảnh xưởng', '/images/factory_workers.jpg'],
  ['quote', 'cta', 'quote_construction_cta_image', 'CTA Thi công nội thất — Ảnh nền', '/images/banner-bao-gia.png'],
  ['quote', 'estimate', 'quote_estimate_image', 'Form nhận dự toán — Ảnh minh họa', '/images/quote-free-estimate-interior.png'],

  // 4. TIN TỨC (news) - 1 slot
  ['news', 'hero', 'news_hero_banner', 'Banner chính trang Tin tức', '/images/hero_sofa_sharp.jpg'],

  // 5. TUYỂN DỤNG (recruitment) - 1 slot
  ['recruitment', 'hero', 'recruitment_hero_banner', 'Banner chính trang Tuyển dụng', '/images/recruitment-hero-clean.png'],

  // 6. ĐẶT LỊCH TƯ VẤN (booking) - 4 slots
  ['booking', 'hero', 'booking_hero_banner_1', 'Hero — Banner 1 (Nội thất cao cấp)', '/images/booking-luxury-interior.png'],
  ['booking', 'hero', 'booking_hero_banner_2', 'Hero — Banner 2 (Phòng ngủ sang trọng)', '/images/booking-hero-banner-bedroom.png'],
  ['booking', 'hero', 'booking_hero_banner_3', 'Hero — Banner 3 (Phòng ăn ấm cúng)', '/images/booking-hero-banner-dining.png'],
  ['booking', 'estimate', 'booking_estimate_visual', 'Báo giá chi tiết — Ảnh minh họa dự toán', '/images/booking-estimate-visual.png']
];

const allSlots = rawSlots.map(([page_key, section_key, image_key, label, image_url]) => ({
  page_key,
  page_label: PAGE_LABELS[page_key] || page_key,
  section_key,
  image_key,
  label,
  image_url
}));

module.exports = allSlots;
module.exports.allSlots = allSlots;
module.exports.PAGE_LABELS = PAGE_LABELS;
