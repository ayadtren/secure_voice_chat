const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const forge = require('node-forge');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('./utils/logger');
const { generateSelfSignedCert } = require('./utils/certificates');

// Configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const USE_HTTPS = process.env.USE_HTTPS === 'true' || NODE_ENV === 'production';

// In-memory user registry (no persistence)
const activeUsers = new Map();
const activeConnections = new Map();

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'wss:', 'ws:'],
      mediaSrc: ["'self'", 'blob:'],
      imgSrc: ["'self'", 'data:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: NODE_ENV === 'production' ? false : '*',
  methods: ['GET', 'HEAD'],
  credentials: true
}));

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of points
  duration: 60, // Per minute
});

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (err) {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).send('Too Many Requests');
  }
});

// Serve static files from the client build directory in production
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build/index.html'));
  });
} else {
  // Serve the client in development mode too
  app.use(express.static(path.join(__dirname, '../../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/build/index.html'));
  });
}

// Health check endpoint (admin only)
app.get('/health', (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    connections: activeConnections.size,
    users: activeUsers.size,
    memory: process.memoryUsage(),
  };
  
  res.json(health);
});

// Create HTTP or HTTPS server
let server;

if (USE_HTTPS) {
  // Generate or load SSL certificates
  let sslOptions;
  
  try {
    sslOptions = {
      key: fs.readFileSync(path.join(__dirname, '../config/key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '../config/cert.pem'))
    };
    logger.info('Loaded existing SSL certificates');
  } catch (err) {
    logger.info('Generating self-signed SSL certificates');
    const { key, cert } = generateSelfSignedCert();
    
    // Ensure config directory exists
    const configDir = path.join(__dirname, '../config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Save certificates for future use
    fs.writeFileSync(path.join(configDir, 'key.pem'), key);
    fs.writeFileSync(path.join(configDir, 'cert.pem'), cert);
    
    sslOptions = { key, cert };
  }
  
  server = https.createServer(sslOptions, app);
  logger.info('Created HTTPS server');
} else {
  server = http.createServer(app);
  logger.info('Created HTTP server (not recommended for production)');
}

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`New connection: ${socket.id}`);
  
  // Store connection
  activeConnections.set(socket.id, {
    id: socket.id,
    timestamp: Date.now(),
    username: null
  });
  
  // User registration
  socket.on('register', ({ username }) => {
    if (!username || typeof username !== 'string') {
      socket.emit('error', { message: 'Invalid username' });
      return;
    }
    
    // Sanitize username and ensure uniqueness
    const sanitizedUsername = username.trim().slice(0, 32);
    
    // Check if username is already taken
    const usernameTaken = Array.from(activeUsers.values())
      .some(user => user.username === sanitizedUsername);
    
    if (usernameTaken) {
      socket.emit('error', { message: 'Username already taken' });
      return;
    }
    
    // Register user
    const user = {
      id: socket.id,
      username: sanitizedUsername,
      timestamp: Date.now()
    };
    
    activeUsers.set(socket.id, user);
    activeConnections.get(socket.id).username = sanitizedUsername;
    
    logger.info(`User registered: ${sanitizedUsername} (${socket.id})`);
    
    // Notify user of successful registration
    socket.emit('registered', { username: sanitizedUsername });
    
    // Broadcast updated user list to all clients
    io.emit('userList', Array.from(activeUsers.values()).map(u => ({
      id: u.id,
      username: u.username
    })));
  });
  
  // WebRTC signaling
  socket.on('offer', ({ target, offer }) => {
    if (!activeUsers.has(socket.id) || !activeUsers.has(target)) {
      socket.emit('error', { message: 'Invalid user' });
      return;
    }
    
    logger.info(`Offer from ${socket.id} to ${target}`);
    io.to(target).emit('offer', {
      from: socket.id,
      offer
    });
  });
  
  socket.on('answer', ({ target, answer }) => {
    if (!activeUsers.has(socket.id) || !activeUsers.has(target)) {
      socket.emit('error', { message: 'Invalid user' });
      return;
    }
    
    logger.info(`Answer from ${socket.id} to ${target}`);
    io.to(target).emit('answer', {
      from: socket.id,
      answer
    });
  });
  
  socket.on('iceCandidate', ({ target, candidate }) => {
    if (!activeUsers.has(socket.id) || !activeUsers.has(target)) {
      socket.emit('error', { message: 'Invalid user' });
      return;
    }
    
    logger.info(`ICE candidate from ${socket.id} to ${target}`);
    io.to(target).emit('iceCandidate', {
      from: socket.id,
      candidate
    });
  });
  
  // Disconnect handling
  socket.on('disconnect', () => {
    logger.info(`Connection closed: ${socket.id}`);
    
    // Remove user from active users
    if (activeUsers.has(socket.id)) {
      const user = activeUsers.get(socket.id);
      activeUsers.delete(socket.id);
      
      // Broadcast updated user list
      io.emit('userList', Array.from(activeUsers.values()).map(u => ({
        id: u.id,
        username: u.username
      })));
      
      logger.info(`User disconnected: ${user.username} (${socket.id})`);
    }
    
    // Remove connection
    activeConnections.delete(socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
  logger.info(`Using ${USE_HTTPS ? 'HTTPS' : 'HTTP'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
