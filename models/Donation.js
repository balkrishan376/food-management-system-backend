const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: ['Food', 'Clothes', 'Money', 'Necessities', 'Other'], default: 'Food' },
    foodType: { type: String, enum: ['veg', 'non-veg', 'both'] },
    imageUrl: { type: String },
    quantity: { type: String, required: true },
    description: { type: String },
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    address: { type: String, required: true },
    expiryTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['available', 'claimed', 'completed', 'expired'],
      default: 'available',
    },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

donationSchema.index({ location: '2dsphere' });
donationSchema.index({ status: 1, expiryTime: 1 });

module.exports = mongoose.model('Donation', donationSchema);
