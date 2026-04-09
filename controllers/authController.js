const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  console.log('Register user request received:', req.body.email);
  try {
    const { name, email, password, role, contactNumber, organization, longitude, latitude } = req.body;

    // Use native MongoDB driver to avoid mongoose buffering issues
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database not connected');
    }

    console.log('Checking if user exists...');
    const existingUser = await db.collection('users').findOne({ email });
    console.log('User exists check completed:', !!existingUser);

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const location = {
      type: 'Point',
      coordinates: [longitude || 0, latitude || 0],
    };

    const userData = {
      name,
      email,
      password: await bcrypt.hash(password, 10), // Hash password
      role,
      contactNumber,
      organization,
      location,
      createdAt: new Date(),
    };

    console.log('Creating user...');
    const result = await db.collection('users').insertOne(userData);
    console.log('User created successfully:', result.insertedId);

    if (result.insertedId) {
      res.status(201).json({
        _id: result.insertedId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        token: generateToken(result.insertedId),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database not connected');
    }

    const user = await db.collection('users').findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database not connected');
    }

    const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(req.user._id) });

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        contactNumber: user.contactNumber,
        organization: user.organization,
        location: user.location,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const { name, email, contactNumber, organization, password, longitude, latitude } = req.body;
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database not connected');
    }

    const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(req.user._id) });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== user.email) {
      const existingUser = await db.collection('users').findOne({ email });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const updateData = {
      name: name || user.name,
      email: email || user.email,
      contactNumber: contactNumber || user.contactNumber,
      organization: organization !== undefined ? organization : user.organization,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (longitude !== undefined || latitude !== undefined) {
      updateData.location = {
        type: 'Point',
        coordinates: [
          longitude !== undefined ? longitude : user.location?.coordinates?.[0] || 0,
          latitude !== undefined ? latitude : user.location?.coordinates?.[1] || 0,
        ],
      };
    }

    const result = await db.collection('users').updateOne(
      { _id: new mongoose.Types.ObjectId(req.user._id) },
      { $set: updateData }
    );

    if (result.modifiedCount > 0) {
      const updatedUser = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(req.user._id) });
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        contactNumber: updatedUser.contactNumber,
        organization: updatedUser.organization,
        location: updatedUser.location,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(400).json({ message: 'Update failed' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
};
