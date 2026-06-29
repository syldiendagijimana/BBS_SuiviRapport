// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { notifierAdminsEtSuperviseurs } = require('./notifications');

// ─────────────────────────────────────────────
// GET ALL USERS
// ─────────────────────────────────────────────
router.get('/', authenticate, authorize('admin', 'superviseur'), (req, res) => {
  const users = getDb().prepare(
    'SELECT id, nom, prenom, email, role, actif, created_at FROM users ORDER BY created_at DESC'
  ).all();

  res.json(users);
});

// ─────────────────────────────────────────────
// GET ONE USER
// ─────────────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
  const user = getDb().prepare(
    'SELECT id, nom, prenom, email, role, actif, created_at FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  res.json(user);
});

// ─────────────────────────────────────────────
// CREATE USER
// ─────────────────────────────────────────────
router.post('/', authenticate, authorize('admin'), (req, res) => {
  const { nom, prenom, email, password, role } = req.body;

  if (!nom || !prenom || !email || !password || !role) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  const db = getDb();

  const existing = db.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).get(email);

  if (existing) {
    return res.status(409).json({ error: 'Email déjà utilisé' });
  }

  const hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (nom, prenom, email, password, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(nom, prenom, email, hash, role);

  const userId = result.lastInsertRowid;

  // notification
  notifierAdminsEtSuperviseurs({
    titre: 'Nouvel utilisateur',
    message: `${req.user.prenom} ${req.user.nom} a créé ${prenom} ${nom} (${role})`,
    type: 'info',
    excludeUserId: req.user.id
  });

  // si technicien
  if (role === 'technicien') {
    try {
      db.prepare(`
        INSERT INTO techniciens (
          user_id,
          matricule,
          specialite,
          zone_intervention,
          telephone
        )
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, '', '', '', '');
    } catch (err) {
      console.error('Erreur création technicien:', err.message);
    }
  }

  res.status(201).json({
    id: userId,
    message: 'Utilisateur créé'
  });
});

// ─────────────────────────────────────────────
// UPDATE USER
// ─────────────────────────────────────────────
router.put('/:id', authenticate, authorize('admin'), (req, res) => {
  const { nom, prenom, email, role, password } = req.body;
  const db = getDb();

  const user = db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  let query = `
    UPDATE users
    SET nom=?, prenom=?, email=?, role=?, updated_at=CURRENT_TIMESTAMP
  `;

  const params = [
    nom || user.nom,
    prenom || user.prenom,
    email || user.email,
    role || user.role
  ];

  if (password) {
    query += ', password=?';
    params.push(bcrypt.hashSync(password, 10));
  }

  query += ' WHERE id=?';
  params.push(req.params.id);

  db.prepare(query).run(...params);

  notifierAdminsEtSuperviseurs({
    titre: 'Utilisateur modifié',
    message: `${req.user.prenom} ${req.user.nom} a modifié ${user.prenom} ${user.nom}`,
    type: 'alerte',
    excludeUserId: req.user.id
  });

  res.json({ message: 'Utilisateur modifié' });
});

// ─────────────────────────────────────────────
// TOGGLE ACTIVE
// ─────────────────────────────────────────────
router.patch('/:id/toggle', authenticate, authorize('admin'), (req, res) => {
  const db = getDb();

  const user = db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  if (user.id === req.user.id) {
    return res.status(400).json({ error: 'Impossible de se désactiver soi-même' });
  }

  db.prepare(
    'UPDATE users SET actif = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(!user.actif ? 1 : 0, req.params.id);

  res.json({
    message: `Compte ${!user.actif ? 'activé' : 'désactivé'}`
  });
});

// ─────────────────────────────────────────────
// DELETE USER
// ─────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const db = getDb();

  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Impossible de supprimer son propre compte' });
  }

  const deletedUser = db.prepare(
    'SELECT nom, prenom, role FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!deletedUser) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  db.prepare('DELETE FROM techniciens WHERE user_id = ?')
    .run(req.params.id);

  const result = db.prepare('DELETE FROM users WHERE id = ?')
    .run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  notifierAdminsEtSuperviseurs({
    titre: 'Utilisateur supprimé',
    message: `${req.user.prenom} ${req.user.nom} a supprimé ${deletedUser.prenom} ${deletedUser.nom} (${deletedUser.role})`,
    type: 'critique',
    excludeUserId: req.user.id
  });

  res.json({ message: 'Utilisateur supprimé' });
});

module.exports = router;