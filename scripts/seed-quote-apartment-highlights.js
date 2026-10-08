/*
 * Selects four apartment-interior projects for the quotation-page highlight area.
 * Preview: node scripts/seed-quote-apartment-highlights.js
 * Apply:   node scripts/seed-quote-apartment-highlights.js --apply
 */
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Category = require('../src/models/Category');
const Project = require('../src/models/Project');

const shouldApply = process.argv.includes('--apply');
const CATEGORY_CODE = 'tk-nt-chung-cu';

async function seedQuoteApartmentHighlights() {
  await connectDB();
  const category = await Category.findOne({ code: CATEGORY_CODE }).lean();
  if (!category) throw new Error(`Không tìm thấy category ${CATEGORY_CODE}.`);

  const projects = await Project.find({
    categoryIds: category._id,
    status: 'published',
    isVisible: { $ne: false }
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(4)
    .select('_id title slug')
    .lean();

  if (projects.length < 4) throw new Error(`Category chỉ có ${projects.length} công trình hợp lệ, cần tối thiểu 4.`);

  console.log(`Category: ${category.name}`);
  projects.forEach((project, index) => console.log(`${index + 1}. ${project.title} (${project.slug})`));

  if (!shouldApply) {
    console.log('Preview only. Chạy lại với --apply để lưu 4 Highlight này.');
    return;
  }

  const selectedIds = projects.map(project => project._id);
  await Project.updateMany(
    { categoryIds: category._id, _id: { $nin: selectedIds }, isHighlight: true },
    { $set: { isHighlight: false, highlightOrder: 0 } }
  );
  const updates = projects.map((project, index) => ({
    updateOne: {
      filter: { _id: project._id },
      update: { $set: { isHighlight: true, highlightOrder: index + 1, isVisible: true } }
    }
  }));
  await Project.bulkWrite(updates, { ordered: true });
  console.log('Đã thiết lập 4 công trình Highlight cho Báo giá.');
}

seedQuoteApartmentHighlights()
  .catch(error => {
    console.error('Không thể seed Highlight:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
