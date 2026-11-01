const mongoose = require('mongoose');
const Project = require('../models/Project');
const projectService = require('../services/projectService');
const categoryService = require('../services/categoryService');
const careerService = require('../services/careerService');
const articleService = require('../services/articleService');

const MODULES = {
  'design-projects': {
    label: 'Thiết kế công trình',
    kind: 'project',
    root: 'thiet-ke-cong-trinh',
    publicPath: project => `/cong-trinh/${encodeURIComponent(project.slug)}`
  },
  'construction-projects': {
    label: 'Thi công công trình',
    kind: 'project',
    root: 'thi-cong-cong-trinh',
    publicPath: project => `/cong-trinh/${encodeURIComponent(project.slug)}`
  },
  careers: {
    label: 'Tuyển dụng',
    kind: 'career',
    publicPath: career => `/tuyen-dung/${encodeURIComponent(career.id || career.slug)}`
  },
  articles: {
    label: 'Tin tức',
    kind: 'article',
    publicPath: article => `/tin-tuc/${encodeURIComponent(article.id || article.slug)}`
  }
};

function getModule(name) {
  const module = MODULES[name];
  if (!module) throw Object.assign(new Error('Module quản trị không tồn tại.'), { status: 404 });
  return module;
}

function plainProject(project) {
  return { ...project, id: String(project._id || project.id || '') };
}

async function validateConstructionRelation(module, input) {
  if (module.root !== 'thi-cong-cong-trinh' || input.designProjectId === undefined) return;
  if (!input.designProjectId) { input.designProjectId = null; return; }
  if (!mongoose.Types.ObjectId.isValid(input.designProjectId) || !(await Project.exists({ _id: input.designProjectId }))) {
    throw Object.assign(new Error('Công trình thiết kế liên kết không tồn tại.'), { status: 400 });
  }
}

async function getProjectCategories(root) {
  const tree = await categoryService.getCategoryTree();
  const rootNode = tree.find(category => category.code === root || category.slug === root);
  return rootNode ? [rootNode] : [];
}

async function listModule(req, res, next) {
  try {
    const module = getModule(req.params.module);
    if (module.kind === 'project') {
      const result = await projectService.getProjects({
        ...req.query,
        status: req.query.status || 'all',
        category: req.query.category || module.root,
        includeHidden: true,
        compact: false,
        limit: req.query.limit || 20
      });
      return res.json({
        success: true,
        module: req.params.module,
        data: result.projects.map(plainProject),
        categories: await getProjectCategories(module.root),
        pagination: { page: result.page, limit: result.limit, totalPages: result.totalPages, totalItems: result.totalItems }
      });
    }
    const service = module.kind === 'career' ? careerService : articleService;
    const result = await service.list({ ...req.query, status: req.query.status || 'all' });
    const categories = [...new Set(result.rows.map(row => row.category).filter(Boolean))];
    return res.json({
      success: true,
      module: req.params.module,
      data: result.rows,
      categories,
      pagination: { page: result.page, limit: result.limit, totalPages: result.totalPages, totalItems: result.totalItems }
    });
  } catch (error) { next(error); }
}

async function getModuleItem(req, res, next) {
  try {
    const module = getModule(req.params.module);
    let item;
    if (module.kind === 'project') item = await projectService.getProjectByIdOrSlug(req.params.id, { includeHidden: true });
    else item = await (module.kind === 'career' ? careerService : articleService).find(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Nội dung không tồn tại.' });
    return res.json({ success: true, data: plainProject(item) });
  } catch (error) { next(error); }
}

async function createModule(req, res, next) {
  try {
    const module = getModule(req.params.module);
    let item;
    if (module.kind === 'project') {
      const input = { ...req.body };
      if (input.categoryIds && !Array.isArray(input.categoryIds)) input.categoryIds = [input.categoryIds];
      await validateConstructionRelation(module, input);
      item = await projectService.createProject(input);
    } else {
      item = await (module.kind === 'career' ? careerService : articleService).create(req.body);
    }
    return res.status(201).json({ success: true, message: `Đã thêm ${module.label.toLowerCase()}.`, data: plainProject(item) });
  } catch (error) { next(error); }
}

async function updateModule(req, res, next) {
  try {
    const module = getModule(req.params.module);
    let item;
    if (module.kind === 'project') {
      const input = { ...req.body };
      if (input.categoryIds && !Array.isArray(input.categoryIds)) input.categoryIds = [input.categoryIds];
      await validateConstructionRelation(module, input);
      item = await projectService.updateProject(req.params.id, input);
    } else {
      item = await (module.kind === 'career' ? careerService : articleService).update(req.params.id, req.body);
    }
    return res.json({ success: true, message: 'Đã lưu thay đổi.', data: plainProject(item) });
  } catch (error) { next(error); }
}

async function deleteModule(req, res, next) {
  try {
    const module = getModule(req.params.module);
    if (module.kind === 'project') await projectService.deleteProject(req.params.id);
    else await (module.kind === 'career' ? careerService : articleService).remove(req.params.id);
    return res.json({ success: true, message: 'Đã xóa nội dung.' });
  } catch (error) { next(error); }
}

async function setPublication(req, res, next) {
  try {
    const module = getModule(req.params.module);
    const isPublished = req.body.published !== false && req.body.published !== 'false';
    const input = { isPublished, status: isPublished ? 'published' : 'draft' };
    if (module.kind === 'project') await projectService.updateProject(req.params.id, input);
    else await (module.kind === 'career' ? careerService : articleService).update(req.params.id, input);
    return res.json({ success: true, message: isPublished ? 'Đã xuất bản nội dung.' : 'Đã chuyển thành bản nháp.' });
  } catch (error) { next(error); }
}

async function duplicateModule(req, res, next) {
  try {
    const module = getModule(req.params.module);
    if (module.kind === 'project') {
      const source = await projectService.getProjectByIdOrSlug(req.params.id, { includeHidden: true });
      if (!source) return res.status(404).json({ success: false, message: 'Nội dung không tồn tại.' });
      const copy = { ...source, _id: undefined, id: undefined, title: `${source.title} (Bản sao)`, slug: `${source.slug}-copy-${Date.now()}`, status: 'draft', isPublished: false };
      const item = await projectService.createProject(copy);
      return res.status(201).json({ success: true, data: plainProject(item) });
    }
    const service = module.kind === 'career' ? careerService : articleService;
    const source = await service.find(req.params.id);
    if (!source) return res.status(404).json({ success: false, message: 'Nội dung không tồn tại.' });
    const { _id, id, createdAt, updatedAt, legacyId, ...copy } = source;
    copy.title = `${source.title} (Bản sao)`;
    copy.slug = `${source.slug}-copy-${Date.now()}`;
    copy.isPublished = false;
    copy.status = 'draft';
    const item = await service.create(copy);
    return res.status(201).json({ success: true, data: item });
  } catch (error) { next(error); }
}

async function renderPage(req, res, next) {
  try {
    const module = getModule(req.params.module || 'design-projects');
    return res.render('admin-content', {
      title: `Quản lý ${module.label.toLowerCase()} | SHOME LUXURY`,
      currentModule: req.params.module || 'design-projects',
      currentModuleLabel: module.label
    });
  } catch (error) { next(error); }
}

async function getPublicCareers(req, res, next) {
  try {
    const result = await careerService.list({ public: true, limit: 100 });
    return res.json({ success: true, count: result.totalItems, data: result.rows });
  } catch (error) { next(error); }
}

async function getPublicCareer(req, res, next) {
  try {
    const row = await careerService.find(req.params.id, { public: true });
    if (!row) return res.status(404).json({ success: false, message: 'Tin tuyển dụng không tồn tại.' });
    return res.json({ success: true, data: row });
  } catch (error) { next(error); }
}

async function getPublicArticles(req, res, next) {
  try {
    const result = await articleService.list({ public: true, limit: 100 });
    return res.json({ success: true, count: result.totalItems, data: result.rows });
  } catch (error) { next(error); }
}

async function getPublicArticle(req, res, next) {
  try {
    const row = await articleService.find(req.params.id, { public: true });
    if (!row) return res.status(404).json({ success: false, message: 'Bài viết không tồn tại.' });
    return res.json({ success: true, data: row });
  } catch (error) { next(error); }
}

module.exports = {
  MODULES,
  renderPage,
  listModule,
  getModuleItem,
  createModule,
  updateModule,
  deleteModule,
  setPublication,
  duplicateModule,
  getPublicCareers,
  getPublicCareer,
  getPublicArticles,
  getPublicArticle
};
