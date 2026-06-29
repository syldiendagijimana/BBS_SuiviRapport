const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

// ===============================
// MULTER CONFIG
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ===============================
// GET ALL
// ===============================
router.get('/', authenticate, (req, res) => {
  try {
    let query = `
      SELECT r.*, u.nom, u.prenom, u.role
      FROM rapports r
      LEFT JOIN users u ON r.user_id = u.id
    `;
    const params = [];

    if (req.user.role === 'technicien' || req.user.role === 'utilisateur') {
      query += ' WHERE r.user_id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY r.created_at DESC';
    const rapports = getDb().prepare(query).all(...params);
    const host = `${req.protocol}://${req.get('host')}`;

    const result = rapports.map(r => ({
      ...r,
      photos: getDb()
        .prepare(`SELECT * FROM photos_rapport WHERE rapport_id = ?`)
        .all(r.id)
        .map(p => ({ ...p, url: `${host}/uploads/${p.chemin}` }))
    }));

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===============================
// GET ONE
// ===============================
router.get('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const rapport = db.prepare(`
      SELECT r.*, u.nom, u.prenom, u.role
      FROM rapports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!rapport) return res.status(404).json({ error: 'Rapport introuvable' });

    const host = `${req.protocol}://${req.get('host')}`;
    rapport.photos = db
      .prepare(`SELECT * FROM photos_rapport WHERE rapport_id = ?`)
      .all(rapport.id)
      .map(p => ({ ...p, url: `${host}/uploads/${p.chemin}` }));

    res.json(rapport);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===============================
// CREATE
// ===============================
router.post('/', authenticate, upload.array('photos', 5), (req, res) => {
  try {
    console.log('REQ BODY:', req.body);
    console.log('REQ FILES:', req.files);

    const {
      titre,
      description_panne,
      solution_appliquee,
      heure_intervention,
      localisation,
      statut
    } = req.body;

    const cleanTitre = (titre || '').trim();
    const cleanDesc  = (description_panne || '').trim();
    const cleanHeure = (heure_intervention || '').trim();

    if (!cleanTitre || !cleanDesc || !cleanHeure) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants',
        recu: { titre, description_panne, heure_intervention }
      });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO rapports (
        user_id, titre, description_panne,
        solution_appliquee, heure_intervention, localisation, statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      cleanTitre,
      cleanDesc,
      (solution_appliquee || '').trim(),
      cleanHeure,
      (localisation || '').trim(),
      statut || 'en_cours'
    );

    const rapportId = result.lastInsertRowid;

    if (req.files?.length) {
      const stmt = db.prepare(`
        INSERT INTO photos_rapport (rapport_id, nom_fichier, chemin)
        VALUES (?, ?, ?)
      `);
      req.files.forEach(file => {
        stmt.run(rapportId, file.originalname, file.filename);
      });
    }

    res.status(201).json({ success: true, id: rapportId, message: 'Rapport créé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===============================
// UPDATE
// ===============================
router.put('/:id', authenticate, upload.array('photos', 5), (req, res) => {
  try {
    const db = getDb();
    const rapport = db.prepare('SELECT * FROM rapports WHERE id = ?').get(req.params.id);
    if (!rapport) return res.status(404).json({ error: 'Rapport introuvable' });

    const {
      titre, description_panne, solution_appliquee,
      heure_fin, statut, localisation
    } = req.body;

    db.prepare(`
      UPDATE rapports
      SET titre=?, description_panne=?, solution_appliquee=?,
          heure_fin=?, statut=?, localisation=?
      WHERE id=?
    `).run(
      titre              || rapport.titre,
      description_panne  || rapport.description_panne,
      solution_appliquee || rapport.solution_appliquee,
      heure_fin          || rapport.heure_fin,
      statut             || rapport.statut,
      localisation       || rapport.localisation,
      req.params.id
    );

    res.json({ success: true, message: 'Rapport modifié' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===============================
// DELETE
// ===============================
router.delete('/:id', authenticate, (req, res) => {
  try {
    const db = getDb();
    const rapport = db.prepare('SELECT * FROM rapports WHERE id = ?').get(req.params.id);
    if (!rapport) return res.status(404).json({ error: 'Rapport introuvable' });

    db.prepare('DELETE FROM photos_rapport WHERE rapport_id = ?').run(req.params.id);
    db.prepare('DELETE FROM rapports WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: 'Rapport supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;