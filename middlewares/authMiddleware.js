const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Use native MongoDB driver to avoid mongoose buffering issues
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database not connected');
      }

      req.user = await db.collection('users').findOne(
        { _id: new mongoose.Types.ObjectId(decoded.id) },
        { projection: { password: 0 } } // Exclude password field
      );

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
