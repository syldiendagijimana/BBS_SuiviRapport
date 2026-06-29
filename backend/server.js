require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// ===== CORS (IMPORTANT pour mobile) =====
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===== BODY PARSER (IMPORTANT LOGIN 400) =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== UPLOADS =====
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ===== DATABASE =====
const { getDb } = require('./db/database');
getDb();

// ===== ROUTES =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/techniciens', require('./routes/techniciens'));
app.use('/api/rapports', require('./routes/rapports'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/reseau', require('./routes/reseau'));
app.use('/api/stats', require('./routes/statistiques'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications').router);

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'BBS API',
    db: 'SQLite',
    time: new Date()
  });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 BBS API démarrée sur port ${PORT}`);
});