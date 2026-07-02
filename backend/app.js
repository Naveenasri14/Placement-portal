const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Vite default port
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Health Check Route
app.use('/api/health', async (req, res) => {
  const { pool } = require('./config/db');
  try {
    // Check DB connection
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'success',
      message: 'Server is healthy and Database is connected successfully.'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Server is running, but database connection failed.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

module.exports = app;
