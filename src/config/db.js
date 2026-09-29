const mongoose = require('mongoose');

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shome_luxury';
  try {
    await mongoose.connect(mongoUri);
    console.log(`[Mongoose] Connected to MongoDB at ${mongoUri}`);
  } catch (err) {
    console.error(`[Mongoose] Connection Error:`, err);
    throw err;
  }
}

module.exports = connectDB;
