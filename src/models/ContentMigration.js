const mongoose = require('mongoose');

const contentMigrationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.ContentMigration || mongoose.model('ContentMigration', contentMigrationSchema);
