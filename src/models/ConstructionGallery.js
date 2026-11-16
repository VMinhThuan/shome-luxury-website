const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, default: null },
  format: { type: String, default: 'webp' },
  width: { type: Number, default: null },
  height: { type: Number, default: null },
  bytes: { type: Number, default: null },
  alt: { type: String, default: '' }
}, { _id: true });

const constructionGallerySchema = new mongoose.Schema({
  page_key: { type: String, required: true },
  section_key: { type: String, enum: ['in-progress', 'completed'], required: true },
  images: { type: [imageSchema], default: [] }
}, { timestamps: true });

constructionGallerySchema.index({ page_key: 1, section_key: 1 }, { unique: true });

module.exports = mongoose.models.ConstructionGallery
  || mongoose.model('ConstructionGallery', constructionGallerySchema);
