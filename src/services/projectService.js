const Project = require('../models/Project');
const categoryService = require('./categoryService');
const { destroyCloudinaryImage, optimizedImageUrl } = require('../utils/cloudinary');
const { htmlToPlainText } = require('../utils/sanitizeHtml');
const mongoose = require('mongoose');
const { MAX_GALLERY_IMAGES } = require('../config/imageUpload');

const escapeRegExp = value => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PROJECT_FIELDS = [
  'title', 'slug', 'investor', 'clientName', 'location', 'area', 'cost',
  'propertyType', 'style', 'excerpt', 'content', 'status', 'featured',
  'isHighlight', 'highlightOrder', 'isVisible', 'isPublished', 'sortOrder',
  'designProjectId', 'categoryIds', 'thumbnail', 'thumbnailPublicId', 'thumbnailFormat', 'thumbnailWidth', 'thumbnailHeight', 'thumbnailBytes', 'gallery', 'galleryItems'
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
      alt: item?.alt || project.title || '',
      format: item?.format || null,
      width: Number.isFinite(Number(item?.width)) ? Number(item.width) : null,
      height: Number.isFinite(Number(item?.height)) ? Number(item.height) : null,
      bytes: Number.isFinite(Number(item?.bytes)) ? Number(item.bytes) : null,
      thumbnailUrl: item?.thumbnailUrl || optimizedImageUrl(url)
    });
  });
  sourceUrls.forEach((url) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    items.push({ id: `gallery-${items.length + 1}`, url, publicId: null, order: items.length, alt: project.title || '', format: null, width: null, height: null, bytes: null, thumbnailUrl: optimizedImageUrl(url) });
  });
  items.sort((a, b) => a.order - b.order);
  return items.map((item, index) => ({ ...item, order: index }));
};

const normalizeProject = (value) => {
  const project = asPlainObject(value);
  const galleryItems = normalizeGallery(project);
  project.galleryItems = galleryItems;
  project.gallery = galleryItems.map(item => item.url);
  project.excerpt = htmlToPlainText(project.excerpt || '');
  project.content = htmlToPlainText(project.content || '');
  project.clientName = project.clientName || project.investor || null;
  project.isPublished = project.isPublished !== undefined
    ? project.isPublished !== false
    : project.status !== 'draft' && project.status !== 'private' && project.status !== 'trash';
  project.sortOrder = Number.isFinite(Number(project.sortOrder)) ? Number(project.sortOrder) : 0;
  project.galleryLimit = MAX_GALLERY_IMAGES;
  project.galleryOverLimit = galleryItems.length > MAX_GALLERY_IMAGES;
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
    if (!input.title) throw Object.assign(new Error('Tên công trình không được để trống.'), { status: 400 });
  }
  if (input.slug !== undefined) {
    input.slug = slugify(input.slug || input.title);
  } else if (!partial) {
    input.slug = slugify(input.title);
  }
  // On partial updates, changing a title must not silently change the public
  // URL. A slug is regenerated only for creates or when the caller explicitly
  // sends the slug field.
  if (!partial && !input.slug && input.title) input.slug = slugify(input.title);
  if (input.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    throw Object.assign(new Error('Slug chỉ được chứa chữ thường, số và dấu gạch ngang.'), { status: 400 });
  }
  if (input.clientName !== undefined) input.investor = String(input.clientName || '').trim() || null;
  if (input.excerpt !== undefined) input.excerpt = htmlToPlainText(input.excerpt);
  if (input.content !== undefined) input.content = htmlToPlainText(input.content);
  if (input.categoryIds !== undefined) {
    input.categoryIds = Array.isArray(input.categoryIds)
      ? input.categoryIds.filter(Boolean).map(value => value?._id || value)
      : [];
  }
  if (input.cost !== undefined && input.cost !== null && input.cost !== '') {
    input.cost = Number(input.cost);
    if (!Number.isFinite(input.cost) || input.cost < 0) throw Object.assign(new Error('Chi phí công trình không hợp lệ.'), { status: 400 });
  }
  if (input.sortOrder !== undefined) input.sortOrder = Number(input.sortOrder) || 0;
  if (input.highlightOrder !== undefined) input.highlightOrder = Number(input.highlightOrder) || 0;
  if (input.isPublished !== undefined) {
    input.isPublished = normalizeBoolean(input.isPublished);
    if (data.status === undefined) input.status = input.isPublished ? 'published' : 'draft';
  }
  if (input.status !== undefined && input.isPublished === undefined) input.isPublished = input.status === 'published';
  if (input.galleryItems !== undefined) {
    const items = normalizeGallery({ title: input.title || '', galleryItems: input.galleryItems, gallery: input.gallery });
    if (items.length > MAX_GALLERY_IMAGES) throw Object.assign(new Error(`Gallery tối đa ${MAX_GALLERY_IMAGES} ảnh.`), { status: 400 });
    input.galleryItems = items;
    input.gallery = items.map(item => item.url);
  } else if (input.gallery !== undefined) {
    const items = normalizeGallery({ title: input.title || '', gallery: input.gallery });
    if (items.length > MAX_GALLERY_IMAGES) throw Object.assign(new Error(`Gallery tối đa ${MAX_GALLERY_IMAGES} ảnh.`), { status: 400 });
    input.galleryItems = items;
    input.gallery = items.map(item => item.url);
  }
  return input;
};

const cleanupPublicIdIfUnused = async (publicId, imageUrl = null) => {
  if (!publicId) return;
  try {
    const references = [
      { thumbnailPublicId: publicId },
      { galleryItems: { $elemMatch: { publicId } } }
    ];
    // Legacy projects may only store a URL. Treat a matching URL as a live
    // reference too, otherwise deleting one project could remove an asset
    // still displayed by another project.
    if (imageUrl) references.push({ thumbnail: imageUrl }, { gallery: imageUrl });
    const stillUsed = await Project.exists({ $or: references });
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
      const searchRegex = new RegExp(escapeRegExp(options.search.trim()), 'i');
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
      ? 'title slug investor clientName location area propertyType cost style thumbnail thumbnailPublicId thumbnailFormat thumbnailWidth thumbnailHeight thumbnailBytes gallery galleryItems isHighlight highlightOrder isVisible isPublished sortOrder designProjectId categoryIds createdAt'
      : 'title slug investor clientName location area propertyType cost style excerpt content status featured isHighlight highlightOrder isVisible isPublished sortOrder designProjectId categoryIds thumbnail thumbnailPublicId thumbnailFormat thumbnailWidth thumbnailHeight thumbnailBytes gallery galleryItems createdAt updatedAt';
    let projectsPromise;
    if (options.sort === 'order') {
      // Keep legacy records without an explicit order usable, but place them
      // after projects assigned 1, 2, 3... in the CMS.
      const projection = Object.fromEntries(listFields.split(/\s+/).filter(Boolean).map(field => [field, 1]));
      projectsPromise = Project.aggregate([
        { $match: filter },
        {
          $addFields: {
            __displayOrder: {
              $cond: [
                { $gt: [{ $ifNull: ['$sortOrder', 0] }, 0] },
                '$sortOrder',
                2147483647
              ]
            }
          }
        },
        { $sort: { __displayOrder: 1, createdAt: -1, _id: 1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: projection }
      ]).exec();
    } else {
      let projectsQuery = Project.find(filter)
        .select(listFields)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean();

      if (!options.compact) {
        projectsQuery = projectsQuery.populate('categoryIds', 'name slug code isLeaf');
      }
      projectsPromise = projectsQuery;
    }

    // Execute count and query in parallel for a faster response.
    const [totalItems, projects] = await Promise.all([
      Project.countDocuments(filter),
      projectsPromise
    ]);

    if (!options.compact && options.sort === 'order') {
      await Project.populate(projects, { path: 'categoryIds', select: 'name slug code isLeaf' });
    }

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
  async getProjectByIdOrSlug(idOrSlug, { includeHidden = false } = {}) {
    if (!idOrSlug) return null;
    let project = null;
    const visibilityFilter = includeHidden ? {} : { status: 'published', isVisible: { $ne: false } };

    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      project = await Project.findOne({ _id: idOrSlug, ...visibilityFilter }).populate('categoryIds', 'name slug code isLeaf parentId').lean();
    }
    if (!project) {
      project = await Project.findOne({ slug: idOrSlug, ...visibilityFilter }).populate('categoryIds', 'name slug code isLeaf parentId').lean();
    }
    return project ? normalizeProject(project) : null;
  }

  /**
   * Create Project
   */
  async createProject(data) {
    const input = normalizeInput(data);
    const existing = await Project.exists({ slug: input.slug });
    if (existing) throw Object.assign(new Error('Slug công trình đã tồn tại.'), { status: 409 });
    const project = new Project({ ...input, isPublished: input.isPublished !== false });
    return normalizeProject(await project.save());
  }

  /**
   * Update Project
   */
  async updateProject(id, data) {
    const current = await Project.findById(id).lean();
    if (!current) throw Object.assign(new Error('Project not found'), { status: 404 });
    const input = normalizeInput(data, { partial: true });
    if (input.slug && input.slug !== current.slug) {
      const existing = await Project.exists({ slug: input.slug, _id: { $ne: id } });
      if (existing) throw Object.assign(new Error('Slug công trình đã tồn tại.'), { status: 409 });
    }
    const project = await Project.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean();
    if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
    const thumbnailChanged = input.thumbnail !== undefined && input.thumbnail !== current.thumbnail;
    if (thumbnailChanged && current.thumbnailPublicId && current.thumbnailPublicId !== input.thumbnailPublicId) {
      await cleanupPublicIdIfUnused(current.thumbnailPublicId, current.thumbnail);
    }
    return normalizeProject(project);
  }

  /**
   * Delete Project
   */
  async deleteProject(id) {
    const project = await Project.findByIdAndDelete(id).lean();
    if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
    const normalized = normalizeProject(project);
    const assets = [
      normalized.thumbnailPublicId ? { publicId: normalized.thumbnailPublicId, url: normalized.thumbnail } : null,
      ...normalized.galleryItems.filter(item => item.publicId).map(item => ({ publicId: item.publicId, url: item.url }))
    ].filter(Boolean);
    await Promise.all(assets.map(asset => cleanupPublicIdIfUnused(asset.publicId, asset.url)));
    return normalized;
  }

  /**
   * Update Project Thumbnail
   */
  async updateThumbnail(id, thumbnailUrl, publicId = null, metadata = {}) {
    metadata = metadata || {};
    const current = await Project.findById(id).lean();
    if (!current) throw Object.assign(new Error('Project not found'), { status: 404 });
    const project = await Project.findByIdAndUpdate(
      id,
      {
        thumbnail: thumbnailUrl,
        thumbnailPublicId: publicId || null,
        thumbnailFormat: metadata.format || null,
        thumbnailWidth: Number(metadata.width) || null,
        thumbnailHeight: Number(metadata.height) || null,
        thumbnailBytes: Number(metadata.bytes) || null
      },
      { new: true, runValidators: true }
    ).lean();
    if (current.thumbnailPublicId && current.thumbnailPublicId !== publicId) {
      await cleanupPublicIdIfUnused(current.thumbnailPublicId, current.thumbnail);
    }
    return normalizeProject(project);
  }

  async getGalleryCapacity(id) {
    const current = await Project.findById(id).select('title gallery galleryItems').lean();
    if (!current) throw Object.assign(new Error('Project not found'), { status: 404 });
    const currentCount = normalizeGallery(current).length;
    return {
      limit: MAX_GALLERY_IMAGES,
      current: currentCount,
      remaining: Math.max(0, MAX_GALLERY_IMAGES - currentCount)
    };
  }

  /**
   * Add image to Project Gallery
   */
  async addToGallery(id, imageUrl, publicId = null, alt = '', metadata = {}) {
    metadata = metadata || {};
    if (!imageUrl) throw new Error('imageUrl is required');
    try {
      return await this.addBatchToGallery(id, [{ url: imageUrl, publicId, alt, metadata }]);
    } catch (error) {
      // Preserve the legacy endpoint's 400 response while the new batch API
      // uses 409 to signal a concurrent/capacity conflict.
      if (error.code === 'GALLERY_LIMIT_EXCEEDED') error.status = 400;
      throw error;
    }
  }

  /**
   * Add a batch with optimistic concurrency. A retrying client cannot create
   * duplicate gallery entries because publicId/url are deduplicated before the
   * atomic versioned update.
   */
  async addBatchToGallery(id, images = {}) {
    const incoming = Array.isArray(images) ? images : [images];
    if (!incoming.length) throw Object.assign(new Error('Chưa có ảnh để lưu.'), { status: 400 });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = await Project.findById(id).lean();
      if (!current) throw Object.assign(new Error('Project not found'), { status: 404 });
      const existing = normalizeGallery(current);
      const seenUrls = new Set(existing.map(item => item.url));
      const seenPublicIds = new Set(existing.map(item => item.publicId).filter(Boolean));
      const additions = [];

      incoming.forEach((input, index) => {
        const url = String(input?.url || input?.imageUrl || '').trim();
        const publicId = input?.publicId || null;
        if (!url || seenUrls.has(url) || (publicId && seenPublicIds.has(publicId))) return;
        const metadata = input?.metadata || input || {};
        additions.push({
          id: input?.id || `gallery-${Date.now()}-${attempt}-${index}`,
          url,
          publicId,
          order: existing.length + additions.length,
          alt: input?.alt || current.title || '',
          format: metadata.format || null,
          width: Number(metadata.width) || null,
          height: Number(metadata.height) || null,
          bytes: Number(metadata.bytes) || null,
          thumbnailUrl: input?.thumbnailUrl || optimizedImageUrl(url)
        });
        seenUrls.add(url);
        if (publicId) seenPublicIds.add(publicId);
      });

      if (existing.length + additions.length > MAX_GALLERY_IMAGES) {
        throw Object.assign(new Error(`Gallery tối đa ${MAX_GALLERY_IMAGES} ảnh. Gallery hiện có ${existing.length} ảnh và batch mới có ${additions.length} ảnh.`), {
          status: 409,
          code: 'GALLERY_LIMIT_EXCEEDED'
        });
      }

      if (!additions.length) return normalizeProject(current);
      const merged = [...existing, ...additions].map((item, index) => ({ ...item, order: index }));
      const versionFilter = Number.isInteger(current.__v)
        ? { __v: current.__v }
        : { __v: { $exists: false } };
      const updated = await Project.findOneAndUpdate(
        { _id: id, ...versionFilter },
        {
          $set: { gallery: merged.map(item => item.url), galleryItems: merged },
          $inc: { __v: 1 }
        },
        { new: true, runValidators: true }
      ).lean();
      if (updated) return normalizeProject(updated);
    }

    throw Object.assign(new Error('Gallery đang được cập nhật bởi một request khác. Vui lòng thử lại.'), {
      status: 409,
      code: 'GALLERY_CONCURRENT_UPDATE'
    });
  }

  /**
   * Remove image from Project Gallery
   */
  async removeFromGallery(id, imageUrl, imageId = null) {
    const current = await Project.findById(id).lean();
    if (!current) throw Object.assign(new Error('Project not found'), { status: 404 });
    const items = normalizeGallery(current);
    const removed = items.find(item => (imageId && item.id === imageId) || (!imageId && item.url === imageUrl));
    const remaining = items.filter(item => item !== removed).map((item, index) => ({ ...item, order: index }));
    const project = await Project.findByIdAndUpdate(
      id,
      { $set: { gallery: remaining.map(item => item.url), galleryItems: remaining } },
      { new: true, runValidators: true }
    ).lean();
    if (removed?.publicId) await cleanupPublicIdIfUnused(removed.publicId, removed.url);
    return normalizeProject(project);
  }

  async removeAllFromGallery(id) {
    const current = await Project.findById(id).lean();
    if (!current) throw Object.assign(new Error('Project not found'), { status: 404 });
    const items = normalizeGallery(current);
    const project = await Project.findByIdAndUpdate(
      id,
      { $set: { gallery: [], galleryItems: [] } },
      { new: true, runValidators: true }
    ).lean();
    await Promise.all(items.filter(item => item.publicId).map(item => cleanupPublicIdIfUnused(item.publicId, item.url)));
    return normalizeProject(project);
  }

  async reorderGallery(id, galleryItems = []) {
    const current = await Project.findById(id).lean();
    if (!current) throw Object.assign(new Error('Project not found'), { status: 404 });
    const existing = normalizeGallery(current);
    const requested = Array.isArray(galleryItems) ? galleryItems : [];
    if (existing.length > MAX_GALLERY_IMAGES || requested.length > MAX_GALLERY_IMAGES) {
      throw Object.assign(new Error(`Gallery đang vượt giới hạn ${MAX_GALLERY_IMAGES} ảnh. Hãy xoá ảnh dư trước khi sắp xếp.`), { status: 400 });
    }
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
