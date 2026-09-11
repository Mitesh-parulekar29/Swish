const jwt = require('jsonwebtoken');

// Signs a JWT containing the user's id (and role, for convenience on the client).
// Keeping this in one place means the expiry/secret logic only lives here.
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = generateToken;
