/*
 * Assigns every project a random cost from 200 to 500 million VND.
 *
 * Preview: node scripts/seed-project-costs.js
 * Apply:   node scripts/seed-project-costs.js --apply
 */
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Project = require('../src/models/Project');

const MIN_COST = 200000000;
const MAX_COST = 500000000;
const STEP = 1000000;
const shouldApply = process.argv.includes('--apply');

function randomProjectCost() {
  const choices = Math.floor((MAX_COST - MIN_COST) / STEP) + 1;
  return MIN_COST + Math.floor(Math.random() * choices) * STEP;
}

async function seedProjectCosts() {
  await connectDB();
  const projects = await Project.find({}, '_id').lean();
  const updates = projects.map(project => ({
    updateOne: {
      filter: { _id: project._id },
      update: { $set: { cost: randomProjectCost() } }
    }
  }));

  if (!shouldApply) {
    console.log(`Preview only: ${updates.length} project(s) would receive a random cost from 200–500 million VND.`);
    console.log('Run again with --apply to write the update.');
    return;
  }

  if (!updates.length) {
    console.log('No projects found.');
    return;
  }

  const result = await Project.bulkWrite(updates, { ordered: false });
  console.log(`Updated ${result.modifiedCount} of ${updates.length} project(s) with random costs.`);
}

seedProjectCosts()
  .catch(error => {
    console.error('Failed to seed project costs:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
