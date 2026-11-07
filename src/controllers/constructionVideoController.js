const constructionVideoService = require('../services/constructionVideoService');

class ConstructionVideoController {
  async getAdminVideos(req, res, next) {
    try {
      return res.json({ success: true, data: await constructionVideoService.getAllVideos() });
    } catch (error) {
      next(error);
    }
  }

  async getVideos(req, res, next) {
    try {
      return res.json({ success: true, data: await constructionVideoService.getVisibleVideos() });
    } catch (error) {
      next(error);
    }
  }

  async createVideo(req, res, next) {
    try {
      return res.status(201).json({ success: true, data: await constructionVideoService.createVideo(req.body) });
    } catch (error) {
      next(error);
    }
  }

  async updateVideo(req, res, next) {
    try {
      return res.json({ success: true, data: await constructionVideoService.updateVideo(req.params.id, req.body) });
    } catch (error) {
      next(error);
    }
  }

  async deleteVideo(req, res, next) {
    try {
      await constructionVideoService.deleteVideo(req.params.id);
      return res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConstructionVideoController();
