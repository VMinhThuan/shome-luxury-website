const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  investor: {
    type: String,
    default: null,
    trim: true
  },
  location: {
    type: String,
    default: null,
    trim: true
  },
  area: {
    type: String,
    default: null,
    trim: true
  },
  cost: {
    type: Number,
    default: null,
    min: [200000000, 'Chi phí tối thiểu là 200 triệu đồng'],
    max: [500000000, 'Chi phí tối đa là 500 triệu đồng']
  },
  propertyType: {
    type: String,
    default: null,
    enum: [
      'Căn hộ 1 PN',
      'Căn hộ 2 PN',
      'Căn hộ 3 PN',
      'Nhà phố',
      'Biệt thự',
      'Villa',
      'Văn phòng'
    ]
  },
  style: {
    type: String,
    default: null,
    trim: true
  },
  excerpt: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['published', 'draft', 'private', 'trash'],
    default: 'published',
    index: true
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  // Quote-page highlight fields. `featured` remains available for legacy cards.
  isHighlight: {
    type: Boolean,
    default: false,
    index: true
  },
  highlightOrder: {
    type: Number,
    default: 0
  },
  isVisible: {
    type: Boolean,
    default: true,
    index: true
  },
  categoryIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    index: true
  }],
  thumbnail: {
    type: String,
    default: null
  },
  gallery: [{
    type: String
  }],
  legacy: {
    wordpressId: { type: Number, index: true },
    oldUrl: { type: String },
    originalTitle: { type: String }
  }
}, {
  timestamps: true
});

projectSchema.index({ status: 1, categoryIds: 1, createdAt: -1 });
projectSchema.index({ status: 1, featured: 1, createdAt: -1 });
projectSchema.index({ status: 1, isVisible: 1, isHighlight: 1, highlightOrder: 1 });

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
