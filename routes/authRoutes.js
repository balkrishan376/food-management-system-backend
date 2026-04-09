const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { registerUser, loginUser, getUserProfile, updateUserProfile } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Middleware to check database connection
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database connection not available. Please check your MongoDB configuration.'
    });
  }
  next();
};

router.post('/register', checkDBConnection, registerUser);
router.post('/login', checkDBConnection, loginUser);
router.get('/profile', protect, checkDBConnection, getUserProfile);
router.put('/profile', protect, checkDBConnection, updateUserProfile);

module.exports = router;
