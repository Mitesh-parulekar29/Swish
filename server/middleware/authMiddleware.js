const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protects routes by requiring a valid `Authorization: Bearer <token>` header.
// On success, attaches the authenticated user document to req.user.
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Covers both expired and malformed/invalid tokens.
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid or expired token',
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user no longer exists',
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while authenticating',
    });
  }
};

module.exports = authMiddleware;
