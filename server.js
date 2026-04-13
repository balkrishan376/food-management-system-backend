const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const path = require('path');

dotenv.config();


const app = express();

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.get('Content-Type') || 'no content-type'}`);
  next();
});

// Security Middleware
app.use(helmet());

// CORS Configuration for Deployment
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://food-management-system-frontend.vercel.app',
  'https://food-wastage-management.vercel.app'
];

app.use(cors({ 
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in our allowed list
    if (allowedOrigins.includes(origin) || (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)) {
      return callback(null, true);
    }
    
    // Allow all vercel.app subdomains for better compatibility with preview deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // In production, be strict but log why it failed
    if (process.env.NODE_ENV === 'production') {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
    }
    
    // In development, allow all origins
    return callback(null, true);
  }, 
  credentials: true 
}));

app.use(express.json({ limit: '10kb' }));
// app.use(mongoSanitize()); // Disabled due to Express TypeError

// Serve uploads directory statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to 1000 to accommodate 10-second telemetry polling
  message: 'Too many requests from this IP, please try again in 15 minutes',
  skip: (req) => process.env.NODE_ENV !== 'production'
});
app.use('/api', limiter);

// Routes
// Manual CORS fallback + OPTIONS preflight handler for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || (origin && origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/donations', require('./routes/donationRoutes'));

app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    // If connected, try to ping
    if (dbStatus === 'connected') {
      await mongoose.connection.db.admin().ping();
    }

    res.json({
      status: 'ok',
      deployId: 'v2.1-CORS-REFRESH-1776081704',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      deployId: 'v2.1-CORS-REFRESH-1776081704',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'SustainaBite API is running...',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const dbConnected = await connectDB();

  if (!dbConnected) {
    console.warn('⚠️  Starting server without database connection');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌍 API URL: http://localhost:${PORT}`);
    console.log(`🗄️  Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
  });
};

// Check if we are running on Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
} else {
  // Ensure DB is connected in Vercel Serverless environment
  connectDB().catch(console.error);
}

module.exports = app;
