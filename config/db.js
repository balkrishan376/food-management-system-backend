const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI in backend/.env');
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      bufferCommands: false,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    console.error(`MongoDB connection failed: ${error.message}`);

    if (isProduction) {
      process.exit(1);
    }

    console.warn('Continuing without database connection for local preview.');
    return false;
  }
};

module.exports = connectDB;
