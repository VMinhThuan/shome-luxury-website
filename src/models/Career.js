const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema({
  legacyId: { type: String, trim: true, unique: true, sparse: true, index: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, index: true },
  author: { type: String, default: 'SHOME LUXURY', trim: true },
  date: { type: String, default: '' },
  category: { type: String, default: 'Tuyển dụng', trim: true },
  isHot: { type: Boolean, default: false },
  status: { type: String, enum: ['published', 'draft', 'private', 'trash'], default: 'published', index: true },
  isPublished: { type: Boolean, default: true, index: true },
  isClosed: { type: Boolean, default: false, index: true },
  thumbnail: { type: String, default: '' },
  image: { type: String, default: '' },
  imagePublicId: { type: String, default: '' },
  summary: { type: String, default: '' },
  location: { type: String, default: '' },
  workType: { type: String, default: '' },
  salary: { type: String, default: '' },
  experience: { type: String, default: '' },
  quantity: { type: String, default: '' },
  deadline: { type: String, default: '' },
  sections: { type: mongoose.Schema.Types.Mixed, default: [] },
  fullHtmlContent: { type: String, default: '' },
  requirements: { type: [String], default: [] },
  benefits: { type: [String], default: [] },
  contactDetails: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

careerSchema.index({ status: 1, isPublished: 1, updatedAt: -1 });

module.exports = mongoose.models.Career || mongoose.model('Career', careerSchema);
