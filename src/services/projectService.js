const Project = require('../models/Project');
const categoryService = require('./categoryService');
const mongoose = require('mongoose');

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
    } else {
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
        case 'newest':
        default:
          sortOption = { createdAt: -1 };
          break;
      }
    }

    const listFields = options.compact
      ? 'title slug investor location area propertyType cost style thumbnail isHighlight highlightOrder isVisible categoryIds createdAt'
      : 'title slug investor location area propertyType cost style excerpt status featured isHighlight highlightOrder isVisible categoryIds thumbnail gallery createdAt';
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

    const totalPages = Math.ceil(totalItems / limit);

    return {
      projects,
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
    return project;
  }

  /**
   * Create Project
   */
  async createProject(data) {
    const project = new Project(data);
    return await project.save();
  }

  /**
   * Update Project
   */
  async updateProject(id, data) {
    const project = await Project.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!project) throw new Error('Project not found');
    return project;
  }

  /**
   * Delete Project
   */
  async deleteProject(id) {
    const project = await Project.findByIdAndDelete(id);
    if (!project) throw new Error('Project not found');
    return project;
  }

  /**
   * Update Project Thumbnail
   */
  async updateThumbnail(id, thumbnailUrl) {
    const project = await Project.findByIdAndUpdate(
      id,
      { thumbnail: thumbnailUrl },
      { new: true }
    );
    if (!project) throw new Error('Project not found');
    return project;
  }

  /**
   * Add image to Project Gallery
   */
  async addToGallery(id, imageUrl) {
    const project = await Project.findByIdAndUpdate(
      id,
      { $addToSet: { gallery: imageUrl } },
      { new: true }
    );
    if (!project) throw new Error('Project not found');
    return project;
  }

  /**
   * Remove image from Project Gallery
   */
  async removeFromGallery(id, imageUrl) {
    const project = await Project.findByIdAndUpdate(
      id,
      { $pull: { gallery: imageUrl } },
      { new: true }
    );
    if (!project) throw new Error('Project not found');
    return project;
  }
}

module.exports = new ProjectService();
