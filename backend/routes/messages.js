//Backend/routeds/messages.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

// =========================
// UPLOAD CONFIG
// =========================
const uploadDir = 'uploads/messages';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, name + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// =========================
// GET MESSAGES (avec status + media + reactions)
// =========================
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDb();

    const rows = db.prepare(`
      SELECT m.*, u.nom, u.prenom, u.role
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.is_deleted = 0
      ORDER BY m.created_at ASC
      LIMIT 100
    `).all();

    const host = `${req.protocol}://${req.get('host')}`;

    const messages = rows.map(msg => {
      const media = db.prepare(`
        SELECT *
        FROM message_media
        WHERE message_id = ? AND is_deleted = 0
      `).all(msg.id);

      const reactions = db.prepare(`
        SELECT *
        FROM message_reactions
        WHERE message_id = ?
      `).all(msg.id);

      const status = db.prepare(`
        SELECT *
        FROM message_status
        WHERE message_id = ?
      `).all(msg.id);

      return {
        ...msg,
        media: media.map(m => ({
          id: m.id,
          type: m.type,
          url: m.url || `${host}/uploads/messages/${m.chemin}`
        })),
        reactions,
        status
      };
    });

    res.json({ messages });

  } catch (err) {
    console.error('[GET MESSAGES]', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =========================
// SEND TEXT MESSAGE
// =========================
router.post('/', authenticate, (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message vide' });
    }

    const db = getDb();

    const result = db.prepare(`
      INSERT INTO messages (sender_id, message, type)
      VALUES (?, ?, 'text')
    `).run(req.user.id, message.trim());

    const msg = db.prepare(`
      SELECT m.*, u.nom, u.prenom
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: msg });

  } catch (err) {
    console.error('[SEND MESSAGE]', err);
    res.status(500).json({ error: 'Erreur envoi message' });
  }
});

// =========================
// SEND MEDIA
// =========================
router.post('/media', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier manquant' });
    }

    const { type = 'image' } = req.body;
    const db = getDb();

    const result = db.prepare(`
      INSERT INTO messages (sender_id, message, type)
      VALUES (?, NULL, ?)
    `).run(req.user.id, type);

    const messageId = result.lastInsertRowid;

    db.prepare(`
      INSERT INTO message_media
      (message_id, type, nom_fichier, chemin, mime_type, taille)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      type,
      req.file.originalname,
      req.file.filename,
      req.file.mimetype,
      req.file.size
    );

    const host = `${req.protocol}://${req.get('host')}`;

    const msg = db.prepare(`
      SELECT m.*, u.nom, u.prenom
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.id = ?
    `).get(messageId);

    const media = db.prepare(`
      SELECT *
      FROM message_media
      WHERE message_id = ?
    `).all(messageId);

    res.status(201).json({
      message: {
        ...msg,
        media: media.map(m => ({
          id: m.id,
          type: m.type,
          url: m.url || `${host}/uploads/messages/${m.chemin}`
        }))
      }
    });

  } catch (err) {
    console.error('[MEDIA]', err);
    res.status(500).json({ error: 'Erreur upload media' });
  }
});

// =========================
// DELETE MESSAGE (soft)
// =========================
router.delete('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();

    db.prepare(`
      UPDATE messages
      SET is_deleted = 1
      WHERE id = ? AND sender_id = ?
    `).run(req.params.id, req.user.id);

    res.json({ success: true });

  } catch (err) {
    console.error('[DELETE]', err);
    res.status(500).json({ error: 'Erreur suppression' });
  }
});

// =========================
// EDIT MESSAGE
// =========================
router.put('/:id', authenticate, (req, res) => {
  try {
    const { message } = req.body;
    const db = getDb();

    db.prepare(`
      UPDATE messages
      SET message = ?, is_edited = 1, edited_at = CURRENT_TIMESTAMP
      WHERE id = ? AND sender_id = ?
    `).run(message, req.params.id, req.user.id);

    res.json({ success: true });

  } catch (err) {
    console.error('[EDIT]', err);
    res.status(500).json({ error: 'Erreur édition' });
  }
});

// =========================
// SEEN (✓✓ WhatsApp)
// =========================
router.post('/seen/:id', authenticate, (req, res) => {
  try {
    const db = getDb();

    db.prepare(`
      UPDATE messages
      SET is_seen = 1
      WHERE id = ?
    `).run(req.params.id);

    res.json({ success: true });

  } catch (err) {
    console.error('[SEEN]', err);
    res.status(500).json({ error: 'Erreur seen' });
  }
});

// =========================
// REACTION ❤️😂🔥
// =========================
router.post('/reaction/:id', authenticate, (req, res) => {
  try {
    const { reaction } = req.body;
    const db = getDb();

    db.prepare(`
      INSERT INTO message_reactions (message_id, user_id, reaction)
      VALUES (?, ?, ?)
      ON CONFLICT(message_id, user_id)
      DO UPDATE SET reaction = excluded.reaction
    `).run(req.params.id, req.user.id, reaction);

    res.json({ success: true });

  } catch (err) {
    console.error('[REACTION]', err);
    res.status(500).json({ error: 'Erreur reaction' });
  }
});

module.exports = router;