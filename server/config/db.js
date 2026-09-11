const mongoose = require('mongoose');

// Connects to MongoDB using the URI from environment variables.
// Keeping this separate from server.js keeps connection logic reusable and testable.
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    // Never log the actual URI - it may contain credentials
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;