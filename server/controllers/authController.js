const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const generateUsername = require('../utils/generateUsername');
const { ROLES } = require('../models/User');
const { isEmail, isNonEmptyString, passwordProblem } = require('../utils/validators');

// Roles a visitor may pick at signup. 'admin' can never be self-assigned.
const SELF_SERVE_ROLES = ROLES.filter((r) => r !== 'admin');

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

    if (!isNonEmptyString(name, 80)) {
      return res.status(400).json({ success: false, message: 'Name must be 1-80 characters' });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' });
    }

    const pwProblem = passwordProblem(password);
    if (pwProblem) {
      return res.status(400).json({ success: false, message: pwProblem });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const safeRole = SELF_SERVE_ROLES.includes(role) ? role : 'student';
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

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
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
  console.error("LOGIN ERROR:", error);

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

// PUT /api/auth/change-password
// Requires the current password before allowing a new one to be set.
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password and confirmation are all required',
      });
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid password data' });
    }

    const newPwProblem = passwordProblem(newPassword);
    if (newPwProblem) {
      return res.status(400).json({ success: false, message: newPwProblem });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match',
      });
    }

    // password has `select: false` on the schema, so it must be explicitly requested.
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password',
      });
    }

    user.password = newPassword;
    await user.save();

    return res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while changing your password',
    });
  }
};

module.exports = { register, login, getMe, changePassword };