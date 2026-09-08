import Database from "better-sqlite3";

const db = new Database("data/posga.db");

const rows = db
  .prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN ('user', 'auth_session', 'audit_log')
    ORDER BY name
  `)
  .all();

console.log(rows);

db.close();
