// These are the editorial 16:9 image slots currently used in the homepage.
// Partner logos and customer-message screenshots intentionally stay outside
// this list because their existing display ratios are not 16:9.
module.exports = [
  ['hero', 'hero_banner_1', 'Hero — Banner 1', '/images/home-hero-banner.jpg'],
  ['hero', 'hero_banner_2', 'Hero — Banner 2', '/images/home-hero-banner-2.jpg'],
  ['hero', 'hero_banner_3', 'Hero — Banner 3', '/images/home-hero-banner-3.jpg'],
  ['about_showroom', 'about_showroom_image', 'Về chúng tôi — Showroom', '/images/showroom-shome-luxury.jpg'],
  ['project_types', 'project_type_apartment', 'Loại công trình — Chung cư', '/images/project-cat-chung-cu-v2.png'],
  ['project_types', 'project_type_townhouse', 'Loại công trình — Nhà phố', '/images/project-cat-nha-pho.jpg'],
  ['project_types', 'project_type_villa', 'Loại công trình — Biệt thự', '/images/project-cat-biet-thu.jpg'],
  ['project_types', 'project_type_office', 'Loại công trình — Văn phòng', '/images/project-cat-van-phong.jpg'],
  ['why_choose_us', 'why_choose_architect', 'Tại sao chọn chúng tôi — Kiến trúc sư', '/images/why-choose-architect-v2.webp'],
  ['why_choose_us', 'why_choose_warranty', 'Tại sao chọn chúng tôi — Bảo hành', '/images/why-choose-warranty-v2.webp'],
  ['why_choose_us', 'why_choose_craftsman', 'Tại sao chọn chúng tôi — Thợ lành nghề', '/images/why-choose-craftsman-v2.webp'],
  ['why_choose_us', 'why_choose_pricing', 'Tại sao chọn chúng tôi — Giá cả', '/images/why-choose-pricing-v2.webp'],
  ['office_team', 'office_team_image', 'Văn phòng & đội ngũ', '/images/office-team-meeting.jpg'],
  ['home_workshop', 'home_workshop_image', 'Xưởng sản xuất', '/images/factory-worker-shome-v2.png']
].map(([section_key, image_key, label, image_url]) => ({ section_key, image_key, label, image_url }));
