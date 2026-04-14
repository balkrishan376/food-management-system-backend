const mongoose = require('mongoose');

// Disable buffering globally before any operations
mongoose.set('bufferCommands', false);

// Connection state monitoring
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI in backend/.env');
    }

    // If already connected, reuse connection (important for serverless)
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB: reusing existing connection');
      return true;
    }

    // Close only if in a broken state (not connected, not connecting)
    if (mongoose.connection.readyState === 3) {
      await mongoose.connection.close();
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 60000,
    });

    // Wait for the connection to be fully ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection ready timeout'));
      }, 10000);

      if (mongoose.connection.readyState === 1) {
        clearTimeout(timeout);
        resolve();
      } else {
        mongoose.connection.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });
      }
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Ensure buffering is disabled after connection
    mongoose.set('bufferCommands', false);

    return true;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    // NEVER call process.exit() — let the server stay alive and return 503 on DB routes
    console.warn('Server will continue running without database. DB-dependent routes will return 503.');
    return false;
  }
};

module.exports = connectDB;
