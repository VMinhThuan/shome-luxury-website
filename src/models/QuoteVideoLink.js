const mongoose = require('mongoose');

const quoteVideoLinkSchema = new mongoose.Schema({
  scopeKey: { type: String, required: true, trim: true },
  videoIndex: { type: Number, required: true, min: 0, max: 5 },
  videoUrl: { type: String, required: true, trim: true },
  categoryId: { type: String, required: true, trim: true }
}, { timestamps: true });

quoteVideoLinkSchema.index({ scopeKey: 1, videoIndex: 1 }, { unique: true });

module.exports = mongoose.models.QuoteVideoLink
  || mongoose.model('QuoteVideoLink', quoteVideoLinkSchema);
