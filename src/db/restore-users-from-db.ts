import Database from "better-sqlite3";

const backupPath =
  process.argv[2];

if (!backupPath) {
  throw new Error(
    "Path database backup belum diberikan.",
  );
}

const target =
  new Database(
    "data/posga.db",
  );

const backup =
  new Database(
    backupPath,
    {
      readonly: true,
    },
  );

try {
  const users =
    backup
      .prepare(
        `SELECT
           id,
           username,
           password_hash,
           nama,
           role,
           aktif,
           created_at,
           updated_at
         FROM user
         ORDER BY id`,
      )
      .all() as Array<{
        id: number;
        username: string;
        password_hash: string;
        nama: string;
        role: string;
        aktif: number;
        created_at: string;
        updated_at: string;
      }>;

  if (
    users.length ===
    0
  ) {
    throw new Error(
      "Database lama tidak memiliki user. Reset dibatalkan agar login tidak hilang.",
    );
  }

  const insert =
    target.prepare(
      `INSERT INTO user (
         id,
         username,
         password_hash,
         nama,
         role,
         aktif,
         created_at,
         updated_at
       ) VALUES (
         @id,
         @username,
         @password_hash,
         @nama,
         @role,
         @aktif,
         @created_at,
         @updated_at
       )`,
    );

  const trx =
    target.transaction(
      () => {
        for (
          const user of users
        ) {
          insert.run(
            user,
          );
        }
      },
    );

  trx();

  console.log(
    `User login dipertahankan: ${users.length}`,
  );
  console.log(
    "Session login lama tidak dipindahkan; login ulang setelah reset.",
  );
} finally {
  backup.close();
  target.close();
}
