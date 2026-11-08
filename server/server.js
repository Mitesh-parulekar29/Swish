require('dotenv').config();
const path = require('path');
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const {
  corsMiddleware,
  helmetMiddleware,
  sanitizeInput,
  apiLimiter,
} = require('./middleware/securityMiddleware');

const app = express();

// Behind a proxy (Render, Heroku, Nginx) so rate limiting sees the real client IP.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
app.disable('x-powered-by');

// Connect to MongoDB
connectDB();

// Core middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '100kb' }));
app.use(sanitizeInput);
app.use('/api', apiLimiter);

// Serve locally uploaded files (development storage)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route to confirm the server is running.
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Swish backend is running',
  });
});

// Auth API
app.use('/api/auth', authRoutes);

// Posts API
app.use('/api/posts', postRoutes);

// Users API
app.use('/api/users', userRoutes);

// Notifications API
app.use('/api/notifications', notificationRoutes);

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Basic error handler (catches errors passed via next(err))
app.use((err, req, res, next) => {
  if (err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ success: false, message: err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body too large' });
  }
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});