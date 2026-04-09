const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');
const path = require('path');

dotenv.config();


const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration for Deployment
app.use(cors({ 
  origin: function(origin, callback) {
    // Allowed origins for production
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.FRONTEND_URL // For deployed frontend
    ];
    
    // Allow requests with no origin (mobile apps, curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In production, only allow specified origins
    if (process.env.NODE_ENV === 'production') {
      return callback(new Error('Not allowed by CORS'), false);
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
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/donations', require('./routes/donationRoutes'));

app.get('/', (req, res) => {
  res.json({ 
    message: 'SustainaBite API is running...',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
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
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌍 API URL: http://localhost:${PORT}`);
  });
};

startServer();
