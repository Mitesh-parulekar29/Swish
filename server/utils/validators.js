// Small dependency-free validation helpers shared by controllers.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isEmail = (value) =>
  typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value.trim());

const isNonEmptyString = (value, max = 1000) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;

// Escape user input before putting it inside a RegExp (prevents ReDoS / regex injection).
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Passwords: 8-72 chars (bcrypt ignores bytes past 72), at least one letter and one number.
const passwordProblem = (password) => {
  if (typeof password !== 'string') return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (password.length > 72) return 'Password must be 72 characters or fewer';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
};

module.exports = { isEmail, isNonEmptyString, escapeRegex, passwordProblem };
