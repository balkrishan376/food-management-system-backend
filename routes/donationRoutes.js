const express = require('express');
const router = express.Router();
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

router.post('/', protect, authorize('donor'), upload.single('image'), createDonation);
router.get('/my-donations', protect, authorize('donor'), getMyDonations);
router.get('/nearby', protect, authorize('receiver'), getNearbyDonations);
router.get('/claimed', protect, authorize('receiver'), getClaimedDonations);
router.patch('/:id/claim', protect, authorize('receiver'), claimDonation);

module.exports = router;
