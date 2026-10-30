const projectService = require('../services/projectService');

class ProjectController {
  // GET /api/projects
  async getProjects(req, res, next) {
    try {
      const result = await projectService.getProjects({ ...req.query, compact: req.query.compact !== 'false' });
      res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      return res.json({
        success: true,
        data: result.projects,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          totalItems: result.totalItems
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/projects
  async getAdminProjects(req, res, next) {
    try {
      const result = await projectService.getProjects({
        ...req.query,
        status: req.query.status || 'all',
        includeHidden: true,
        compact: false
      });
      return res.json({
        success: true,
        data: result.projects,
        pagination: {
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          totalItems: result.totalItems
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/projects/:idOrSlug
  async getProjectByIdOrSlug(req, res, next) {
    try {
      const project = await projectService.getProjectByIdOrSlug(req.params.idOrSlug);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      return res.json({
        success: true,
        data: project
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/admin/projects
  async createProject(req, res, next) {
    try {
      const project = await projectService.createProject(req.body);
      return res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/admin/projects/:id
  async updateProject(req, res, next) {
    try {
      const project = await projectService.updateProject(req.params.id, req.body);
      return res.json({
        success: true,
        message: 'Project updated successfully',
        data: project
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/admin/projects/:id
  async deleteProject(req, res, next) {
    try {
      await projectService.deleteProject(req.params.id);
      return res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/admin/projects/:id/thumbnail
  async updateThumbnail(req, res, next) {
    try {
      const { thumbnailUrl, publicId } = req.body;
      if (!thumbnailUrl) {
        return res.status(400).json({
          success: false,
          message: 'thumbnailUrl is required'
        });
      }
      const project = await projectService.updateThumbnail(req.params.id, thumbnailUrl, publicId);
      return res.json({
        success: true,
        message: 'Thumbnail updated successfully',
        data: project
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/admin/projects/:id/gallery
  async addToGallery(req, res, next) {
    try {
      const { imageUrl, publicId, alt } = req.body;
      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: 'imageUrl is required'
        });
      }
      const project = await projectService.addToGallery(req.params.id, imageUrl, publicId, alt);
      return res.json({
        success: true,
        message: 'Image added to gallery successfully',
        data: project
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/admin/projects/:id/gallery
  async removeFromGallery(req, res, next) {
    try {
      const { imageUrl, imageId } = req.body;
      if (!imageUrl && !imageId) {
        return res.status(400).json({
          success: false,
          message: 'imageUrl is required'
        });
      }
      const project = await projectService.removeFromGallery(req.params.id, imageUrl, imageId);
      return res.json({
        success: true,
        message: 'Image removed from gallery successfully',
        data: project
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/admin/projects/:id/gallery — persists drag-and-drop order.
  async reorderGallery(req, res, next) {
    try {
      const project = await projectService.reorderGallery(req.params.id, req.body.galleryItems || req.body.gallery || []);
      return res.json({
        success: true,
        message: 'Gallery order updated successfully',
        data: project
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProjectController();
