// routes/reseau.js
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/reseau/bande-passante
router.get('/bande-passante', authenticate, (req, res) => {
  const { zone } = req.query;
  let query = 'SELECT * FROM bande_passante';
  const params = [];
  if (zone) { query += ' WHERE zone = ?'; params.push(zone); }
  query += ' ORDER BY timestamp DESC LIMIT 100';
  res.json(getDb().prepare(query).all(...params));
});

// GET /api/reseau/bande-passante/latest
router.get('/bande-passante/latest', authenticate, (req, res) => {
  const latest = getDb().prepare(`
    SELECT b1.*
    FROM bande_passante b1
    INNER JOIN (
      SELECT zone, MAX(timestamp) as max_ts FROM bande_passante GROUP BY zone
    ) b2 ON b1.zone = b2.zone AND b1.timestamp = b2.max_ts
    ORDER BY b1.pourcentage_utilisation DESC
  `).all();
  res.json(latest);
});

// POST /api/reseau/bande-passante - Enregistrer mesure
router.post('/bande-passante', authenticate, (req, res) => {
  const { zone, utilisation_mbps, capacite_mbps } = req.body;
  if (!zone || utilisation_mbps === undefined || !capacite_mbps)
    return res.status(400).json({ error: 'Données requises' });

  const pct = (utilisation_mbps / capacite_mbps) * 100;
  const statut = pct > 90 ? 'critique' : pct > 75 ? 'congestion' : 'normal';

  const result = getDb().prepare(`
    INSERT INTO bande_passante (zone, utilisation_mbps, capacite_mbps, pourcentage_utilisation, statut)
    VALUES (?, ?, ?, ?, ?)
  `).run(zone, utilisation_mbps, capacite_mbps, pct.toFixed(2), statut);

  // Alerte automatique congestion
  if (statut === 'critique') {
    const admins = getDb().prepare("SELECT id FROM users WHERE role IN ('admin','superviseur') AND actif=1").all();
    const insertNotif = getDb().prepare(`INSERT INTO notifications (user_id, titre, message, type) VALUES (?, ?, ?, ?)`);
    admins.forEach(a => insertNotif.run(a.id, 'Congestion Critique', `Zone ${zone}: ${pct.toFixed(1)}% utilisé`, 'critique'));
  }

  res.status(201).json({ id: result.lastInsertRowid, statut, pourcentage: pct.toFixed(2) });
});

// GET /api/reseau/historique/:zone
router.get('/historique/:zone', authenticate, (req, res) => {
  const data = getDb().prepare(`
    SELECT * FROM bande_passante WHERE zone = ? ORDER BY timestamp DESC LIMIT 50
  `).all(req.params.zone);
  res.json(data);
});

// GET /api/reseau/notifications
router.get('/notifications', authenticate, (req, res) => {
  const notifs = getDb().prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.user.id);
  res.json(notifs);
});

// PATCH /api/reseau/notifications/:id/lu
router.patch('/notifications/:id/lu', authenticate, (req, res) => {
  getDb().prepare('UPDATE notifications SET lu = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Notification marquée comme lue' });
});

// PATCH /api/reseau/notifications/tout-lire
router.patch('/notifications/tout-lire', authenticate, (req, res) => {
  getDb().prepare('UPDATE notifications SET lu = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'Toutes les notifications marquées comme lues' });
});

module.exports = router;
