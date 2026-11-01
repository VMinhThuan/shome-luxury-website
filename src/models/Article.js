const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  legacyId: { type: String, trim: true, unique: true, sparse: true, index: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, index: true },
  author: { type: String, default: 'SHOME LUXURY', trim: true },
  date: { type: String, default: '' },
  category: { type: String, default: 'Tin tức', trim: true },
  status: { type: String, enum: ['published', 'draft', 'private', 'trash'], default: 'published', index: true },
  isPublished: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false },
  thumbnail: { type: String, default: '' },
  image: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  summary: { type: String, default: '' },
  excerpt: { type: String, default: '' },
  readTime: { type: String, default: '5 phút đọc' },
  sections: { type: mongoose.Schema.Types.Mixed, default: [] },
  fullHtmlContent: { type: String, default: '' },
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' },
  tags: { type: [String], default: [] },
  relatedArticleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
  publishedAt: { type: Date, default: null }
}, { timestamps: true });

articleSchema.index({ status: 1, isPublished: 1, updatedAt: -1 });

module.exports = mongoose.models.Article || mongoose.model('Article', articleSchema);
