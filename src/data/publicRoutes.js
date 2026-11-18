// Canonical public URLs for every customer-facing menu category.
// Keep the complete menu name in the leaf slug so links remain descriptive.
const PROJECT_CATEGORY_PATHS = Object.freeze({
  'tk-kt-nha-cap-4': '/thiet-ke-kien-truc/thiet-ke-kien-truc-nha-cap-4',
  'tk-kt-nha-pho': '/thiet-ke-kien-truc/thiet-ke-kien-truc-nha-pho',
  'tk-kt-biet-thu': '/thiet-ke-kien-truc/thiet-ke-kien-truc-biet-thu',
  'tk-kt-villa': '/thiet-ke-kien-truc/thiet-ke-kien-truc-villa',
  'tk-nt-chung-cu': '/thiet-ke-noi-that/thiet-ke-noi-that-chung-cu',
  'tk-nt-nha-pho': '/thiet-ke-noi-that/thiet-ke-noi-that-nha-pho',
  'tk-nt-biet-thu': '/thiet-ke-noi-that/thiet-ke-noi-that-biet-thu',
  'tk-nt-van-phong': '/thiet-ke-noi-that/thiet-ke-noi-that-van-phong'
});

const CONSTRUCTION_CATEGORY_PATHS = Object.freeze({
  'tc-kt-nha-cap-4': '/thi-cong-cong-trinh/kien-truc/thi-cong-kien-truc-nha-cap-4',
  'tc-kt-nha-pho': '/thi-cong-cong-trinh/kien-truc/thi-cong-kien-truc-nha-pho',
  'tc-kt-biet-thu': '/thi-cong-cong-trinh/kien-truc/thi-cong-kien-truc-biet-thu',
  'tc-kt-villa': '/thi-cong-cong-trinh/kien-truc/thi-cong-kien-truc-villa',
  'tc-nt-chung-cu': '/thi-cong-cong-trinh/noi-that/thi-cong-noi-that-chung-cu',
  'tc-nt-nha-pho': '/thi-cong-cong-trinh/noi-that/thi-cong-noi-that-nha-pho',
  'tc-nt-biet-thu': '/thi-cong-cong-trinh/noi-that/thi-cong-noi-that-biet-thu',
  'tc-nt-van-phong': '/thi-cong-cong-trinh/noi-that/thi-cong-noi-that-van-phong'
});

const QUOTE_CATEGORY_PATHS = Object.freeze({
  'tk-kt-nha-cap-4': '/bao-gia/thiet-ke-thi-cong-kien-truc/kien-truc-nha-cap-4-tron-goi',
  'tk-kt-nha-pho': '/bao-gia/thiet-ke-thi-cong-kien-truc/kien-truc-nha-pho-tron-goi',
  'tk-kt-biet-thu': '/bao-gia/thiet-ke-thi-cong-kien-truc/kien-truc-biet-thu-tron-goi',
  'tk-kt-villa': '/bao-gia/thiet-ke-thi-cong-kien-truc/kien-truc-villa-tron-goi',
  'tk-nt-chung-cu': '/bao-gia/thiet-ke-thi-cong-noi-that/noi-that-chung-cu-tron-goi',
  'tk-nt-nha-pho': '/bao-gia/thiet-ke-thi-cong-noi-that/noi-that-nha-pho-tron-goi',
  'tk-nt-biet-thu': '/bao-gia/thiet-ke-thi-cong-noi-that/noi-that-biet-thu-tron-goi',
  'tk-nt-van-phong': '/bao-gia/thiet-ke-thi-cong-noi-that/noi-that-van-phong-tron-goi'
});

// Old paths remain routable for existing bookmarks and indexed pages.
const LEGACY_PROJECT_CATEGORY_PATHS = Object.freeze({
  'tk-kt-nha-cap-4': '/thiet-ke-kien-truc/nha-cap-4',
  'tk-kt-nha-pho': '/thiet-ke-kien-truc/nha-pho',
  'tk-kt-biet-thu': '/thiet-ke-kien-truc/biet-thu',
  'tk-kt-villa': '/thiet-ke-kien-truc/villa',
  'tk-nt-chung-cu': '/thiet-ke-noi-that/chung-cu',
  'tk-nt-nha-pho': '/thiet-ke-noi-that/nha-pho',
  'tk-nt-biet-thu': '/thiet-ke-noi-that/biet-thu',
  'tk-nt-van-phong': '/thiet-ke-noi-that/van-phong'
});

const LEGACY_CONSTRUCTION_CATEGORY_PATHS = Object.freeze({
  'tc-kt-nha-cap-4': '/thi-cong-cong-trinh/kien-truc/nha-cap-4',
  'tc-kt-nha-pho': '/thi-cong-cong-trinh/kien-truc/nha-pho',
  'tc-kt-biet-thu': '/thi-cong-cong-trinh/kien-truc/biet-thu',
  'tc-kt-villa': '/thi-cong-cong-trinh/kien-truc/villa',
  'tc-nt-chung-cu': '/thi-cong-cong-trinh/noi-that/chung-cu',
  'tc-nt-nha-pho': '/thi-cong-cong-trinh/noi-that/nha-pho',
  'tc-nt-biet-thu': '/thi-cong-cong-trinh/noi-that/biet-thu',
  'tc-nt-van-phong': '/thi-cong-cong-trinh/noi-that/van-phong'
});

const LEGACY_QUOTE_CATEGORY_PATHS = Object.freeze({
  'tk-kt-nha-cap-4': '/bao-gia/thiet-ke-thi-cong-kien-truc/thiet-ke-kien-truc-nha-cap-4',
  'tk-kt-nha-pho': '/bao-gia/thiet-ke-thi-cong-kien-truc/thiet-ke-kien-truc-nha-pho',
  'tk-kt-biet-thu': '/bao-gia/thiet-ke-thi-cong-kien-truc/thiet-ke-kien-truc-biet-thu',
  'tk-kt-villa': '/bao-gia/thiet-ke-thi-cong-kien-truc/thiet-ke-kien-truc-villa',
  'tk-nt-chung-cu': '/bao-gia/thiet-ke-thi-cong-noi-that/thiet-ke-noi-that-chung-cu',
  'tk-nt-nha-pho': '/bao-gia/thiet-ke-thi-cong-noi-that/thiet-ke-noi-that-nha-pho',
  'tk-nt-biet-thu': '/bao-gia/thiet-ke-thi-cong-noi-that/thiet-ke-noi-that-biet-thu',
  'tk-nt-van-phong': '/bao-gia/thiet-ke-thi-cong-noi-that/thiet-ke-noi-that-van-phong'
});

module.exports = {
  PROJECT_CATEGORY_PATHS,
  CONSTRUCTION_CATEGORY_PATHS,
  QUOTE_CATEGORY_PATHS,
  LEGACY_PROJECT_CATEGORY_PATHS,
  LEGACY_CONSTRUCTION_CATEGORY_PATHS,
  LEGACY_QUOTE_CATEGORY_PATHS
};
