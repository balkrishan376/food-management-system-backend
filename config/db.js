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

    // Close any existing connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
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
