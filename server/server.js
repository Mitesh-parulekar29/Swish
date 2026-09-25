require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Core middleware
app.use(cors());
app.use(express.json());

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

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Basic error handler (catches errors passed via next(err))
app.use((err, req, res, next) => {
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