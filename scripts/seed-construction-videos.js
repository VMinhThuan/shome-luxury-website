/*
 * Adds the initial YouTube videos for /thi-cong-cong-trinh.
 * Safe to run repeatedly: existing videos are updated by youtubeId.
 */
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' });

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const ConstructionVideo = require('../src/models/ConstructionVideo');

const videos = [
  'IqO2XS3pfeI',
  '6MI1OK4vGG8',
  'BJ05sMw_0pI',
  'WYjbmuwg9sA',
  'r2NAeBz2Kd4',
  'CqxGqhGhFZ4'
];

async function seedConstructionVideos() {
  await connectDB();
  const operations = videos.map((youtubeId, index) => ({
    updateOne: {
      filter: { youtubeId },
      update: { $set: { youtubeId, sortOrder: index + 1, isVisible: true } },
      upsert: true
    }
  }));
  const result = await ConstructionVideo.bulkWrite(operations, { ordered: false });
  console.log(`Construction videos ready: ${result.upsertedCount} added, ${result.modifiedCount} updated.`);
}

seedConstructionVideos()
  .catch(error => {
    console.error('Failed to seed construction videos:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
