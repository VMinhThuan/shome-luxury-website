const mongoose = require('mongoose');

const imageReferenceSchema = new mongoose.Schema({
  page_key: { type: String, required: true },
  section_key: { type: String, required: true },
  image_key: { type: String, required: true }
}, { _id: false });

const customImageReferenceSchema = new mongoose.Schema({
  image_url: { type: String, default: null },
  cloudinary_public_id: { type: String, default: null }
}, { _id: false });

// One document represents one existing image slot on the home page.  The
// layout is deliberately not stored here: it remains owned by the templates.
const homeImageSchema = new mongoose.Schema({
  page_key: { type: String, default: 'home' },
  section_key: { type: String, required: true },
  image_key: { type: String, required: true, unique: true },
  image_url: { type: String, required: true },
  cloudinary_public_id: { type: String, default: null },

  // `custom_image_reference` is intentionally independent from the active
  // image. Switching a slot to shared mode therefore never overwrites or
  // deletes the previously uploaded custom asset.
  mode: { type: String, enum: ['shared', 'custom'], default: 'custom' },
  shared_image_reference: { type: imageReferenceSchema, default: null },
  custom_image_reference: { type: customImageReferenceSchema, default: null }
}, { timestamps: { createdAt: false, updatedAt: 'updated_at' } });

module.exports = mongoose.models.HomeImage || mongoose.model('HomeImage', homeImageSchema);
