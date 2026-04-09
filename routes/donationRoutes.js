const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

const {
  createDonation,
  getNearbyDonations,
  claimDonation,
  getMyDonations,
  getClaimedDonations,
} = require('../controllers/donationController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Middleware to check database connection
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database connection not available. Please check your MongoDB configuration.'
    });
  }
  next();
};

router.post('/', protect, authorize('donor'), checkDBConnection, upload.single('image'), createDonation);
router.get('/my-donations', protect, authorize('donor'), checkDBConnection, getMyDonations);
router.get('/nearby', protect, authorize('receiver'), checkDBConnection, getNearbyDonations);
router.get('/claimed', protect, authorize('receiver'), checkDBConnection, getClaimedDonations);
router.patch('/:id/claim', protect, authorize('receiver'), checkDBConnection, claimDonation);

module.exports = router;
