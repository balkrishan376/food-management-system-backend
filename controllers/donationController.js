const Donation = require('../models/Donation');

// @desc    Create a new donation
// @route   POST /api/donations
// @access  Private/Donor
const createDonation = async (req, res) => {
  try {
    const { category, foodType, quantity, description, address, longitude, latitude, expiryTime } = req.body;

    let imageUrl;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };

    const donation = new Donation({
      donorId: req.user._id,
      category: category || 'Food',
      foodType,
      quantity,
      description,
      location,
      address,
      expiryTime,
      imageUrl,
    });

    const savedDonation = await donation.save();
    res.status(201).json(savedDonation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get nearby available donations
// @route   GET /api/donations/nearby
// @access  Private/Receiver
const getNearbyDonations = async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query; // radius in km

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Please provide latitude and longitude' });
    }

    const donations = await Donation.find({
      status: 'available',
      expiryTime: { $gt: new Date() }, // Not expired
      location: {
        $near: {
          $maxDistance: radius * 1000, // Convert km to meters
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
        },
      },
    }).populate('donorId', 'name contactNumber organization');

    res.status(200).json({ count: donations.length, data: donations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Claim a donation
// @route   PATCH /api/donations/:id/claim
// @access  Private/Receiver
const claimDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status !== 'available') {
      return res.status(400).json({ message: 'Donation is no longer available' });
    }

    donation.status = 'claimed';
    donation.claimedBy = req.user._id;

    await donation.save();
    res.json({ message: 'Donation claimed successfully', donation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user's donations (For donors)
// @route   GET /api/donations/my-donations
// @access  Private/Donor
const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donorId: req.user._id }).sort({ createdAt: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in receiver's claimed donations
// @route   GET /api/donations/claimed
// @access  Private/Receiver
const getClaimedDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ claimedBy: req.user._id })
      .populate('donorId', 'name contactNumber organization')
      .sort({ updatedAt: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDonation,
  getNearbyDonations,
  claimDonation,
  getMyDonations,
  getClaimedDonations,
};
