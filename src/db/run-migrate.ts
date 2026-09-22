import Database from "better-sqlite3";

import {
  drizzle,
} from "drizzle-orm/better-sqlite3";

import {
  migrate,
} from "drizzle-orm/better-sqlite3/migrator";

import {
  DATABASE_PATH,
  pastikanDirektoriDatabase,
} from "./database-path.js";

pastikanDirektoriDatabase();

const sqlite =
  new Database(
    DATABASE_PATH,
  );

sqlite.pragma(
  "foreign_keys = ON",
);

const db =
  drizzle(
    sqlite,
  );

console.log(
  "=== MENJALANKAN MIGRATION ===",
);

try {
  migrate(
    db,
    {
      migrationsFolder:
        "./src/db/migrations",
    },
  );

  console.log(
    "=== MIGRATION SELESAI ===",
  );
} catch (error) {
  console.error(
    "=== MIGRATION GAGAL ===",
  );

  console.error(
    error,
  );

  process.exitCode =
    1;
} finally {
  sqlite.close();
}
