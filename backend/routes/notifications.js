const express = require('express');
const router = express.Router();

const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');


// ======================================================
// 🔔 FONCTION NOTIFICATION (FIXÉE)
// ======================================================

function notifierAdminsEtSuperviseurs({ titre, message, type = 'info' }) {
  const db = getDb();

  // 1. récupérer les users valides
  const utilisateurs = db.prepare(`
    SELECT id
    FROM users
    WHERE role IN ('admin', 'superviseur')
      AND actif = 1
  `).all();

  if (!utilisateurs || utilisateurs.length === 0) {
    console.log("⚠️ Aucun admin/superviseur trouvé");
    return;
  }

  // 2. requête insert sécurisée
  const insertNotif = db.prepare(`
    INSERT INTO notifications (
      user_id,
      titre,
      message,
      type,
      lu,
      created_at
    )
    VALUES (?, ?, ?, ?, 0, datetime('now'))
  `);

  // 3. insertion SAFE
  utilisateurs.forEach(u => {
    if (!u?.id) return;

    insertNotif.run(
      u.id,
      titre || '',
      message || '',
      type || 'info'
    );
  });
}


// ======================================================
// 📥 GET NOTIFICATIONS
// ======================================================

router.get('/', authenticate, (req, res) => {
  try {
    const limit = Number(req.query.limit || 30);

    const notifications = getDb()
      .prepare(`
        SELECT *
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(req.user.id, limit);

    res.json(notifications);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur récupération notifications' });
  }
});


// ======================================================
// 🔢 COUNT UNREAD
// ======================================================

router.get('/unread-count', authenticate, (req, res) => {
  try {
    const result = getDb()
      .prepare(`
        SELECT COUNT(*) AS count
        FROM notifications
        WHERE user_id = ?
          AND lu = 0
      `)
      .get(req.user.id);

    res.json({ count: result?.count || 0 });

  } catch (error) {
    console.error(error);
    res.status(500).json({ count: 0 });
  }
});


// ======================================================
// ✅ MARK AS READ
// ======================================================

router.put('/:id/read', authenticate, (req, res) => {
  try {
    getDb()
      .prepare(`
        UPDATE notifications
        SET lu = 1
        WHERE id = ?
          AND user_id = ?
      `)
      .run(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Notification marquée comme lue'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur mise à jour' });
  }
});


// ======================================================
// 📖 MARK ALL READ
// ======================================================

router.put('/read-all', authenticate, (req, res) => {
  try {
    getDb()
      .prepare(`
        UPDATE notifications
        SET lu = 1
        WHERE user_id = ?
      `)
      .run(req.user.id);

    res.json({
      success: true,
      message: 'Toutes les notifications sont lues'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur mise à jour' });
  }
});


// ======================================================
// 🗑 DELETE NOTIFICATION
// ======================================================

router.delete('/:id', authenticate, (req, res) => {
  try {
    getDb()
      .prepare(`
        DELETE FROM notifications
        WHERE id = ?
          AND user_id = ?
      `)
      .run(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Notification supprimée'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur suppression' });
  }
});


// ======================================================
// EXPORT PROPRE
// ======================================================

module.exports = {
  router,
  notifierAdminsEtSuperviseurs
};