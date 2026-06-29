// server.js - BBS Backend API
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Init DB
const { getDb } = require('./db/database');
const messagesRoutes = require('./routes/messages');
getDb(); // Initialize on startup

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/techniciens', require('./routes/techniciens'));
app.use('/api/rapports', require('./routes/rapports'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/reseau', require('./routes/reseau'));
app.use('/api/stats', require('./routes/statistiques'));
app.use('/api/messages', messagesRoutes);
const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes.router);
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', version: '1.0.0', service: 'BBS API' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur interne' });
});
app.use(
  '/uploads',
  express.static('uploads')
);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BBS API démarrée sur le port ${PORT}`);
  console.log(`📡 Accès: http://localhost:${PORT}/api/health`);
});
