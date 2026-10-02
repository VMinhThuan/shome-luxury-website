/*
 * Assigns every project a property type from the supported project-type list.
 *
 * Preview: node scripts/seed-project-property-types.js
 * Apply:   node scripts/seed-project-property-types.js --apply
 */
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Project = require('../src/models/Project');

const PROPERTY_TYPES = [
  'Căn hộ 1 PN',
  'Căn hộ 2 PN',
  'Căn hộ 3 PN',
  'Nhà phố',
  'Biệt thự',
  'Villa',
  'Văn phòng'
];
const shouldApply = process.argv.includes('--apply');

function randomPropertyType() {
  return PROPERTY_TYPES[Math.floor(Math.random() * PROPERTY_TYPES.length)];
}

async function seedProjectPropertyTypes() {
  await connectDB();
  const projects = await Project.find({}, '_id').lean();
  const updates = projects.map(project => ({
    updateOne: {
      filter: { _id: project._id },
      update: { $set: { propertyType: randomPropertyType() } }
    }
  }));

  if (!shouldApply) {
    console.log(`Preview only: ${updates.length} project(s) would receive a property type.`);
    console.log('Run again with --apply to write the update.');
    return;
  }

  if (!updates.length) {
    console.log('No projects found.');
    return;
  }

  const result = await Project.bulkWrite(updates, { ordered: false });
  console.log(`Updated ${result.modifiedCount} of ${updates.length} project(s) with property types.`);
}

seedProjectPropertyTypes()
  .catch(error => {
    console.error('Failed to seed project property types:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
