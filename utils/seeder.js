const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Donation = require('../models/Donation');
const connectDB = require('../config/db');

// Load env vars
dotenv.config();

const users = [
  {
    name: 'Amit Sender',
    email: 'sender@example.com',
    password: 'password123',
    role: 'donor',
    contactNumber: '1234567890',
    location: { type: 'Point', coordinates: [77.1025, 28.7041] }
  },
  {
    name: 'Rahul Donor',
    email: 'rahul@example.com',
    password: 'password123',
    role: 'donor',
    contactNumber: '9988776655',
    location: { type: 'Point', coordinates: [77.2090, 28.6139] }
  },
  {
    name: 'Bal Krishan NGO',
    email: 'receiver@example.com',
    password: 'password123',
    role: 'receiver',
    contactNumber: '0987654321',
    organization: 'Helping Hands NGO',
    location: { type: 'Point', coordinates: [77.2090, 28.6139] }
  },
  {
    name: 'Green Earth Foundation',
    email: 'green@example.com',
    password: 'password123',
    role: 'receiver',
    contactNumber: '1122334455',
    organization: 'Green Earth NGO',
    location: { type: 'Point', coordinates: [77.3910, 28.5355] }
  },
  {
    name: 'System Admin',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    contactNumber: '1122334455',
    location: { type: 'Point', coordinates: [0, 0] }
  }
];

const seedData = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('Checking for existing users...');
    const createdUsers = [];
    
    for (const u of users) {
      let user = await User.findOne({ email: u.email });
      if (user) {
        console.log(`ℹ️ User ${u.email} already exists.`);
      } else {
        user = await User.create(u);
        console.log(`✅ User ${u.email} (${u.role}) created successfully.`);
      }
      createdUsers.push(user);
    }

    const donor = createdUsers.find(u => u.role === 'donor' && u.email === 'sender@example.com');
    
    if (donor) {
      console.log('\nCreating sample donations...');
      const donations = [
        {
          donorId: donor._id,
          category: 'Food',
          foodType: 'veg',
          quantity: '5 kg',
          description: 'Fresh vegetables and rice from yesterday\'s event.',
          address: 'Sector 62, Noida, UP',
          location: { type: 'Point', coordinates: [77.3673, 28.6297] },
          expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          status: 'available'
        },
        {
          donorId: donor._id,
          category: 'Food',
          foodType: 'both',
          quantity: '10 meals',
          description: 'Packed lunch boxes (Veg/Non-Veg) from corporate catering.',
          address: 'Connaught Place, Delhi',
          location: { type: 'Point', coordinates: [77.2167, 28.6328] },
          expiryTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
          status: 'available'
        },
        {
          donorId: donor._id,
          category: 'Clothes',
          quantity: '2 bags',
          description: 'Winter jackets and blankets in good condition.',
          address: 'Rohini Sector 7, Delhi',
          location: { type: 'Point', coordinates: [77.1139, 28.7056] },
          expiryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
          status: 'available'
        }
      ];

      for (const d of donations) {
        const donationExists = await Donation.findOne({ description: d.description });
        if (!donationExists) {
          await Donation.create(d);
          console.log(`✅ Donation "${d.description.substring(0, 20)}..." created.`);
        } else {
          console.log(`ℹ️ Donation "${d.description.substring(0, 20)}..." already exists.`);
        }
      }
    }

    console.log('\n✨ Database seeding process finished.');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error during seeding: ${error.message}`);
    process.exit(1);
  }
};

seedData();

