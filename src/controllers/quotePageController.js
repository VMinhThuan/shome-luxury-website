const QuotePage = require('../models/QuotePage');
const quotePageDefaults = require('../data/quotePageDefaults');
const categoryService = require('../services/categoryService');
const projectService = require('../services/projectService');
const navigation = require('../data/navigationData');

class QuotePageController {
  async getContent() {
    return QuotePage.findOneAndUpdate(
      { key: 'main' },
      { $setOnInsert: { key: 'main', sections: quotePageDefaults, isVisible: true } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
  }

  async hydrateCategories(sections) {
    const configured = (sections.categories?.items || []).filter(item => item.isVisible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
    return Promise.all(configured.map(async item => {
      const category = await categoryService.getCategoryByIdOrSlug(item.categoryCode);
      if (!category) return null;
      const highlighted = await projectService.getProjects({ category: category._id.toString(), isHighlight: true, limit: 4, sort: 'highlight' });
      // Existing installations used `featured`; retain it as a migration-safe fallback.
      const fallback = highlighted.projects.length ? highlighted : await projectService.getProjects({ category: category._id.toString(), featured: true, limit: 4 });
      return { ...item, category, projects: fallback.projects.slice(0, 4) };
    })).then(items => items.filter(Boolean));
  }

  async renderPage(req, res, next) {
    try {
      const quotePage = await this.getContent();
      if (!quotePage.isVisible) return res.status(404).render('404', { title: 'Không tìm thấy trang | SHOME LUXURY', navigation });
      const sections = quotePage.sections || quotePageDefaults;
      const quoteCategories = await this.hydrateCategories(sections);
      return res.render('bao-gia', {
        title: 'Báo giá thiết kế & thi công | SHOME LUXURY',
        navigation,
        sections,
        quoteCategories
      });
    } catch (error) { next(error); }
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
