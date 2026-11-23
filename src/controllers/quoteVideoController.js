const quoteVideoService = require('../services/quoteVideoService');

function pageKeyFromRequest(req) {
  return String(req.query.page || req.body?.pageKey || 'quote').trim();
}

function validatePageKey(pageKey) {
  if (pageKey === 'quote' || pageKey.startsWith('quote:') || pageKey.startsWith('subpage:quote:')) return pageKey;
  throw new Error('Chỉ hỗ trợ video của các menu con Báo giá.');
}

class QuoteVideoController {
  async getAdminVideos(req, res, next) {
    try {
      const pageKey = validatePageKey(pageKeyFromRequest(req));
      return res.json({ success: true, data: await quoteVideoService.getAdminVideos(pageKey) });
    } catch (error) { return next(error); }
  }

  async updateVideo(req, res, next) {
    try {
      const pageKey = validatePageKey(pageKeyFromRequest(req));
      const data = await quoteVideoService.updateVideo(pageKey, req.params.videoIndex, req.body?.url);
      return res.json({ success: true, data });
    } catch (error) { return next(error); }
  }

  async resetVideo(req, res, next) {
    try {
      const pageKey = validatePageKey(pageKeyFromRequest(req));
      const data = await quoteVideoService.resetVideo(pageKey, req.params.videoIndex);
      return res.json({ success: true, data });
    } catch (error) { return next(error); }
  }

  async updateMobileVisibility(req, res, next) {
    try {
      const pageKey = validatePageKey(pageKeyFromRequest(req));
      const data = await quoteVideoService.updateMobileVisibility(
        pageKey,
        req.params.videoIndex,
        req.body?.isVisible
      );
      return res.json({ success: true, data });
    } catch (error) { return next(error); }
  }
}

module.exports = new QuoteVideoController();
