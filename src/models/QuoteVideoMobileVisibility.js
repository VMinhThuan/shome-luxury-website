const mongoose = require('mongoose');

const quoteVideoMobileVisibilitySchema = new mongoose.Schema({
  scopeKey: { type: String, required: true, trim: true },
  videoIndex: { type: Number, required: true, min: 0, max: 5 },
  isVisible: { type: Boolean, required: true },
  categoryId: { type: String, required: true, trim: true }
}, { timestamps: true });

quoteVideoMobileVisibilitySchema.index({ scopeKey: 1, videoIndex: 1 }, { unique: true });

module.exports = mongoose.models.QuoteVideoMobileVisibility
  || mongoose.model('QuoteVideoMobileVisibility', quoteVideoMobileVisibilitySchema);
