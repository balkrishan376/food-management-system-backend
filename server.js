// Deploy: 2026-04-14T13:31:00Z — force Render redeploy
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const path = require('path');

dotenv.config();

const app = express();

// ─── CORS MUST BE FIRST ──────────────────────────────────────────────────────
// Allow all vercel.app origins + localhost for development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://food-management-system-frontend.vercel.app',
  'https://food-wastage-management.vercel.app',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow explicit list
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any FRONTEND_URL set in env
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return callback(null, true);
    // Allow all *.vercel.app preview deployments
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow localhost for dev
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return callback(null, true);
    console.warn(`⚠️  CORS blocked origin: ${origin}`);
    return callback(new Error(`Not allowed by CORS: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['X-Requested-With', 'Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200,
};

// Handle preflight OPTIONS for all routes immediately
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ─── SECURITY & PARSING ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '10kb' }));

// Serve uploads directory statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again in 15 minutes',
  skip: (req) => process.env.NODE_ENV !== 'production',
});
app.use('/api', limiter);

// ─── REQUEST LOGGING ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── DB HEALTH GUARD ─────────────────────────────────────────────────────────
// For auth & donation routes, if DB is not connected, attempt reconnect once then 503
const requireDB = async (req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  console.log('DB not ready, attempting reconnect...');
  try {
    await connectDB();
    if (mongoose.connection.readyState === 1) return next();
  } catch (e) {
    console.error('Reconnect failed:', e.message);
  }
  return res.status(503).json({
    success: false,
    message: 'Database is temporarily unavailable. Please try again in a moment.',
  });
};

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth', requireDB, require('./routes/authRoutes'));
app.use('/api/donations', requireDB, require('./routes/donationRoutes'));

// Health check — always responds, shows DB state
app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  
  let pinged = false;
  if (dbState === 1) {
    try {
      await mongoose.connection.db.admin().ping();
      pinged = true;
    } catch (e) { /* ignore */ }
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    dbPing: pinged,
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'SustainaBite API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ─── ERROR HANDLER ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  // If this is a CORS error, still send CORS headers
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ success: false, message: err.message });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── SERVER START ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Attempt DB connection, but start server regardless
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected (will retry per-request)'}`);
  });
};

// On Vercel (serverless), just connect the DB and export. Don't call listen().
if (process.env.VERCEL) {
  connectDB().catch((e) => console.error('Initial DB connect failed on Vercel:', e.message));
} else {
  startServer().catch((e) => {
    console.error('Fatal startup error:', e.message);
    // Don't exit — let the process stay alive
  });
}

module.exports = app;
