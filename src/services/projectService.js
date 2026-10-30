const Project = require('../models/Project');
const categoryService = require('./categoryService');
const { destroyCloudinaryImage } = require('../utils/cloudinary');
const mongoose = require('mongoose');

const PROJECT_FIELDS = [
  'title', 'slug', 'investor', 'clientName', 'location', 'area', 'cost',
  'propertyType', 'style', 'excerpt', 'content', 'status', 'featured',
  'isHighlight', 'highlightOrder', 'isVisible', 'isPublished', 'sortOrder',
  'categoryIds', 'thumbnail', 'thumbnailPublicId', 'gallery', 'galleryItems'
];

const slugify = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 180);

const asPlainObject = (value) => {
  if (!value) return {};
  if (typeof value.toObject === 'function') return value.toObject();
  return { ...value };
};

const normalizeGallery = (project) => {
  const sourceItems = Array.isArray(project.galleryItems) ? project.galleryItems : [];
  const sourceUrls = Array.isArray(project.gallery) ? project.gallery : [];
  const items = [];
  const seen = new Set();

  sourceItems.forEach((item, index) => {
    const url = typeof item === 'string' ? item : item?.url;
    if (!url || seen.has(url)) return;
    seen.add(url);
    items.push({
      id: item?.id || `gallery-${index + 1}`,
      url,
      publicId: item?.publicId || null,
      order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
      alt: item?.alt || project.title || ''
    });
  });
  sourceUrls.forEach((url) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    items.push({ id: `gallery-${items.length + 1}`, url, publicId: null, order: items.length, alt: project.title || '' });
  });
  items.sort((a, b) => a.order - b.order);
  return items.map((item, index) => ({ ...item, order: index }));
};

const normalizeProject = (value) => {
  const project = asPlainObject(value);
  const galleryItems = normalizeGallery(project);
  project.galleryItems = galleryItems;
  project.gallery = galleryItems.map(item => item.url);
  project.clientName = project.clientName || project.investor || null;
  project.isPublished = project.isPublished !== undefined
    ? project.isPublished !== false
    : project.status !== 'draft' && project.status !== 'private' && project.status !== 'trash';
  project.sortOrder = Number.isFinite(Number(project.sortOrder)) ? Number(project.sortOrder) : 0;
  return project;
};

const normalizeBoolean = (value) => value === true || value === 'true' || value === '1' || value === 1;

const normalizeInput = (data = {}, { partial = false } = {}) => {
  const input = {};
  PROJECT_FIELDS.forEach(field => {
    if (data[field] !== undefined) input[field] = data[field];
  });
  if (!partial || input.title !== undefined) {
    input.title = String(input.title || '').trim();
    if (!input.title) throw new Error('Tên công trình không được để trống.');
  }
  if (input.slug !== undefined) {
    input.slug = slugify(input.slug || input.title);
  } else if (!partial) {
    input.slug = slugify(input.title);
  }
  if (!input.slug && input.title) input.slug = slugify(input.title);
  if (input.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    throw new Error('Slug chỉ được chứa chữ thường, số và dấu gạch ngang.');
  }
  if (input.clientName !== undefined) input.investor = String(input.clientName || '').trim() || null;
  if (input.categoryIds !== undefined) {
    input.categoryIds = Array.isArray(input.categoryIds)
      ? input.categoryIds.filter(Boolean).map(value => value?._id || value)
      : [];
  }
  if (input.cost !== undefined && input.cost !== null && input.cost !== '') {
    input.cost = Number(input.cost);
    if (!Number.isFinite(input.cost) || input.cost < 0) throw new Error('Chi phí công trình không hợp lệ.');
  }
  if (input.sortOrder !== undefined) input.sortOrder = Number(input.sortOrder) || 0;
  if (input.highlightOrder !== undefined) input.highlightOrder = Number(input.highlightOrder) || 0;
  if (input.isPublished !== undefined) {
    input.isPublished = normalizeBoolean(input.isPublished);
    if (data.status === undefined) input.status = input.isPublished ? 'published' : 'draft';
  }
  if (input.galleryItems !== undefined) {
    const items = normalizeGallery({ title: input.title || '', galleryItems: input.galleryItems, gallery: input.gallery });
    input.galleryItems = items;
    input.gallery = items.map(item => item.url);
  } else if (input.gallery !== undefined) {
    const items = normalizeGallery({ title: input.title || '', gallery: input.gallery });
    input.galleryItems = items;
    input.gallery = items.map(item => item.url);
  }
  return input;
};

const cleanupPublicIdIfUnused = async (publicId) => {
  if (!publicId) return;
  try {
    const stillUsed = await Project.exists({
      $or: [
        { thumbnailPublicId: publicId },
        { galleryItems: { $elemMatch: { publicId } } }
      ]
    });
    if (!stillUsed) await destroyCloudinaryImage(publicId);
  } catch (error) {
    console.error('[Project image cleanup]', error.message);
  }
};

class ProjectService {
  /**
   * Get projects with Search, Pagination, Category & Descendant Filtering, Status & Featured Filtering, and Sorting
   */
  async getProjects(options = {}) {
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.max(1, Math.min(1000, parseInt(options.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const filter = {};

    // Status filter (default to 'published' if not explicitly provided as 'all' or specific status)
    if (options.status && options.status !== 'all') {
      filter.status = options.status;
    } else if (!options.status) {
      filter.status = 'published';
    }

    // Featured filter
    if (options.featured !== undefined) {
      filter.featured = options.featured === 'true' || options.featured === true;
    }

    if (options.isHighlight !== undefined) {
      filter.isHighlight = options.isHighlight === 'true' || options.isHighlight === true;
    }

    if (options.isVisible !== undefined) {
      filter.isVisible = options.isVisible === 'true' || options.isVisible === true;
    } else if (options.includeHidden !== true) {
      filter.isVisible = { $ne: false };
    }

    if (options.excludeIds && Array.isArray(options.excludeIds) && options.excludeIds.length > 0) {
      filter._id = { $nin: options.excludeIds.map(id => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id)) };
    }

    // Search filter (Title, Investor, Location, Excerpt, Content)
    if (options.search) {
      const searchRegex = new RegExp(options.search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { investor: searchRegex },
        { clientName: searchRegex },
        { location: searchRegex },
        { area: searchRegex },
        { propertyType: searchRegex },
        { style: searchRegex },
        { excerpt: searchRegex },
        { content: searchRegex }
      ];
    }

    // Category & Descendant Category Filtering
    if (options.category) {
      const descendantCatIds = await categoryService.getAllDescendantCategoryIds(options.category);
      if (descendantCatIds.length > 0) {
        filter.categoryIds = { $in: descendantCatIds };
      } else {
        // Provided category was invalid/not found
        return {
          projects: [],
          page,
          limit,
          totalPages: 0,
          totalItems: 0
        };
      }
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (options.sort) {
      switch (options.sort) {
        case 'oldest':
          sortOption = { createdAt: 1 };
          break;
        case 'title_asc':
          sortOption = { title: 1 };
          break;
        case 'title_desc':
          sortOption = { title: -1 };
          break;
        case 'updated':
          sortOption = { updatedAt: -1 };
          break;
        case 'highlight':
          sortOption = { highlightOrder: 1, createdAt: -1 };
          break;
        case 'order':
          sortOption = { sortOrder: 1, createdAt: -1 };
          break;
        case 'newest':
        default:
          sortOption = { createdAt: -1 };
          break;
      }
    }

    const listFields = options.compact
      ? 'title slug investor clientName location area propertyType cost style thumbnail thumbnailPublicId isHighlight highlightOrder isVisible isPublished sortOrder categoryIds createdAt'
      : 'title slug investor clientName location area propertyType cost style excerpt content status featured isHighlight highlightOrder isVisible isPublished sortOrder categoryIds thumbnail thumbnailPublicId gallery galleryItems createdAt updatedAt';
    let projectsQuery = Project.find(filter)
      .select(listFields)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    if (!options.compact) {
      projectsQuery = projectsQuery.populate('categoryIds', 'name slug code isLeaf');
    }

    // Execute count and query in parallel for a faster response.
    const [totalItems, projects] = await Promise.all([
      Project.countDocuments(filter),
      projectsQuery
    ]);

    const normalizedProjects = projects.map(normalizeProject);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      projects: normalizedProjects,
      page,
      limit,
      totalPages,
      totalItems
    };
  }

  /**
   * Get project by ID or Slug
   */
  async getProjectByIdOrSlug(idOrSlug) {
    if (!idOrSlug) return null;
    let project = null;

    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      project = await Project.findById(idOrSlug).populate('categoryIds', 'name slug code isLeaf parentId').lean();
    }
    if (!project) {
      project = await Project.findOne({ slug: idOrSlug }).populate('categoryIds', 'name slug code isLeaf parentId').lean();
    }
    return project ? normalizeProject(project) : null;
  }

  /**
   * Create Project
   */
  async createProject(data) {
    const input = normalizeInput(data);
    const existing = await Project.exists({ slug: input.slug });
    if (existing) throw new Error('Slug công trình đã tồn tại.');
    const project = new Project({ ...input, isPublished: input.isPublished !== false });
    return normalizeProject(await project.save());
  }

  /**
   * Update Project
   */
  async updateProject(id, data) {
    const current = await Project.findById(id).lean();
    if (!current) throw new Error('Project not found');
    const input = normalizeInput(data, { partial: true });
    if (input.slug && input.slug !== current.slug) {
      const existing = await Project.exists({ slug: input.slug, _id: { $ne: id } });
      if (existing) throw new Error('Slug công trình đã tồn tại.');
    }
    const project = await Project.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean();
    if (!project) throw new Error('Project not found');
    return normalizeProject(project);
  }

  /**
   * Delete Project
   */
  async deleteProject(id) {
    const project = await Project.findByIdAndDelete(id).lean();
    if (!project) throw new Error('Project not found');
    const normalized = normalizeProject(project);
    const publicIds = [normalized.thumbnailPublicId, ...normalized.galleryItems.map(item => item.publicId)].filter(Boolean);
    await Promise.all(publicIds.map(cleanupPublicIdIfUnused));
    return normalized;
  }

  /**
   * Update Project Thumbnail
   */
  async updateThumbnail(id, thumbnailUrl, publicId = null) {
    const current = await Project.findById(id).lean();
    if (!current) throw new Error('Project not found');
    const project = await Project.findByIdAndUpdate(
      id,
      { thumbnail: thumbnailUrl, thumbnailPublicId: publicId || null },
      { new: true, runValidators: true }
    ).lean();
    if (current.thumbnailPublicId && current.thumbnailPublicId !== publicId) {
      await cleanupPublicIdIfUnused(current.thumbnailPublicId);
    }
    return normalizeProject(project);
  }

  /**
   * Add image to Project Gallery
   */
  async addToGallery(id, imageUrl, publicId = null, alt = '') {
    if (!imageUrl) throw new Error('imageUrl is required');
    const current = await Project.findById(id).lean();
    if (!current) throw new Error('Project not found');
    const items = normalizeGallery(current);
    if (!items.some(item => item.url === imageUrl)) {
      items.push({ id: `gallery-${Date.now()}-${items.length + 1}`, url: imageUrl, publicId, order: items.length, alt: alt || current.title });
    }
    const project = await Project.findByIdAndUpdate(
      id,
      { $set: { gallery: items.map(item => item.url), galleryItems: items } },
      { new: true, runValidators: true }
    ).lean();
    return normalizeProject(project);
  }

  /**
   * Remove image from Project Gallery
   */
  async removeFromGallery(id, imageUrl, imageId = null) {
    const current = await Project.findById(id).lean();
    if (!current) throw new Error('Project not found');
    const items = normalizeGallery(current);
    const removed = items.find(item => (imageId && item.id === imageId) || (!imageId && item.url === imageUrl));
    const remaining = items.filter(item => item !== removed).map((item, index) => ({ ...item, order: index }));
    const project = await Project.findByIdAndUpdate(
      id,
      { $set: { gallery: remaining.map(item => item.url), galleryItems: remaining } },
      { new: true, runValidators: true }
    ).lean();
    if (removed?.publicId) await cleanupPublicIdIfUnused(removed.publicId);
    return normalizeProject(project);
  }

  async reorderGallery(id, galleryItems = []) {
    const current = await Project.findById(id).lean();
    if (!current) throw new Error('Project not found');
    const existing = normalizeGallery(current);
    const requested = Array.isArray(galleryItems) ? galleryItems : [];
    const byId = new Map(existing.map(item => [item.id, item]));
    const byUrl = new Map(existing.map(item => [item.url, item]));
    const ordered = [];
    requested.forEach((item, index) => {
      const key = typeof item === 'string' ? item : item?.id || item?.url;
      const found = byId.get(key) || byUrl.get(key);
      if (found && !ordered.includes(found)) ordered.push({ ...found, order: index });
    });
    existing.forEach(item => {
      if (!ordered.some(candidate => candidate.id === item.id)) ordered.push({ ...item, order: ordered.length });
    });
    const project = await Project.findByIdAndUpdate(
      id,
      { $set: { gallery: ordered.map(item => item.url), galleryItems: ordered } },
      { new: true, runValidators: true }
    ).lean();
    return normalizeProject(project);
  }
}

module.exports = new ProjectService();
