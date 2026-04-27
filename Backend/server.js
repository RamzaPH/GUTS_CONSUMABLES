const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const { Op } = require('sequelize');
require('dotenv').config();

const sequelize = require('./config/database');
const inventoryRoutes = require('./routes/inventoryRoutes');
const historyRoutes = require('./routes/historyRoutes');
const authRoutes = require('./routes/authRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const courseRoutes = require('./routes/courseRoutes');
const requestRoutes = require('./routes/requestRoutes');
const User = require('./models/User');
const Trainer = require('./models/Trainer');
const Course = require('./models/Course');
const Consumable = require('./models/Consumable');
const InventoryHistory = require('./models/InventoryHistory');
const Notification = require('./models/Notification');
const ConsumableRequest = require('./models/ConsumableRequest');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

const alignConsumableRequestSchema = async () => {
  // Keep legacy databases compatible with the new "New Consumable" request flow.
  const statements = [
    "ALTER TABLE consumable_requests MODIFY consumable_id INT UNSIGNED NULL",
    "ALTER TABLE consumable_requests MODIFY request_type ENUM('Stock In','Stock Out','New Consumable') NOT NULL",
  ];

  for (const sql of statements) {
    try {
      await sequelize.query(sql);
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes("doesn't exist")) {
        continue;
      }
      console.warn(`⚠  Schema alignment warning: ${message}`);
    }
  }
};

// ─── Socket.IO Setup ──────────────────────────────────────────────────────────
const userSockets = {}; // Map userId to socket ID

io.on('connection', (socket) => {
  console.log(`📱 Socket connected: ${socket.id}`);

  // When user logs in, register their socket
  socket.on('user_connect', (userId) => {
    userSockets[userId] = socket.id;
    console.log(`✓ User ${userId} connected to notifications`);
  });

  // When user disconnects
  socket.on('disconnect', () => {
    // Remove user from map
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        console.log(`✗ User ${userId} disconnected`);
      }
    }
  });
});

// Make io accessible globally
global.io = io;
global.userSockets = userSockets;

// Make io accessible to routes
app.locals.io = io;
app.locals.userSockets = userSockets;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  optionsSuccessStatus: 200,
}));

app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api', trainerRoutes);
app.use('/api', courseRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✔  Database connection established.');

    await alignConsumableRequestSchema();

    // Set up associations
    const models = { User, Trainer, Course, Consumable, InventoryHistory, Notification, ConsumableRequest };
    Object.values(models).forEach(model => {
      if (model.associate) {
        model.associate(models);
      }
    });

    // Sync models with database
    await sequelize.sync({ alter: true });
    console.log('✔  Database models synced.');

    // Initialize default users
    try {
      const existingAdmin = await User.count({
        where: {
          [Op.or]: [
            { username: 'admin' },
            { email: 'admin@vailacademy.org' },
          ],
        },
      });
      if (existingAdmin === 0) {
        await User.create({
          username: 'admin',
          email: 'admin@vailacademy.org',
          password: 'admin123456',
          fullName: 'System Administrator',
          role: 'admin',
          isActive: true,
        });
        console.log('✔  Admin user created (username: admin, password: admin123456)');
      } else {
        console.log('ℹ  Admin user already exists');
      }
    } catch (adminErr) {
      console.error('⚠  Admin user creation error:', adminErr.message);
      if (adminErr.errors) {
        adminErr.errors.forEach(err => console.error('  -', err.message));
      }
    }

    try {
      const existingStaff = await User.count({
        where: {
          [Op.or]: [
            { username: 'staff' },
            { email: 'staff@vailacademy.org' },
          ],
        },
      });
      if (existingStaff === 0) {
        await User.create({
          username: 'staff',
          email: 'staff@vailacademy.org',
          password: 'staff123456',
          fullName: 'Staff Member',
          role: 'staff',
          isActive: true,
        });
        console.log('✔  Staff user created (username: staff, password: staff123456)');
      } else {
        console.log('ℹ  Staff user already exists');
      }
    } catch (staffErr) {
      console.error('⚠  Staff user creation error:', staffErr.message);
      if (staffErr.errors) {
        staffErr.errors.forEach(err => console.error('  -', err.message));
      }
    }

    server.listen(PORT, () => {
      console.log(`✔  Server running → http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

start();
