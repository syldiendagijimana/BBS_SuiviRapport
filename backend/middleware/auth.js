// Backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const SECRET = process.env.JWT_SECRET || 'bbs_secret_2024';

function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = header.split(' ')[1];
    const payload = jwt.verify(token, SECRET);

    console.log("TOKEN PAYLOAD =", payload);

    const userId = payload.id || payload.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Token invalide (id manquant)' });
    }

    const user = getDb()
      .prepare('SELECT id, nom, prenom, role, actif FROM users WHERE id = ? AND actif = 1')
      .get(userId);

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable ou désactivé' });
    }

    // 🔥 IMPORTANT: on normalise l’objet user
    req.user = {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role
    };

    next();

  } catch (err) {
    console.error("AUTH ERROR:", err.message);
    return res.status(401).json({ error: 'Token invalide' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    next();
  };
}

module.exports = { authenticate, authorize, SECRET };