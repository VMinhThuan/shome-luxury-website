const mongoose = require('mongoose');

// Content is intentionally schema-light: the layout is owned by the frontend,
// while every label, image, CTA and repeatable item remains CMS-editable.
const quotePageSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'main' },
  sections: { type: mongoose.Schema.Types.Mixed, default: {} },
  isVisible: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.QuotePage || mongoose.model('QuotePage', quotePageSchema);
