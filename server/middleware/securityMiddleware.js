const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// ---------- CORS ----------
// CLIENT_URL may be a comma separated list. If unset, localhost dev origins are allowed.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsMiddleware = cors({
  origin(origin, cb) {
    // Allow non-browser clients (curl, health checks) that send no Origin header.
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
});

// ---------- Security headers ----------
// crossOriginResourcePolicy is relaxed so the client (different origin) can load /uploads images.
const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// ---------- NoSQL injection guard ----------
// express-mongo-sanitize is not compatible with Express 5, so this strips Mongo operator
// keys ($gt, $ne, dotted paths) from req.body, the only place nested objects can arrive.
// Express 5's default query parser is flat (no nested objects), and controllers coerce
// query values with String(), so req.query cannot carry operators.
const isDangerousKey = (key) => key.startsWith('$') || key.includes('.');

const stripDangerousKeys = (value, depth = 0) => {
  if (!value || typeof value !== 'object' || depth > 10) return;
  if (Array.isArray(value)) {
    value.forEach((item) => stripDangerousKeys(item, depth + 1));
    return;
  }
  Object.keys(value).forEach((key) => {
    if (isDangerousKey(key)) {
      delete value[key];
    } else {
      stripDangerousKeys(value[key], depth + 1);
    }
  });
};

const sanitizeInput = (req, res, next) => {
  stripDangerousKeys(req.body);
  stripDangerousKeys(req.params);
  next();
};

// ---------- Rate limiting ----------
const buildLimiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ success: false, message }),
  });

// Whole API: 300 requests / 15 min / IP
const apiLimiter = buildLimiter(
  15 * 60 * 1000,
  Number(process.env.RATE_LIMIT_API_MAX) || 300,
  'Too many requests. Please slow down and try again shortly.'
);

// Login + register: brute-force protection, 10 attempts / 15 min / IP
const authLimiter = buildLimiter(
  15 * 60 * 1000,
  Number(process.env.RATE_LIMIT_AUTH_MAX) || 10,
  'Too many login attempts. Please try again in 15 minutes.'
);

// Content creation (posts, comments): 30 / 10 min / IP
const writeLimiter = buildLimiter(
  10 * 60 * 1000,
  Number(process.env.RATE_LIMIT_WRITE_MAX) || 30,
  'You are posting too quickly. Please wait a few minutes.'
);

module.exports = {
  corsMiddleware,
  helmetMiddleware,
  sanitizeInput,
  apiLimiter,
  authLimiter,
  writeLimiter,
};
