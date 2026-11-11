// Image slots owned by public project/category and quote submenu pages. They are
// kept separate from the legacy six-page list so existing image API clients
// continue to receive the same legacy slots and page counts.
const definitions = [
  ['thiet-ke-cong-trinh', 'Thiết kế công trình', '/thiet-ke-cong-trinh'],
  ['thiet-ke-kien-truc', 'Thiết kế kiến trúc', '/thiet-ke-kien-truc'],
  ['tk-kt-nha-cap-4', 'Thiết kế kiến trúc — Nhà cấp 4', '/thiet-ke-kien-truc/nha-cap-4'],
  ['tk-kt-nha-pho', 'Thiết kế kiến trúc — Nhà phố', '/thiet-ke-kien-truc/nha-pho'],
  ['tk-kt-biet-thu', 'Thiết kế kiến trúc — Biệt thự', '/thiet-ke-kien-truc/biet-thu'],
  ['tk-kt-villa', 'Thiết kế kiến trúc — Villa', '/thiet-ke-kien-truc/villa'],
  ['thiet-ke-noi-that', 'Thiết kế nội thất', '/thiet-ke-noi-that'],
  ['tk-nt-chung-cu', 'Thiết kế nội thất — Chung cư', '/thiet-ke-noi-that/chung-cu'],
  ['tk-nt-nha-pho', 'Thiết kế nội thất — Nhà phố', '/thiet-ke-noi-that/nha-pho'],
  ['tk-nt-biet-thu', 'Thiết kế nội thất — Biệt thự', '/thiet-ke-noi-that/biet-thu'],
  ['tk-nt-van-phong', 'Thiết kế nội thất — Văn phòng', '/thiet-ke-noi-that/van-phong'],
  ['thi-cong-cong-trinh', 'Thi công công trình', '/thi-cong-cong-trinh'],
  ['tc-kt-nha-cap-4', 'Thi công kiến trúc — Nhà cấp 4', '/thi-cong-cong-trinh/kien-truc/nha-cap-4'],
  ['tc-kt-nha-pho', 'Thi công kiến trúc — Nhà phố', '/thi-cong-cong-trinh/kien-truc/nha-pho'],
  ['tc-kt-biet-thu', 'Thi công kiến trúc — Biệt thự', '/thi-cong-cong-trinh/kien-truc/biet-thu'],
  ['tc-kt-villa', 'Thi công kiến trúc — Villa', '/thi-cong-cong-trinh/kien-truc/villa'],
  ['tc-nt-chung-cu', 'Thi công nội thất — Chung cư', '/thi-cong-cong-trinh/noi-that/chung-cu'],
  ['tc-nt-nha-pho', 'Thi công nội thất — Nhà phố', '/thi-cong-cong-trinh/noi-that/nha-pho'],
  ['tc-nt-biet-thu', 'Thi công nội thất — Biệt thự', '/thi-cong-cong-trinh/noi-that/biet-thu'],
  ['tc-nt-van-phong', 'Thi công nội thất — Văn phòng', '/thi-cong-cong-trinh/noi-that/van-phong']
];

const quoteImageDefinitions = [
  ['hero', 'quote_hero_banner_1', 'Hero Banner 1'],
  ['hero', 'quote_hero_banner_2', 'Hero Banner 2'],
  ['hero', 'quote_hero_banner_3', 'Hero Banner 3'],
  ['hero', 'quote_hero_mobile_1', 'Hero mobile 1'],
  ['hero', 'quote_hero_mobile_2', 'Hero mobile 2'],
  ['hero', 'quote_hero_mobile_3', 'Hero mobile 3'],
  ['benefits', 'quote_benefit_icon_1', 'Icon lợi ích 1'],
  ['benefits', 'quote_benefit_icon_2', 'Icon lợi ích 2'],
  ['benefits', 'quote_benefit_icon_3', 'Icon lợi ích 3'],
  ['pricing', 'quote_pricing_image_1', 'Ảnh báo giá 1'],
  ['pricing', 'quote_pricing_image_2', 'Ảnh báo giá 2'],
  ['pricing', 'quote_pricing_image_3', 'Ảnh báo giá 3'],
  ['pricing', 'quote_pricing_mobile_image_1', 'Ảnh báo giá mobile (chỉ dùng cho responsive mobile)'],
  ['cta', 'quote_construction_cta_image', 'Ảnh section thi công nội thất'],
  ['capability', 'quote_capability_image', 'Ảnh chính năng lực xưởng'],
  ['capability', 'quote_capability_gallery_1', 'Ảnh năng lực xưởng 1'],
  ['capability', 'quote_capability_gallery_2', 'Ảnh năng lực xưởng 2'],
  ['capability', 'quote_capability_gallery_3', 'Ảnh năng lực xưởng 3'],
  ['capability', 'quote_capability_gallery_4', 'Ảnh năng lực xưởng 4'],
  ['estimate', 'quote_estimate_image', 'Ảnh form nhận dự toán'],
  ['craftsmanship', 'quote_craftsmanship_1', 'Tinh tế từng góc nhỏ 1'],
  ['craftsmanship', 'quote_craftsmanship_2', 'Tinh tế từng góc nhỏ 2'],
  ['craftsmanship', 'quote_craftsmanship_3', 'Tinh tế từng góc nhỏ 3'],
  ['craftsmanship', 'quote_craftsmanship_4', 'Tinh tế từng góc nhỏ 4'],
  ...Array.from({ length: 15 }, (_, index) => [
    'factory_activities',
    `quote_factory_activity_${String(index + 1).padStart(2, '0')}`,
    `Hình ảnh hoạt động ${String(index + 1).padStart(2, '0')}`
  ]),
  ...Array.from({ length: 11 }, (_, index) => [
    'customer_stories',
    `quote_feedback_${String(index + 1).padStart(2, '0')}`,
    `Khách hàng chia sẻ ${String(index + 1).padStart(2, '0')}`
  ])
];

const quoteDefinitions = [
  ['quote:tk-kt-nha-cap-4', 'Báo giá — Kiến trúc nhà cấp 4 trọn gói', '/bao-gia/thiet-ke-thi-cong-kien-truc/thiet-ke-kien-truc-nha-cap-4'],
  ['quote:tk-kt-nha-pho', 'Báo giá — Kiến trúc nhà phố trọn gói', '/bao-gia/thiet-ke-thi-cong-kien-truc/thiet-ke-kien-truc-nha-pho'],
  ['quote:tk-kt-biet-thu', 'Báo giá — Kiến trúc biệt thự trọn gói', '/bao-gia/thiet-ke-thi-cong-kien-truc/thiet-ke-kien-truc-biet-thu'],
  ['quote:tk-kt-villa', 'Báo giá — Kiến trúc villa trọn gói', '/bao-gia/thiet-ke-thi-cong-kien-truc/thiet-ke-kien-truc-villa'],
  ['quote:tk-nt-chung-cu', 'Báo giá — Nội thất chung cư trọn gói', '/bao-gia/thiet-ke-thi-cong-noi-that/thiet-ke-noi-that-chung-cu'],
  ['quote:tk-nt-nha-pho', 'Báo giá — Nội thất nhà phố trọn gói', '/bao-gia/thiet-ke-thi-cong-noi-that/thiet-ke-noi-that-nha-pho'],
  ['quote:tk-nt-biet-thu', 'Báo giá — Nội thất biệt thự trọn gói', '/bao-gia/thiet-ke-thi-cong-noi-that/thiet-ke-noi-that-biet-thu'],
  ['quote:tk-nt-van-phong', 'Báo giá — Nội thất văn phòng trọn gói', '/bao-gia/thiet-ke-thi-cong-noi-that/thiet-ke-noi-that-van-phong']
];

const baseSubpageSlots = definitions.map(([page_key, page_label, page_path]) => ({
  page_key,
  page_label,
  page_path,
  section_key: 'hero',
  image_key: `subpage_${page_key}_hero_banner`,
  label: `${page_label} — Hero Banner`,
  // Existing project pages did not have a managed hero asset. This default
  // is only the safe baseline; existing custom project/gallery data remains
  // owned by Project and is not migrated or rewritten here.
  image_url: '/images/hero_interior.jpg'
}));

const quoteSubpageSlots = quoteDefinitions.flatMap(([page_key, page_label, page_path]) => quoteImageDefinitions.map(([section_key, parent_image_key, image_label]) => {
  const parent = require('./homeImageSlots').find(slot => slot.image_key === parent_image_key);
  return {
    page_key,
    page_label,
    page_path,
    section_key,
    image_key: `subpage_${page_key.replace(':', '_')}_${parent_image_key}`,
    label: `${page_label} — ${image_label}`,
    // The subpage slot starts with the exact parent default. Its persisted
    // state is independent, while the public page falls back to the parent
    // slot until an admin selects a subpage-specific source.
    image_url: parent?.image_url || '/images/hero_interior.jpg',
    parent_image_key
  };
}));

const subpageSlots = [...baseSubpageSlots, ...quoteSubpageSlots];
const subpageList = [...definitions, ...quoteDefinitions].map(([key, label, path]) => ({ key, label, path }));

module.exports = subpageSlots;
module.exports.subpageSlots = subpageSlots;
module.exports.subpageList = subpageList;
