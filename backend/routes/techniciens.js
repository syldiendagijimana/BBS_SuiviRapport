// routes/techniciens.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/techniciens
router.get('/', authenticate, (req, res) => {
  const list = getDb().prepare(`
    SELECT t.*, u.nom, u.prenom, u.email
    FROM techniciens t
    LEFT JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `).all();
  res.json(list);
});

// GET /api/techniciens/:id
router.get('/:id', authenticate, (req, res) => {
  const tech = getDb().prepare(`
    SELECT t.*, u.nom, u.prenom, u.email
    FROM techniciens t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!tech) return res.status(404).json({ error: 'Technicien introuvable' });
  res.json(tech);
});

// GET /api/techniciens/:id/missions
router.get('/:id/missions', authenticate, (req, res) => {
  const missions = getDb().prepare(`
    SELECT * FROM taches WHERE technicien_id = ? ORDER BY created_at DESC
  `).all(req.params.id);
  res.json(missions);
});

// POST /api/techniciens
router.post('/', authenticate, authorize('admin', 'superviseur'), (req, res) => {

  const {
    nom,
    prenom,
    email,
    password,
    matricule,
    specialite,
    zone_intervention,
    telephone
  } = req.body;

  if (!nom || !prenom || !email || !password || !matricule) {
    return res.status(400).json({
      error: 'Nom, prénom, email, mot de passe et matricule sont requis'
    });
  }

  const db = getDb();

  const existing = db.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).get(email);

  if (existing) {
    return res.status(409).json({
      error: 'Email déjà utilisé'
    });
  }

  const hash = bcrypt.hashSync(password, 10);

  const userResult = db.prepare(`
    INSERT INTO users (
      nom,
      prenom,
      email,
      password,
      role
    )
    VALUES (?, ?, ?, ?, ?)
  `).run(
    nom,
    prenom,
    email,
    hash,
    'technicien'
  );

  const userId = userResult.lastInsertRowid;

  const techResult = db.prepare(`
    INSERT INTO techniciens (
      user_id,
      matricule,
      specialite,
      zone_intervention,
      telephone
    )
    VALUES (?, ?, ?, ?, ?)
  `).run(
    userId,
    matricule,
    specialite || '',
    zone_intervention || '',
    telephone || ''
  );

  res.status(201).json({
    id: techResult.lastInsertRowid,
    user_id: userId,
    message: 'Technicien créé avec succès'
  });

});
// PUT /api/techniciens/:id
router.put('/:id', authenticate, authorize('admin', 'superviseur'), (req, res) => {

  const {
    nom,
    prenom,
    email,
    password,
    matricule,
    specialite,
    zone_intervention,
    telephone,
    disponible
  } = req.body;

  const db = getDb();

  const tech = db.prepare(
    'SELECT * FROM techniciens WHERE id = ?'
  ).get(req.params.id);

  if (!tech) {
    return res.status(404).json({
      error: 'Technicien introuvable'
    });
  }

  const user = db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).get(tech.user_id);
   if (!user) {
     return res.status(404).json({
       error: 'Utilisateur associé introuvable'
     });
   }

  let userQuery = `
    UPDATE users
    SET nom = ?,
        prenom = ?,
        email = ?
  `;

  let userParams = [
    nom || user.nom,
    prenom || user.prenom,
    email || user.email
  ];

  if (password && password.trim()) {
    userQuery += ', password = ?';
    userParams.push(
      bcrypt.hashSync(password, 10)
    );
  }

  userQuery += ' WHERE id = ?';

  userParams.push(user.id);

  db.prepare(userQuery).run(...userParams);

  db.prepare(`
    UPDATE techniciens
    SET matricule=?,
        specialite=?,
        zone_intervention=?,
        telephone=?,
        disponible=?
    WHERE id=?
  `).run(
    matricule || tech.matricule,
    specialite || tech.specialite,
    zone_intervention || tech.zone_intervention,
    telephone || tech.telephone,
    disponible !== undefined
      ? disponible
      : tech.disponible,
    req.params.id
  );

  res.json({
    message: 'Technicien modifié'
  });

});

// POST /api/techniciens/:id/taches - Affecter une tâche
router.post('/:id/taches', authenticate, authorize('admin', 'superviseur'), (req, res) => {
  const { titre, description, zone, priorite, date_debut, date_fin } = req.body;
  if (!titre) return res.status(400).json({ error: 'Titre requis' });

  const result = getDb().prepare(`
    INSERT INTO taches (technicien_id, titre, description, zone, priorite, date_debut, date_fin)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, titre, description, zone, priorite || 'normale', date_debut, date_fin);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Tâche affectée' });
});

// DELETE /api/techniciens/:id
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const result = getDb().prepare('DELETE FROM techniciens WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Technicien introuvable' });
  res.json({ message: 'Technicien supprimé' });
});

module.exports = router;
