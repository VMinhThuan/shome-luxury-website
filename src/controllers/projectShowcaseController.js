const projectService = require('../services/projectService');
const categoryService = require('../services/categoryService');
const navigationData = require('../data/navigationData');

// Category page configurations
const PAGE_CONFIGS = {
  'thiet-ke-cong-trinh': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'THIẾT KẾ CÔNG TRÌNH',
    titleScript: '',
    description: 'Tuyển tập các công trình kiến trúc & nội thất sang trọng do đội ngũ Luxury Home kiến tạo.',
    categoryCode: 'thiet-ke-cong-trinh',
    filters: []
  },
  'thiet-ke-kien-truc': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'THIẾT KẾ',
    titleScript: 'Kiến Trúc',
    description: 'Sáng tạo giải pháp kiến trúc độc bản, tối ưu ánh sáng tự nhiên và công năng sử dụng theo phong cách Modern Luxury.',
    categoryCode: 'thiet-ke-kien-truc',
    filters: [
      { label: 'Nhà cấp 4', categoryCode: 'tk-kt-nha-cap-4', href: '/thiet-ke-kien-truc/nha-cap-4' },
      { label: 'Nhà phố', categoryCode: 'tk-kt-nha-pho', href: '/thiet-ke-kien-truc/nha-pho' },
      { label: 'Biệt thự', categoryCode: 'tk-kt-biet-thu', href: '/thiet-ke-kien-truc/biet-thu' },
      { label: 'Villa', categoryCode: 'tk-kt-villa', href: '/thiet-ke-kien-truc/villa' }
    ]
  },
  'tk-kt-nha-cap-4': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'KIẾN TRÚC',
    titleScript: 'Nhà Cấp 4',
    description: 'Giải pháp thiết kế kiến trúc nhà cấp 4 hiện đại, tối ưu diện tích và không gian sống tiện nghi.',
    categoryCode: 'tk-kt-nha-cap-4',
    parentCode: 'thiet-ke-kien-truc',
    filters: [
      { label: 'Nhà cấp 4', categoryCode: 'tk-kt-nha-cap-4', href: '/thiet-ke-kien-truc/nha-cap-4' },
      { label: 'Nhà phố', categoryCode: 'tk-kt-nha-pho', href: '/thiet-ke-kien-truc/nha-pho' },
      { label: 'Biệt thự', categoryCode: 'tk-kt-biet-thu', href: '/thiet-ke-kien-truc/biet-thu' },
      { label: 'Villa', categoryCode: 'tk-kt-villa', href: '/thiet-ke-kien-truc/villa' }
    ]
  },
  'tk-kt-nha-pho': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'KIẾN TRÚC',
    titleScript: 'Nhà Phố',
    description: 'Kiến trúc nhà phố hiện đại, tối ưu mặt tiền và lấy sáng thông thoáng cho từng tầng.',
    categoryCode: 'tk-kt-nha-pho',
    parentCode: 'thiet-ke-kien-truc',
    filters: [
      { label: 'Nhà cấp 4', categoryCode: 'tk-kt-nha-cap-4', href: '/thiet-ke-kien-truc/nha-cap-4' },
      { label: 'Nhà phố', categoryCode: 'tk-kt-nha-pho', href: '/thiet-ke-kien-truc/nha-pho' },
      { label: 'Biệt thự', categoryCode: 'tk-kt-biet-thu', href: '/thiet-ke-kien-truc/biet-thu' },
      { label: 'Villa', categoryCode: 'tk-kt-villa', href: '/thiet-ke-kien-truc/villa' }
    ]
  },
  'tk-kt-biet-thu': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'KIẾN TRÚC',
    titleScript: 'Biệt Thự',
    description: 'Đẳng cấp kiến trúc biệt thự uy nghi, không gian sân vườn nghỉ dưỡng sang trọng.',
    categoryCode: 'tk-kt-biet-thu',
    parentCode: 'thiet-ke-kien-truc',
    filters: [
      { label: 'Nhà cấp 4', categoryCode: 'tk-kt-nha-cap-4', href: '/thiet-ke-kien-truc/nha-cap-4' },
      { label: 'Nhà phố', categoryCode: 'tk-kt-nha-pho', href: '/thiet-ke-kien-truc/nha-pho' },
      { label: 'Biệt thự', categoryCode: 'tk-kt-biet-thu', href: '/thiet-ke-kien-truc/biet-thu' },
      { label: 'Villa', categoryCode: 'tk-kt-villa', href: '/thiet-ke-kien-truc/villa' }
    ]
  },
  'tk-kt-villa': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'KIẾN TRÚC',
    titleScript: 'Villa',
    description: 'Thiết kế villa nghỉ dưỡng xa hoa, đường nét kiến trúc tinh tế chuẩn quốc tế.',
    categoryCode: 'tk-kt-villa',
    parentCode: 'thiet-ke-kien-truc',
    filters: [
      { label: 'Nhà cấp 4', categoryCode: 'tk-kt-nha-cap-4', href: '/thiet-ke-kien-truc/nha-cap-4' },
      { label: 'Nhà phố', categoryCode: 'tk-kt-nha-pho', href: '/thiet-ke-kien-truc/nha-pho' },
      { label: 'Biệt thự', categoryCode: 'tk-kt-biet-thu', href: '/thiet-ke-kien-truc/biet-thu' },
      { label: 'Villa', categoryCode: 'tk-kt-villa', href: '/thiet-ke-kien-truc/villa' }
    ]
  },
  'thiet-ke-noi-that': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'THIẾT KẾ',
    titleScript: 'Nội Thất',
    description: 'Không gian sống tinh tế, được kiến tạo từ phong cách và câu chuyện riêng của mỗi gia chủ.',
    categoryCode: 'thiet-ke-noi-that',
    filters: [
      { label: 'Chung cư', categoryCode: 'tk-nt-chung-cu', href: '/thiet-ke-noi-that/chung-cu' },
      { label: 'Nhà phố', categoryCode: 'tk-nt-nha-pho', href: '/thiet-ke-noi-that/nha-pho' },
      { label: 'Biệt thự', categoryCode: 'tk-nt-biet-thu', href: '/thiet-ke-noi-that/biet-thu' },
      { label: 'Văn phòng', categoryCode: 'tk-nt-van-phong', href: '/thiet-ke-noi-that/van-phong' }
    ]
  },
  'tk-nt-chung-cu': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'NỘI THẤT',
    titleScript: 'Chung Cư',
    description: 'Nội thất căn hộ chung cư hiện đại, tối ưu công năng từng phòng chức năng.',
    categoryCode: 'tk-nt-chung-cu',
    parentCode: 'thiet-ke-noi-that',
    filters: [
      { label: 'Chung cư', categoryCode: 'tk-nt-chung-cu', href: '/thiet-ke-noi-that/chung-cu' },
      { label: 'Nhà phố', categoryCode: 'tk-nt-nha-pho', href: '/thiet-ke-noi-that/nha-pho' },
      { label: 'Biệt thự', categoryCode: 'tk-nt-biet-thu', href: '/thiet-ke-noi-that/biet-thu' },
      { label: 'Văn phòng', categoryCode: 'tk-nt-van-phong', href: '/thiet-ke-noi-that/van-phong' }
    ]
  },
  'tk-nt-nha-pho': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'NỘI THẤT',
    titleScript: 'Nhà Phố',
    description: 'Giải pháp nội thất nhà phố ấm cúng, sang trọng và tối ưu luồng thông gió tự nhiên.',
    categoryCode: 'tk-nt-nha-pho',
    parentCode: 'thiet-ke-noi-that',
    filters: [
      { label: 'Chung cư', categoryCode: 'tk-nt-chung-cu', href: '/thiet-ke-noi-that/chung-cu' },
      { label: 'Nhà phố', categoryCode: 'tk-nt-nha-pho', href: '/thiet-ke-noi-that/nha-pho' },
      { label: 'Biệt thự', categoryCode: 'tk-nt-biet-thu', href: '/thiet-ke-noi-that/biet-thu' },
      { label: 'Văn phòng', categoryCode: 'tk-nt-van-phong', href: '/thiet-ke-noi-that/van-phong' }
    ]
  },
  'tk-nt-biet-thu': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'NỘI THẤT',
    titleScript: 'Biệt Thự',
    description: 'Thiết kế nội thất biệt thự xa hoa, khẳng định gu thẩm mỹ thượng lưu của gia chủ.',
    categoryCode: 'tk-nt-biet-thu',
    parentCode: 'thiet-ke-noi-that',
    filters: [
      { label: 'Chung cư', categoryCode: 'tk-nt-chung-cu', href: '/thiet-ke-noi-that/chung-cu' },
      { label: 'Nhà phố', categoryCode: 'tk-nt-nha-pho', href: '/thiet-ke-noi-that/nha-pho' },
      { label: 'Biệt thự', categoryCode: 'tk-nt-biet-thu', href: '/thiet-ke-noi-that/biet-thu' },
      { label: 'Văn phòng', categoryCode: 'tk-nt-van-phong', href: '/thiet-ke-noi-that/van-phong' }
    ]
  },
  'tk-nt-van-phong': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'NỘI THẤT',
    titleScript: 'Văn Phòng',
    description: 'Không gian làm việc chuyên nghiệp, truyền cảm hứng và nâng tầm giá trị thương hiệu.',
    categoryCode: 'tk-nt-van-phong',
    parentCode: 'thiet-ke-noi-that',
    filters: [
      { label: 'Chung cư', categoryCode: 'tk-nt-chung-cu', href: '/thiet-ke-noi-that/chung-cu' },
      { label: 'Nhà phố', categoryCode: 'tk-nt-nha-pho', href: '/thiet-ke-noi-that/nha-pho' },
      { label: 'Biệt thự', categoryCode: 'tk-nt-biet-thu', href: '/thiet-ke-noi-that/biet-thu' },
      { label: 'Văn phòng', categoryCode: 'tk-nt-van-phong', href: '/thiet-ke-noi-that/van-phong' }
    ]
  },
  'thi-cong-cong-trinh': {
    eyebrow: 'DỰ ÁN TIÊU BIỂU',
    titleMain: 'THI CÔNG CÔNG TRÌNH',
    titleScript: '',
    description: 'Dịch vụ thi công kiến trúc & nội thất trọn gói cam kết chất lượng chuẩn 99% so với bản vẽ.',
    categoryCode: 'thi-cong-cong-trinh',
    filters: []
  }
};

class ProjectShowcaseController {
  /**
   * Render Category Showcase Page
   */
  async renderShowcasePage(req, res, next) {
    try {
      const categoryCode = req.params.categoryCode || 'thiet-ke-cong-trinh';
      const config = PAGE_CONFIGS[categoryCode] || PAGE_CONFIGS['thiet-ke-cong-trinh'];

      // SSR fetch initial 4 items (per user request: 4 items per page)
      const initialData = await projectService.getProjects({
        category: categoryCode,
        page: 1,
        limit: 4
      });

      const pageTitle = `${config.titleMain} ${config.titleScript} | LUXURY HOME`.trim();

      return res.render('cong-trinh', {
        title: pageTitle,
        headerSlogan: 'Nâng tầm cuộc sống',
        navigation: navigationData,
        pageConfig: config,
        activeCategoryCode: categoryCode,
        initialProjects: initialData.projects,
        initialPagination: {
          page: initialData.page,
          limit: initialData.limit,
          totalPages: initialData.totalPages,
          totalItems: initialData.totalItems
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Render Project Detail Page
   */
  async renderDetailPage(req, res, next) {
    try {
      const slug = req.params.slug;
      const project = await projectService.getProjectByIdOrSlug(slug);

      if (!project) {
        return res.status(404).render('404', {
          title: '404 - Không Tìm Thấy Dự Án | LUXURY HOME',
          headerSlogan: 'Nâng tầm cuộc sống',
          navigation: navigationData
        });
      }

      // Fetch related projects (same category)
      let relatedProjects = [];
      if (project.categoryIds && project.categoryIds.length > 0) {
        const catId = project.categoryIds[0]._id || project.categoryIds[0];
        const relatedResult = await projectService.getProjects({
          category: catId.toString(),
          page: 1,
          limit: 3
        });
        relatedProjects = relatedResult.projects.filter(p => p.slug !== project.slug).slice(0, 3);
      }

      return res.render('du-an-chi-tiet', {
        title: `${project.title} | LUXURY HOME`,
        headerSlogan: 'Nâng tầm cuộc sống',
        navigation: navigationData,
        project,
        relatedProjects
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProjectShowcaseController();
