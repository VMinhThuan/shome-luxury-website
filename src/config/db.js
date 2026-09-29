const mongoose = require('mongoose');

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shome_luxury';
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[Mongoose] Connected to MongoDB successfully`);
  } catch (err) {
    console.error(`[Mongoose] Connection Error (${mongoUri}):`, err.message);
    throw err;
  }
}

module.exports = connectDB;
