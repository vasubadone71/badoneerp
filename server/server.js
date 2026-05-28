require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const { testConnection, initializeDatabase } = require('./config/db');
const apiRoutes = require('./routes/api');
const socketService = require('./services/socketService');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // To be restricted in production
    methods: ['GET', 'POST']
  }
});

socketService.init(io);

// Security Middleware
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// General Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads, exports, etc.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/exports', express.static(path.join(__dirname, 'exports')));

// API Routes
app.use('/api', apiRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test DB connection
    await testConnection();
    // Initialize DB schema
    await initializeDatabase();
    
    server.listen(PORT, () => {
      console.log(`[VPS Cloud Backend] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
