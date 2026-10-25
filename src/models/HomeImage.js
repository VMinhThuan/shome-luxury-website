const mongoose = require('mongoose');

// One document represents one existing image slot on the home page.  The
// layout is deliberately not stored here: it remains owned by the templates.
const homeImageSchema = new mongoose.Schema({
  page_key: { type: String, default: 'home' },
  section_key: { type: String, required: true },
  image_key: { type: String, required: true, unique: true },
  image_url: { type: String, required: true },
  cloudinary_public_id: { type: String, default: null }
}, { timestamps: { createdAt: false, updatedAt: 'updated_at' } });

module.exports = mongoose.models.HomeImage || mongoose.model('HomeImage', homeImageSchema);
