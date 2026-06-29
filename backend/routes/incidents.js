// routes/incidents.js
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { notifierAdminsEtSuperviseurs, creerNotification } = require('./notifications');

// ─────────────────────────────────────────────
// GET ALL INCIDENTS
// ─────────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
  try {
    const { statut, priorite } = req.query;

    let query = `
      SELECT i.*, u.nom AS signale_nom, u.prenom AS signale_prenom,
             t.matricule AS technicien_matricule
      FROM incidents i
      LEFT JOIN users u ON i.signale_par = u.id
      LEFT JOIN techniciens t ON i.assigne_a = t.id
      WHERE 1=1
    `;

    const params = [];

    if (statut) {
      query += ' AND i.statut = ?';
      params.push(statut);
    }

    if (priorite) {
      query += ' AND i.priorite = ?';
      params.push(priorite);
    }

    query += ' ORDER BY i.date_signalement DESC';

    const rows = getDb().prepare(query).all(...params);

    res.json(rows);

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// GET ONE INCIDENT
// ─────────────────────────────────────────────
router.get('/:id', authenticate, (req, res) => {
  try {
    const inc = getDb().prepare(`
      SELECT i.*, u.nom AS signale_nom, u.prenom AS signale_prenom,
             t.matricule AS technicien_matricule
      FROM incidents i
      LEFT JOIN users u ON i.signale_par = u.id
      LEFT JOIN techniciens t ON i.assigne_a = t.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!inc) {
      return res.status(404).json({ error: 'Incident introuvable' });
    }

    res.json(inc);

  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// CREATE INCIDENT
// ─────────────────────────────────────────────
router.post('/', authenticate, (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { rapport_id, titre, description, priorite, zone, assigne_a } = req.body;

    if (!titre || !description) {
      return res.status(400).json({ error: 'Titre et description requis' });
    }

    const db = getDb();

    const result = db.prepare(`
      INSERT INTO incidents (rapport_id, titre, description, priorite, zone, signale_par, assigne_a)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      rapport_id || null,
      titre,
      description,
      priorite || 'normale',
      zone,
      req.user.id,
      assigne_a || null
    );

    const incidentId = result.lastInsertRowid;

    // 🔔 admins + superviseurs
    if (priorite === 'critique' || priorite === 'haute') {
      notifierAdminsEtSuperviseurs({
        titre: `Incident ${priorite.toUpperCase()} signalé`,
        message: `${titre} - Zone: ${zone || 'Non définie'}`,
        type: priorite === 'critique' ? 'critique' : 'alerte',
        excludeUserId: req.user.id
      });
    }

    //  technicien assigné
    if (assigne_a) {
      creerNotification({
        userId: assigne_a,
        titre: 'Nouvel incident assigné',
        message: `${titre} - Zone: ${zone || 'Non définie'}`,
        type: 'info'
      });
    }

    res.status(201).json({
      id: incidentId,
      message: 'Incident signalé'
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// UPDATE INCIDENT
// ─────────────────────────────────────────────
router.put('/:id', authenticate, (req, res) => {
  try {
    const { titre, description, priorite, statut, zone, assigne_a } = req.body;
    const db = getDb();

    const inc = db.prepare('SELECT * FROM incidents WHERE id = ?')
      .get(req.params.id);

    if (!inc) {
      return res.status(404).json({ error: 'Incident introuvable' });
    }

    const date_resolution =
      (statut === 'resolu' || statut === 'ferme')
        ? new Date().toISOString()
        : inc.date_resolution;

    db.prepare(`
      UPDATE incidents
      SET titre=?, description=?, priorite=?, statut=?, zone=?, assigne_a=?, date_resolution=?
      WHERE id=?
    `).run(
      titre || inc.titre,
      description || inc.description,
      priorite || inc.priorite,
      statut || inc.statut,
      zone || inc.zone,
      assigne_a || inc.assigne_a,
      date_resolution,
      req.params.id
    );

    //  en cours
    if (statut === 'en_cours') {
      notifierAdminsEtSuperviseurs({
        titre: 'Incident en cours',
        message: `Incident "${inc.titre}" est en cours de traitement`,
        type: 'info'
      });
    }

    // résolu
    if (statut === 'resolu') {
      creerNotification({
        userId: inc.signale_par,
        titre: 'Incident résolu',
        message: `Votre incident "${inc.titre}" a été résolu`,
        type: 'succes'
      });
    }

    res.json({ message: 'Incident mis à jour' });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────
// DELETE INCIDENT
// ─────────────────────────────────────────────
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const result = getDb()
    .prepare('DELETE FROM incidents WHERE id = ?')
    .run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Incident introuvable' });
  }

  res.json({ message: 'Incident supprimé' });
});

module.exports = router;