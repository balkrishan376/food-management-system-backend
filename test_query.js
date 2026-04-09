const mongoose = require('mongoose');
const Donation = require('./models/Donation');
async function test() {
  await mongoose.connect('mongodb://localhost:27017/food_wastage');
  try {
    const donations = await Donation.find({
      status: 'available',
      location: {
        $near: {
          $maxDistance: 50000,
          $geometry: { type: 'Point', coordinates: [77.209, 28.6139] }
        }
      }
    });
    console.log('Success, found', donations.length);
  } catch(e) {
    console.log('Mongoose Query Error:', e.message);
  }
  process.exit();
}
test();
