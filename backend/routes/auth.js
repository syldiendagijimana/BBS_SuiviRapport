const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { authenticate, SECRET } = require('../middleware/auth');


// ======================
// LOGIN
// ======================
router.post('/login', (req, res) => {
  try {
    console.log("➡️ LOGIN BODY:", req.body);

    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '').trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis"
      });
    }

    const db = getDb();

    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur introuvable"
      });
    }

    if (user.actif === 0) {
      return res.status(403).json({
        success: false,
        message: "Compte désactivé"
      });
    }

    const valid = bcrypt.compareSync(password, user.password);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe incorrect"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email
      },
      SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userSafe } = user;

    return res.json({
      success: true,
      token,
      user: userSafe
    });

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
});


// ======================
// ME
// ======================
router.get('/me', authenticate, (req, res) => {
  const { password: _, ...userSafe } = req.user;
  res.json(userSafe);
});


// ======================
// LOGOUT
// ======================
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});


// ======================
// CHANGE PASSWORD (FIX IMPORTANT)
// ======================
router.post('/change-password', authenticate, (req, res) => {
  try {
    const ancien_password = String(req.body.ancien_password || '');
    const nouveau_password = String(req.body.nouveau_password || '');

    if (!ancien_password || !nouveau_password) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis'
      });
    }

    const db = getDb();

    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(req.user.id);

    const valid = bcrypt.compareSync(ancien_password, user.password);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Ancien mot de passe incorrect'
      });
    }

    const hash = bcrypt.hashSync(nouveau_password, 10);

    db.prepare(`
      UPDATE users
      SET password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(hash, req.user.id);

    res.json({
      success: true,
      message: 'Mot de passe modifié'
    });

  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);

    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;