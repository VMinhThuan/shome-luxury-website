const PAGE_LABELS = {
  home: 'Trang chủ',
  factory: 'Xưởng sản xuất',
  quote: 'Báo giá',
  news: 'Tin tức',
  recruitment: 'Tuyển dụng',
  booking: 'Đặt lịch tư vấn',
  'project-detail': 'Chi tiết công trình'
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
  ['home', 'why_choose_us', 'why_choose_background', 'Tại sao chọn chúng tôi — Ảnh nền tối', '/images/background/1793129513212_6043215661779559246_6043215661779559246_f2ba52d47d902705547739b26ef66555.jpg'],
  ['home', 'office_team', 'office_team_image', 'Văn phòng & đội ngũ', '/images/office-team-meeting.jpg'],
  ['home', 'home_workshop', 'home_workshop_image', 'Xưởng sản xuất', '/images/factory-worker-shome-v2.png'],
  ['home', 'home_workshop', 'home_workshop_background', 'Xưởng sản xuất — Ảnh nền tối', '/images/background/1793129514232_6043215661779559246_6043215661779559246_a0d8a13c2e77885d913206cf4d4b3b41.jpg'],
  ['home', 'home_faq', 'home_faq_background', 'Câu hỏi thường gặp — Ảnh nền tối', '/images/background/1793129515218_6043215661779559246_6043215661779559246_bb3402190775a313002b3616fddfd2e4.jpg'],
  ['home', 'about_showroom', 'about_showroom_background', 'Về chúng tôi — Ảnh nền tối', '/images/background/1793129512539_6043215661779559246_6043215661779559246_d1b9a620a137ee0b6653f0d3f11cc5a5.jpg'],

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

  // 3. BÁO GIÁ (quote) - all replaceable visual slots
  ['quote', 'hero', 'quote_hero_banner_1', 'Hero — Banner 1 (Chính)', '/images/banner-bao-gia.png'],
  ['quote', 'hero', 'quote_hero_banner_2', 'Hero — Banner 2 (Phòng ngủ)', '/images/booking-hero-banner-bedroom.png'],
  ['quote', 'hero', 'quote_hero_banner_3', 'Hero — Banner 3 (Phòng ăn)', '/images/booking-hero-banner-dining.png'],
  ['quote', 'hero', 'quote_hero_mobile_1', 'Hero mobile — Banner 1', '/images/quote-hero-mobile-living.png'],
  ['quote', 'hero', 'quote_hero_mobile_2', 'Hero mobile — Banner 2', '/images/quote-hero-mobile-bedroom.png'],
  ['quote', 'hero', 'quote_hero_mobile_3', 'Hero mobile — Banner 3', '/images/quote-hero-mobile-dining.png'],
  ['quote', 'benefits', 'quote_benefit_icon_1', 'Lợi ích — Icon 1', '/images/icon-1-baogia.png'],
  ['quote', 'benefits', 'quote_benefit_icon_2', 'Lợi ích — Icon 2', '/images/icon-2-bg.png'],
  ['quote', 'benefits', 'quote_benefit_icon_3', 'Lợi ích — Icon 3', '/images/ic3-bg.png'],
  ['quote', 'pricing', 'quote_pricing_image_1', 'Báo giá tham khảo — Ảnh 1 (Phòng khách)', '/images/quote-pricing-1.png'],
  ['quote', 'pricing', 'quote_pricing_image_2', 'Báo giá tham khảo — Ảnh 2 (Phòng ăn)', '/images/quote-pricing-2.png'],
  ['quote', 'pricing', 'quote_pricing_image_3', 'Báo giá tham khảo — Ảnh 3 (Phòng sinh hoạt)', '/images/quote-pricing-3.png'],
  ['quote', 'capability', 'quote_capability_image', 'Năng lực Shome Luxury — Ảnh xưởng', '/images/factory_workers.jpg'],
  ['quote', 'capability', 'quote_capability_gallery_1', 'Năng lực xưởng — Ảnh 1', '/images/img-xuong-san-xuat/factory-tour-cnc.png'],
  ['quote', 'capability', 'quote_capability_gallery_2', 'Năng lực xưởng — Ảnh 2', '/images/img-xuong-san-xuat/factory-tour-assembly.png'],
  ['quote', 'capability', 'quote_capability_gallery_3', 'Năng lực xưởng — Ảnh 3', '/images/img-xuong-san-xuat/factory-tour-quality-check.png'],
  ['quote', 'capability', 'quote_capability_gallery_4', 'Năng lực xưởng — Ảnh 4', '/images/img-xuong-san-xuat/factory-tour-edge-banding.png'],
  ['quote', 'cta', 'quote_construction_cta_image', 'Báo giá — Section ảnh toàn màn hình', '/images/quote-construction-interior.png'],
  ['quote', 'estimate', 'quote_estimate_image', 'Form nhận dự toán — Ảnh minh họa', '/images/quote-free-estimate-interior.png'],
  ['quote', 'craftsmanship', 'quote_craftsmanship_1', 'Tinh tế từng góc nhỏ — Bề mặt & góc cạnh', '/images/craftsmanship-surface-details-grid.png'],
  ['quote', 'craftsmanship', 'quote_craftsmanship_2', 'Tinh tế từng góc nhỏ — Phụ kiện & chuyển động', '/images/craftsmanship-hardware-details-grid.png'],
  ['quote', 'craftsmanship', 'quote_craftsmanship_3', 'Tinh tế từng góc nhỏ — Lắp đặt & hoàn thiện', '/images/craftsmanship-finishing-details-grid.png'],
  ['quote', 'craftsmanship', 'quote_craftsmanship_4', 'Tinh tế từng góc nhỏ — Kiểm tra & bàn giao', '/images/craftsmanship-final-inspection-details-grid.png'],
  ['quote', 'factory_activities', 'quote_factory_activity_01', 'Hình ảnh hoạt động — 01', '/images/quote-factory-activities/activity-01.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_02', 'Hình ảnh hoạt động — 02', '/images/quote-factory-activities/activity-02.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_03', 'Hình ảnh hoạt động — 03', '/images/quote-factory-activities/activity-03.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_04', 'Hình ảnh hoạt động — 04', '/images/quote-factory-activities/activity-04.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_05', 'Hình ảnh hoạt động — 05', '/images/quote-factory-activities/activity-05.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_06', 'Hình ảnh hoạt động — 06', '/images/quote-factory-activities/activity-06.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_07', 'Hình ảnh hoạt động — 07', '/images/quote-factory-activities/activity-07.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_08', 'Hình ảnh hoạt động — 08', '/images/quote-factory-activities/activity-08.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_09', 'Hình ảnh hoạt động — 09', '/images/quote-factory-activities/activity-09.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_10', 'Hình ảnh hoạt động — 10', '/images/quote-factory-activities/activity-10.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_11', 'Hình ảnh hoạt động — 11', '/images/quote-factory-activities/activity-11.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_12', 'Hình ảnh hoạt động — 12', '/images/quote-factory-activities/activity-12.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_13', 'Hình ảnh hoạt động — 13', '/images/quote-factory-activities/activity-13.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_14', 'Hình ảnh hoạt động — 14', '/images/quote-factory-activities/activity-14.webp'],
  ['quote', 'factory_activities', 'quote_factory_activity_15', 'Hình ảnh hoạt động — 15', '/images/quote-factory-activities/activity-15.webp'],
  ['quote', 'customer_stories', 'quote_feedback_01', 'Khách hàng chia sẻ — Ảnh 01', '/images/feedback/1792222115348_6043215661779559246_6043215661779559246_01b44922101989e305f01bad5accb18d.jpg'],
  ['quote', 'customer_stories', 'quote_feedback_02', 'Khách hàng chia sẻ — Ảnh 02', '/images/feedback/1792222116061_6043215661779559246_6043215661779559246_5125bee0bd4dc54dccea59475e93e70e.jpg'],
  ['quote', 'customer_stories', 'quote_feedback_03', 'Khách hàng chia sẻ — Ảnh 03', '/images/feedback/1792222116666_6043215661779559246_6043215661779559246_43f8098458f4b617f70e0543f424e99c.jpg'],
  ['quote', 'customer_stories', 'quote_feedback_04', 'Khách hàng chia sẻ — Ảnh 04', '/images/feedback/1792222117834_6043215661779559246_6043215661779559246_538359c82f5edaadd11615b29b92b4ee.jpg'],
  ['quote', 'customer_stories', 'quote_feedback_05', 'Khách hàng chia sẻ — Ảnh 05', '/images/feedback/1792222118526_6043215661779559246_6043215661779559246_2b8d5dd9b1bdc6fb1f3c7e477b96d548.jpg'],
  ['quote', 'customer_stories', 'quote_feedback_06', 'Khách hàng chia sẻ — Ảnh 06', '/images/feedback/1792222119213_6043215661779559246_6043215661779559246_cad9e060752cce8d5c76e9f94ccb8b65.jpg'],
  ['quote', 'customer_stories', 'quote_feedback_07', 'Khách hàng chia sẻ — Ảnh 07', '/images/feedback/1792222119987_6043215661779559246_6043215661779559246_fb0bc1d1403b47e6cc49cb513faae79b.jpg'],
  ['quote', 'customer_stories', 'quote_feedback_08', 'Khách hàng chia sẻ — Ảnh 08', '/images/feedback/1792222120845_6043215661779559246_6043215661779559246_ecdfc43fcd12227cfe0033f43f12e196.jpg'],
  ['quote', 'customer_stories', 'quote_feedback_09', 'Khách hàng chia sẻ — Ảnh 09', '/images/feedback/1792222122127_6043215661779559246_6043215661779559246_3b34868292132fdc1c97d45410cc629a.jpg'],
  ['quote', 'customer_stories', 'quote_feedback_10', 'Khách hàng chia sẻ — Ảnh 10', '/images/feedback/1792222123036_6043215661779559246_6043215661779559246_2babcfde9a165d462a5ecea4d8538e0f.jpg'],
  ['quote', 'customer_stories', 'quote_feedback_11', 'Khách hàng chia sẻ — Ảnh 11', '/images/feedback/1792222123788_6043215661779559246_6043215661779559246_7ec6445f346f1b40a77466a09ae5aff5.jpg'],
  // 4. TIN TỨC (news) - 3 banner slots
  ['news', 'hero', 'news_hero_banner_1', 'Tin tức — Banner 1', '/images/hero_sofa_sharp.jpg'],
  ['news', 'hero', 'news_hero_banner_2', 'Tin tức — Banner 2', '/images/hero_interior.jpg'],
  ['news', 'hero', 'news_hero_banner_3', 'Tin tức — Banner 3', '/images/project_apartment.jpg'],

  // 5. TUYỂN DỤNG (recruitment) - 1 slot
  ['recruitment', 'hero', 'recruitment_hero_banner', 'Banner chính trang Tuyển dụng', '/images/recruitment-hero-clean.png'],

  // 6. ĐẶT LỊCH TƯ VẤN (booking) - 4 slots
  ['booking', 'hero', 'booking_hero_banner_1', 'Hero — Banner 1 (Nội thất cao cấp)', '/images/booking-luxury-interior.png'],
  ['booking', 'hero', 'booking_hero_banner_2', 'Hero — Banner 2 (Phòng ngủ sang trọng)', '/images/booking-hero-banner-bedroom.png'],
  ['booking', 'hero', 'booking_hero_banner_3', 'Hero — Banner 3 (Phòng ăn ấm cúng)', '/images/booking-hero-banner-dining.png'],
  ['booking', 'estimate', 'booking_estimate_visual', 'Báo giá chi tiết — Ảnh minh họa dự toán', '/images/booking-estimate-visual.png'],

  // 7. CHI TIẾT CÔNG TRÌNH (project-detail) - 1 slot
  ['project-detail', 'summary', 'project_detail_summary_background', 'Chi tiết công trình — Ảnh nền tiêu đề', '/images/background/1793129513212_6043215661779559246_6043215661779559246_f2ba52d47d902705547739b26ef66555.jpg']
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
