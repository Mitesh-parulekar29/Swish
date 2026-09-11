const User = require('../models/User');

// The User model requires a unique `username`, but the registration flow in the
// auth spec only collects name/email/password/role. Rather than adding an extra
// field to the form, we derive a username from the email's local part and make
// it unique by appending a short numeric suffix if it's already taken.
// (If the frontend later wants users to pick their own username, this can be
// swapped for a value coming straight from req.body.)
const generateUsername = async (email) => {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 24) || 'user';

  let candidate = base;
  let attempt = 0;

  // Keep trying until we find a username that isn't taken.
  while (await User.exists({ username: candidate })) {
    attempt += 1;
    const suffix = String(Math.floor(100 + Math.random() * 900));
    candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`;
    if (attempt > 10) {
      // Extremely unlikely, but fall back to a fully random handle.
      candidate = `user${Date.now().toString().slice(-8)}`;
      break;
    }
  }

  return candidate;
};

module.exports = generateUsername;
