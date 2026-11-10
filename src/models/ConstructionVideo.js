const mongoose = require('mongoose');

const constructionVideoSchema = new mongoose.Schema({
  youtubeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^[A-Za-z0-9_-]{11}$/, 'youtubeId phải là mã video YouTube hợp lệ']
  },
  sortOrder: {
    type: Number,
    default: 0,
    index: true
  },
  isVisible: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

constructionVideoSchema.index({ isVisible: 1, sortOrder: 1, createdAt: -1 });

module.exports = mongoose.models.ConstructionVideo || mongoose.model('ConstructionVideo', constructionVideoSchema);
