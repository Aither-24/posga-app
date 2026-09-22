import Database from "better-sqlite3";

import {
  drizzle,
} from "drizzle-orm/better-sqlite3";

import * as schema from "./schema.js";

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
  "journal_mode = WAL",
);

sqlite.pragma(
  "foreign_keys = ON",
);

export const db =
  drizzle(
    sqlite,
    {
      schema,
    },
  );
