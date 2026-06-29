// routes/statistiques.js
const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/stats/dashboard - Stats globales
router.get('/dashboard', authenticate, (req, res) => {
  const db = getDb();

  const totalInterventions = db.prepare("SELECT COUNT(*) as count FROM rapports").get().count;
  const interventionsMois = db.prepare(`
    SELECT COUNT(*) as count FROM rapports
    WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
  `).get().count;

  const tempsRepDB = db.prepare(`
    SELECT AVG(
      (julianday(heure_fin) - julianday(heure_intervention)) * 24 * 60
    ) as avg_minutes
    FROM rapports WHERE heure_fin IS NOT NULL
  `).get();
  const tempsMoyenRep = tempsRepDB.avg_minutes ? Math.round(tempsRepDB.avg_minutes) : 0;

  const incidentsOuverts = db.prepare("SELECT COUNT(*) as count FROM incidents WHERE statut IN ('ouvert','en_cours')").get().count;
  const incidentsResolus = db.prepare("SELECT COUNT(*) as count FROM incidents WHERE statut = 'resolu'").get().count;

  const totalTechniciens = db.prepare("SELECT COUNT(*) as count FROM techniciens").get().count;
  const techDisponibles = db.prepare("SELECT COUNT(*) as count FROM techniciens WHERE disponible = 1").get().count;

  const congestionZones = db.prepare(`
    SELECT b1.zone, b1.statut, b1.pourcentage_utilisation
    FROM bande_passante b1
    INNER JOIN (
      SELECT zone, MAX(timestamp) as max_ts FROM bande_passante GROUP BY zone
    ) b2 ON b1.zone = b2.zone AND b1.timestamp = b2.max_ts
    WHERE b1.statut != 'normal'
    ORDER BY b1.pourcentage_utilisation DESC
  `).all();

  const interventionsParMois = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as mois, COUNT(*) as count
    FROM rapports
    GROUP BY mois ORDER BY mois DESC LIMIT 12
  `).all();

  const incidentsParPriorite = db.prepare(`
    SELECT priorite, COUNT(*) as count FROM incidents GROUP BY priorite
  `).all();

  res.json({
    totalInterventions,
    interventionsMois,
    tempsMoyenRep,
    incidentsOuverts,
    incidentsResolus,
    totalTechniciens,
    techDisponibles,
    congestionZones,
    interventionsParMois,
    incidentsParPriorite
  });
});

// GET /api/stats/rapport-mensuel
router.get('/rapport-mensuel', authenticate, authorize('admin', 'superviseur'), (req, res) => {
  const { mois, annee } = req.query;
  const periode = mois && annee ? `${annee}-${mois.padStart(2,'0')}` : new Date().toISOString().slice(0,7);
  const db = getDb();

  const rapports = db.prepare(`
    SELECT r.*, t.matricule, u.nom, u.prenom
    FROM rapports r
    LEFT JOIN techniciens t ON r.technicien_id = t.id
    LEFT JOIN users u ON t.user_id = u.id
    WHERE strftime('%Y-%m', r.created_at) = ?
    ORDER BY r.created_at
  `).all(periode);

  const incidents = db.prepare(`
    SELECT * FROM incidents WHERE strftime('%Y-%m', date_signalement) = ?
  `).all(periode);

  const performanceReseau = db.prepare(`
    SELECT zone, AVG(pourcentage_utilisation) as avg_util, MAX(pourcentage_utilisation) as max_util
    FROM bande_passante WHERE strftime('%Y-%m', timestamp) = ?
    GROUP BY zone
  `).all(periode);

  res.json({ periode, rapports, incidents, performanceReseau });
});

// GET /api/stats/technicien/:id
router.get('/technicien/:id', authenticate, (req, res) => {
  const db = getDb();
  const missions = db.prepare("SELECT COUNT(*) as count FROM taches WHERE technicien_id = ?").get(req.params.id).count;
  const missionsTerminees = db.prepare("SELECT COUNT(*) as count FROM taches WHERE technicien_id = ? AND statut = 'terminee'").get(req.params.id).count;
  const rapports = db.prepare("SELECT COUNT(*) as count FROM rapports WHERE technicien_id = ?").get(req.params.id).count;

  res.json({ missions, missionsTerminees, rapports });
});

module.exports = router;
