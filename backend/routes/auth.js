// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { authenticate, SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    console.log("LOGIN BODY:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis"
      });
    }

    const user = getDb()
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur introuvable"
      });
    }

    if (!user.actif) {
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
      { id: user.id, role: user.role, email: user.email },
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
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
});
// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { password: _, ...userSafe } = req.user;
  res.json(userSafe);
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Déconnexion réussie' });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, (req, res) => {
  const { ancien_password, nouveau_password } = req.body;
  if (!ancien_password || !nouveau_password) return res.status(400).json({ error: 'Champs requis' });

  const valid = bcrypt.compareSync(ancien_password, req.user.password);
  if (!valid) return res.status(400).json({ error: 'Ancien mot de passe incorrect' });

  const hash = bcrypt.hashSync(nouveau_password, 10);
  getDb().prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.user.id);
  res.json({ message: 'Mot de passe modifié' });
});

module.exports = router;
