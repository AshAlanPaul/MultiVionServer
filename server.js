require('dotenv').config(); 
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

const allowedOrigins = [
  'https://multivion.onrender.com', // Your production frontend
  'http://127.0.0.1:5500',         // Live Server default
  'http://localhost:5500'          // Alternative localhost
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
