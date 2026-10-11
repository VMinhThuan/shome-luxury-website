const QuotePage = require('../models/QuotePage');
const quotePageDefaults = require('../data/quotePageDefaults');
const categoryService = require('../services/categoryService');
const projectService = require('../services/projectService');
const navigation = require('../data/navigationData');
const completedVideosData = require('../data/completedVideosData');

class QuotePageController {
  async getContent() {
    let page = await QuotePage.findOne({ key: 'main' }).lean();
    if (!page) {
      page = await QuotePage.create({ key: 'main', sections: quotePageDefaults, isVisible: true });
      return page.toObject();
    }
    const mergeDefaults = (fallback, saved) => {
      if (Array.isArray(fallback)) return (saved || fallback).map((value, index) => mergeDefaults(fallback[index] || {}, value));
      if (fallback && typeof fallback === 'object') {
        const source = saved && typeof saved === 'object' ? saved : {};
        return Object.fromEntries(Object.keys({ ...fallback, ...source }).map(key => [key, mergeDefaults(fallback[key], source[key])]));
      }
      return saved === undefined ? fallback : saved;
    };
    const sections = mergeDefaults(quotePageDefaults, page.sections || {});
    // One-time visual asset migration for the original seed hero. Custom admin URLs are preserved.
    if (['/images/booking-luxury-interior.png', '/images/quote-apartment-hero-v1.png', '/images/quote-apartment-hero-v2.png'].includes(page.sections?.hero?.image)) {
      sections.hero.image = quotePageDefaults.hero.image;
    }
    if (page.sections?.hero?.title === 'Kiến tạo không gian sống' && page.sections?.hero?.script === 'đúng gu, đúng ngân sách') {
      sections.hero.title = quotePageDefaults.hero.title;
      sections.hero.script = quotePageDefaults.hero.script;
    }
    if (page.sections?.hero?.description === 'Shome Luxury đồng hành từ ý tưởng, thiết kế đến thi công hoàn thiện. Nhận dự toán phù hợp với nhu cầu và hiện trạng của riêng bạn.') {
      sections.hero.description = quotePageDefaults.hero.description;
    }
    const isOriginalBenefits = page.sections?.benefits?.items?.every((item, index) => item.title === [
      'Tư vấn đúng nhu cầu', 'Dự toán minh bạch', 'Xưởng sản xuất trực tiếp'
    ][index]);
    if (isOriginalBenefits) sections.benefits.items = quotePageDefaults.benefits.items;
    // Shorten the original construction promise so it stays on one line in
    // the horizontal assurance card without truncating its meaning.
    if (sections.benefits?.items?.[1]?.title === 'Thi công chuẩn chất lượng'
      && ['Đội ngũ giàu kinh nghiệm, quy trình rõ ràng', 'Đội ngũ giàu kinh nghiệm, quy trình chuẩn.'].includes(sections.benefits.items[1].description)) {
      sections.benefits.items[1].description = quotePageDefaults.benefits.items[1].description;
    }
    const isOriginalPricing = page.sections?.pricing?.title === 'Dự toán rõ ràng'
      && page.sections?.pricing?.script === 'để an tâm bắt đầu';
    if (isOriginalPricing) sections.pricing = { ...sections.pricing, ...quotePageDefaults.pricing };
    if (page.sections?.constructionCta?.image === '/images/booking-luxury-interior.png') {
      sections.constructionCta = { ...sections.constructionCta, ...quotePageDefaults.constructionCta };
    }
    if (page.sections?.brandVideo?.image === '/images/booking-luxury-interior.png') {
      sections.brandVideo = { ...sections.brandVideo, ...quotePageDefaults.brandVideo };
    }
    // Replace the previous channel link with the supplied brand-film URL. Custom video links remain untouched.
    if (page.sections?.brandVideo?.videoUrl === 'https://www.youtube.com/channel/UCcW0-8y0EMYZ381uBjcccjA') {
      sections.brandVideo = {
        ...sections.brandVideo,
        videoUrl: quotePageDefaults.brandVideo.videoUrl,
        ctaHref: quotePageDefaults.brandVideo.ctaHref
      };
    }
    if (page.sections?.completed?.title === 'Chạm vào' && page.sections?.completed?.script === 'chất lượng thực tế') {
      sections.completed = { ...sections.completed, ...quotePageDefaults.completed };
    }
    if (page.sections?.capability?.title === 'Một quy trình khép kín') {
      sections.capability = { ...sections.capability, ...quotePageDefaults.capability };
    }
    if (!sections.capability?.videoUrl) {
      sections.capability.videoUrl = quotePageDefaults.capability.videoUrl;
    }
    // Older saved quotation pages contained only three equipment cards.
    // Add the new machine card without replacing any content already managed by admin.
    if ((sections.capability?.gallery || []).length < 4) {
      sections.capability.gallery = [
        ...(sections.capability.gallery || []),
        {
          image: '/images/img-xuong-san-xuat/factory-tour-edge-banding.png',
          title: 'Máy dán cạnh tự động',
          alt: 'Máy dán cạnh tự động tại xưởng nội thất Shome Luxury',
          description: 'Hoàn thiện cạnh tấm gỗ đồng đều, sắc nét và bền đẹp.'
        }
      ];
    }
    if (JSON.stringify(sections) !== JSON.stringify(page.sections)) {
      await QuotePage.updateOne({ _id: page._id }, { $set: { sections } });
      page.sections = sections;
    }
    return page;
  }

  async hydrateCategories(sections) {
    const configured = (sections.categories?.items || []).filter(item => item.isVisible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    return Promise.all(configured.map(async item => {
      const category = await categoryService.getCategoryByIdOrSlug(item.categoryCode);
      if (!category) return null;
      const highlighted = await projectService.getProjects({
        category: category._id.toString(),
        isHighlight: true,
        isVisible: true,
        limit: 4,
        sort: 'highlight'
      });
      const categoryHrefs = {
        'tk-nt-chung-cu': '/thiet-ke-noi-that/chung-cu',
        'tk-nt-nha-pho': '/thiet-ke-noi-that/nha-pho',
        'tk-nt-biet-thu': '/thiet-ke-noi-that/biet-thu',
        'tk-nt-van-phong': '/thiet-ke-noi-that/van-phong',
        'tk-kt-nha-cap-4': '/thiet-ke-kien-truc/nha-cap-4',
        'tk-kt-nha-pho': '/thiet-ke-kien-truc/nha-pho',
        'tk-kt-biet-thu': '/thiet-ke-kien-truc/biet-thu',
        'tk-kt-villa': '/thiet-ke-kien-truc/villa'
      };
      return { ...item, category, href: categoryHrefs[category.code] || '/thiet-ke-cong-trinh', projects: highlighted.projects.slice(0, 4) };
    })).then(items => items.filter(Boolean));
  }

  async getHighlightedProjects() {
    const highlighted = await projectService.getProjects({
      category: 'tk-nt-chung-cu',
      isHighlight: true,
      isVisible: true,
      limit: 3,
      sort: 'highlight'
    });
    return highlighted.projects;
  }

  async renderPage(req, res, next) {
    try {
      const quotePage = await this.getContent();
      if (!quotePage.isVisible) return res.status(404).render('404', { title: 'Không tìm thấy trang | SHOME LUXURY', navigation });
      const rawCategory = (req.query.category || '').trim();
      const selectedCategory = rawCategory ? await categoryService.getCategoryByIdOrSlug(rawCategory) : null;
      if (!selectedCategory) {
        return res.redirect('/');
      }
      const sections = quotePage.sections || quotePageDefaults;
      const highlightProjects = await this.getHighlightedProjects();
      const selectedName = selectedCategory?.name?.replace(/^Thiết kế\s+/i, '') || '';
      const isInterior = /^nội thất\b/i.test(selectedName);
      const quoteTitle = `${selectedName.replace(/^(nội thất|kiến trúc)\s+/i, '')} trọn gói`;
      const quoteScript = isInterior ? 'Nội thất' : 'Kiến trúc';
      return res.render('bao-gia', {
        title: `${selectedCategory?.name ? `Báo giá ${selectedCategory.name.toLowerCase()}` : 'Báo giá thiết kế & thi công'} | SHOME LUXURY`,
        navigation,
        sections,
        highlightProjects,
        selectedCategory,
        categoryQuery: rawCategory,
        quoteTitle,
        quoteScript,
        completedVideosData
      });
    } catch (error) { next(error); }
  }

  renderAdminLoginPage(req, res) {
    return res.render('admin-bao-gia', { title: 'Đăng nhập quản trị | SHOME LUXURY', isAuthenticated: false });
  }

  renderAdminPage(req, res) {
    return res.render('admin-bao-gia', { title: 'Quản trị Báo giá | SHOME LUXURY', isAuthenticated: true });
  }

  async getPublicContent(req, res, next) {
    try { return res.json({ success: true, data: await this.getContent() }); } catch (error) { next(error); }
  }

  async updateContent(req, res, next) {
    try {
      const sections = req.body.sections || req.body;
      const page = await QuotePage.findOneAndUpdate({ key: 'main' }, { $set: { sections, isVisible: req.body.isVisible !== false } }, { new: true, upsert: true, runValidators: true });
      return res.json({ success: true, data: page });
    } catch (error) { next(error); }
  }
}

module.exports = new QuotePageController();
