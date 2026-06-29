require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// =========================
// CREATE UPLOADS FOLDER
// =========================
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// =========================
// MIDDLEWARE (CRITIQUE ORDER)
// =========================

// 1. CORS (FIRST)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. BODY PARSER (IMPORTANT)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 3. STATIC FILES
app.use('/uploads', express.static(uploadsDir));

// =========================
// DEBUG MIDDLEWARE (TEMP - REMOVE LATER)
// =========================
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// =========================
// INIT DB
// =========================
const { getDb } = require('./db/database');
getDb();

// =========================
// ROUTES
// =========================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/techniciens', require('./routes/techniciens'));
app.use('/api/rapports', require('./routes/rapports'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/reseau', require('./routes/reseau'));
app.use('/api/stats', require('./routes/statistiques'));

const messagesRoutes = require('./routes/messages');
app.use('/api/messages', messagesRoutes);

const notificationsRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationsRoutes.router);

// =========================
// HEALTH CHECK (RENDER)
// =========================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    version: '1.0.0',
    service: 'BBS API'
  });
});

// =========================
// 404 HANDLER
// =========================
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// =========================
// ERROR HANDLER
// =========================
app.use((err, req, res, next) => {
  console.error('🔥 SERVER ERROR:', err);
  res.status(500).json({
    error: 'Erreur serveur interne'
  });
});

// =========================
// START SERVER (RENDER SAFE)
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 BBS API running on port ${PORT}`);
});