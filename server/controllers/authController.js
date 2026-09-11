const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const generateUsername = require('../utils/generateUsername');
const { ROLES } = require('../models/User');

// POST /api/auth/register
// Creates a new user. Does NOT log the user in or return a token -
// the frontend is expected to send them to /login after a successful response.
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const safeRole = ROLES.includes(role) ? role : 'student';
    const username = await generateUsername(normalizedEmail);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: safeRole,
      username,
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toPublicJSON(),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Something went wrong during registration',
    });
  }
};

// POST /api/auth/login
// Authenticates an existing user and returns a JWT + user profile.
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // password has `select: false` on the schema, so it must be explicitly requested.
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended',
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your account before logging in',
      });
    }

    user.lastActiveAt = new Date();
    await user.save();

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: user.toPublicJSON(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong during login',
    });
  }
};

// GET /api/auth/me
// Returns the currently authenticated user. Relies on authMiddleware having
// already verified the JWT and attached req.user.
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Authenticated user retrieved successfully',
    data: {
      user: req.user.toPublicJSON(),
    },
  });
};

module.exports = { register, login, getMe };
