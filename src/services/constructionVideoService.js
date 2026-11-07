const ConstructionVideo = require('../models/ConstructionVideo');

class ConstructionVideoService {
  async getAllVideos() {
    return ConstructionVideo.find({})
      .select('youtubeId thumbnail sortOrder isVisible createdAt updatedAt')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
  }

  async getVisibleVideos() {
    return ConstructionVideo.find({ isVisible: { $ne: false } })
      .select('youtubeId thumbnail sortOrder')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
  }

  async createVideo(data) {
    return new ConstructionVideo(data).save();
  }

  async updateVideo(id, data) {
    const video = await ConstructionVideo.findByIdAndUpdate(id, data, { new: true, runValidators: true });
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
