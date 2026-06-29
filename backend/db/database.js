// db/database.js
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'bbs.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','superviseur','technicien')),
      actif INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS techniciens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      matricule TEXT UNIQUE NOT NULL,
      specialite TEXT,
      zone_intervention TEXT,
      telephone TEXT,
      disponible INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS taches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      technicien_id INTEGER NOT NULL,
      titre TEXT NOT NULL,
      description TEXT,
      zone TEXT,
      statut TEXT DEFAULT 'en_attente' CHECK(statut IN ('en_attente','en_cours','terminee','annulee')),
      priorite TEXT DEFAULT 'normale' CHECK(priorite IN ('basse','normale','haute','critique')),
      date_debut DATETIME,
      date_fin DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (technicien_id) REFERENCES techniciens(id)
    );

    CREATE TABLE IF NOT EXISTS rapports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tache_id INTEGER,
      titre TEXT NOT NULL,
      description_panne TEXT NOT NULL,
      solution_appliquee TEXT,
      heure_intervention DATETIME NOT NULL,
      heure_fin DATETIME,
      statut TEXT DEFAULT 'en_cours'
          CHECK(statut IN ('en_cours','resolu','escalade')),
      localisation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (tache_id) REFERENCES taches(id)
    );


    CREATE TABLE IF NOT EXISTS photos_rapport (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rapport_id INTEGER NOT NULL,
      nom_fichier TEXT NOT NULL,
      chemin TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rapport_id) REFERENCES rapports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rapport_id INTEGER,
      titre TEXT NOT NULL,
      description TEXT NOT NULL,
      priorite TEXT DEFAULT 'normale' CHECK(priorite IN ('basse','normale','haute','critique')),
      statut TEXT DEFAULT 'ouvert' CHECK(statut IN ('ouvert','en_cours','resolu','ferme')),
      zone TEXT,
      signale_par INTEGER,
      assigne_a INTEGER,
      date_signalement DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_resolution DATETIME,
      FOREIGN KEY (rapport_id) REFERENCES rapports(id),
      FOREIGN KEY (signale_par) REFERENCES users(id),
      FOREIGN KEY (assigne_a) REFERENCES techniciens(id)
    );

    CREATE TABLE IF NOT EXISTS bande_passante (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone TEXT NOT NULL,
      utilisation_mbps REAL NOT NULL,
      capacite_mbps REAL NOT NULL,
      pourcentage_utilisation REAL,
      statut TEXT DEFAULT 'normal' CHECK(statut IN ('normal','congestion','critique')),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      titre TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info' CHECK(type IN ('info','alerte','critique','succes')),
      lu INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sender_id INTEGER NOT NULL,

    message TEXT,

    type TEXT DEFAULT 'text'
      CHECK(type IN ('text','image','video','audio','voice')),

    is_deleted INTEGER DEFAULT 0,
    is_edited INTEGER DEFAULT 0,
    is_seen INTEGER DEFAULT 0,

    edited_at DATETIME DEFAULT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
  );

 CREATE TABLE IF NOT EXISTS message_media (
   id INTEGER PRIMARY KEY AUTOINCREMENT,

   message_id INTEGER NOT NULL,

   type TEXT DEFAULT 'image'
   CHECK(type IN ('image','video','audio','voice')),
   nom_fichier TEXT,
   chemin TEXT,
   url TEXT,
   mime_type TEXT,
   taille INTEGER,

   is_deleted INTEGER DEFAULT 0,

   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

   FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
 );

   CREATE TABLE IF NOT EXISTS message_reactions (
     id INTEGER PRIMARY KEY AUTOINCREMENT,

     message_id INTEGER NOT NULL,
     user_id INTEGER NOT NULL,

     reaction TEXT NOT NULL,

     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

     UNIQUE(message_id, user_id),

     FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );


   CREATE TABLE IF NOT EXISTS message_status (
     id INTEGER PRIMARY KEY AUTOINCREMENT,

     message_id INTEGER NOT NULL,
     user_id INTEGER NOT NULL,

     status TEXT CHECK(status IN ('sent','delivered','seen')),

     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

     UNIQUE(message_id, user_id),

     FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );

    CREATE TABLE IF NOT EXISTS chat_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      is_online INTEGER DEFAULT 0,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  -- =========================
  -- INDEX POUR MESSAGES
  -- =========================

  CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages(sender_id);

  CREATE INDEX IF NOT EXISTS idx_messages_created
  ON messages(created_at);

  CREATE INDEX IF NOT EXISTS idx_messages_type
  ON messages(type);

  CREATE INDEX IF NOT EXISTS idx_messages_seen
  ON messages(is_seen);

  -- =========================
  -- INDEX POUR MEDIA
  -- =========================

  CREATE INDEX IF NOT EXISTS idx_message_media_message
  ON message_media(message_id);

  CREATE INDEX IF NOT EXISTS idx_message_media_type
  ON message_media(type);

  -- =========================
  -- INDEX POUR REACTIONS
  -- =========================

  CREATE INDEX IF NOT EXISTS idx_message_reactions_message
  ON message_reactions(message_id);

  CREATE INDEX IF NOT EXISTS idx_message_reactions_user
  ON message_reactions(user_id);

  -- =========================
  -- INDEX POUR STATUS
  -- =========================

  CREATE INDEX IF NOT EXISTS idx_message_status_message
  ON message_status(message_id);

  CREATE INDEX IF NOT EXISTS idx_message_status_user
  ON message_status(user_id);
  `);

  // Seed admin user if none exists
  const adminExists = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('Admin@123', 10);
    db.prepare(`
      INSERT INTO users (nom, prenom, email, password, role)
      VALUES ('Admin', 'BBS', 'admin@bbs.com', ?, 'admin')
    `).run(hash);

    // Seed some bandwidth data
    const zones = ['Zone Nord', 'Zone Sud', 'Zone Est', 'Zone Ouest', 'Centre-ville'];
    const insertBP = db.prepare(`
      INSERT INTO bande_passante (zone, utilisation_mbps, capacite_mbps, pourcentage_utilisation, statut)
      VALUES (?, ?, ?, ?, ?)
    `);
    zones.forEach(zone => {
      const cap = 1000;
      const util = Math.random() * 900 + 50;
      const pct = (util / cap) * 100;
      const statut = pct > 90 ? 'critique' : pct > 75 ? 'congestion' : 'normal';
      insertBP.run(zone, util.toFixed(1), cap, pct.toFixed(1), statut);
    });

    console.log('✅ Base de données initialisée avec admin@bbs.com / Admin@123');
  }
}

module.exports = { getDb };
