const ConstructionVideo = require('../models/ConstructionVideo');

function videoFields(data = {}) {
  return {
    youtubeId: String(data.youtubeId || '').trim(),
    sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
    isVisible: data.isVisible !== false
  };
}

class ConstructionVideoService {
  async getAllVideos() {
    return ConstructionVideo.find({})
      .select('youtubeId sortOrder isVisible createdAt updatedAt')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
  }

  async getVisibleVideos() {
    return ConstructionVideo.find({ isVisible: { $ne: false } })
      .select('youtubeId sortOrder')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
  }

  async createVideo(data) {
    return new ConstructionVideo(videoFields(data)).save();
  }

  async updateVideo(id, data) {
    const video = await ConstructionVideo.findByIdAndUpdate(id, videoFields(data), { new: true, runValidators: true });
    if (!video) throw new Error('Construction video not found');
    return video;
  }

  async deleteVideo(id) {
    const video = await ConstructionVideo.findByIdAndDelete(id);
    if (!video) throw new Error('Construction video not found');
    return video;
  }
}

module.exports = new ConstructionVideoService();
