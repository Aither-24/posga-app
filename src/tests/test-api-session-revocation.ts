import request from "supertest";

import {
  and,
  eq,
} from "drizzle-orm";

import {
  app,
} from "../app.js";

import {
  db,
} from "../db/index.js";

import {
  auditLog,
  user,
} from "../db/schema.js";

// ============================================================
// CONFIG
// ============================================================

const ADMIN_USERNAME =
  "admin";

const ADMIN_PASSWORD =
  process.env
    .POSGA_TEST_ADMIN_PASSWORD;

const TEST_USERNAME =
  "petugas_revoke_test";

const PASSWORD_LAMA =
  "PasswordLama123!";

const PASSWORD_BARU =
  "PasswordBaru456!";

// ============================================================
// HELPER
// ============================================================

function assert(
  condition: unknown,
  message: string,
) {
  if (!condition) {
    throw new Error(
      message,
    );
  }
}

function ok(
  nomor: number,
  message: string,
) {
  console.log(
    `[OK] ${nomor}. ${message}`,
  );
}

async function login(
  username: string,
  password: string,
) {
  return request(app)
    .post(
      "/api/auth/login",
    )
    .send({
      username,
      password,
    });
}

// ============================================================
// CLEANUP
// ============================================================

async function cleanup() {
  const rows =
    await db
      .select({
        id:
          user.id,
      })
      .from(user)
      .where(
        eq(
          user.username,
          TEST_USERNAME,
        ),
      )
      .limit(1);

  const data =
    rows[0];

  if (!data) {
    return;
  }

  await db
    .delete(auditLog)
    .where(
      and(
        eq(
          auditLog.entitas,
          "user",
        ),

        eq(
          auditLog.entitasId,
          String(
            data.id,
          ),
        ),
      ),
    );

  // auth_session otomatis terhapus karena FK cascade.
  await db
    .delete(user)
    .where(
      eq(
        user.id,
        data.id,
      ),
    );
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      "POSGA_TEST_ADMIN_PASSWORD belum diisi.",
    );
  }

  delete process.env
    .POSGA_TEST_BYPASS_AUTH;

  await cleanup();

  let nomor =
    1;

  // ==========================================================
  // LOGIN ADMIN
  // ==========================================================

  const loginAdmin =
    await login(
      ADMIN_USERNAME,
      ADMIN_PASSWORD,
    );

  assert(
    loginAdmin.status ===
      200,
    `Login admin gagal: ${loginAdmin.status} ${JSON.stringify(loginAdmin.body)}`,
  );

  const adminToken =
    loginAdmin.body
      .data.token as string;

  // ==========================================================
  // 1. ADMIN BUAT PETUGAS TEST
  // ==========================================================

  const createUser =
    await request(app)
      .post(
        "/api/users",
      )
      .set(
        "Authorization",
        `Bearer ${adminToken}`,
      )
      .send({
        username:
          TEST_USERNAME,

        password:
          PASSWORD_LAMA,

        nama:
          "Petugas Revocation Test",

        role:
          "petugas",

        aktif:
          true,
      });

  assert(
    createUser.status ===
      201,
    `Create user gagal: ${createUser.status} ${JSON.stringify(createUser.body)}`,
  );

  const userId =
    createUser.body
      .data.id as number;

  assert(
    userId > 0,
    "ID user test tidak valid.",
  );

  ok(
    nomor++,
    "Admin berhasil membuat petugas test.",
  );

  // ==========================================================
  // 2. LOGIN PETUGAS
  // ==========================================================

  const loginPetugas =
    await login(
      TEST_USERNAME,
      PASSWORD_LAMA,
    );

  assert(
    loginPetugas.status ===
      200,
    `Login petugas gagal: ${loginPetugas.status}`,
  );

  const tokenLama =
    loginPetugas.body
      .data.token as string;

  ok(
    nomor++,
    "Petugas berhasil login.",
  );

  // ==========================================================
  // 3. TOKEN LAMA AKTIF
  // ==========================================================

  {
    const res =
      await request(app)
        .get(
          "/api/auth/me",
        )
        .set(
          "Authorization",
          `Bearer ${tokenLama}`,
        );

    assert(
      res.status === 200,
      `Token petugas seharusnya aktif, mendapat ${res.status}`,
    );

    ok(
      nomor++,
      "Token petugas aktif sebelum perubahan password.",
    );
  }

  // ==========================================================
  // 4. ADMIN GANTI PASSWORD
  // ==========================================================

  {
    const res =
      await request(app)
        .put(
          `/api/users/${userId}`,
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`,
        )
        .send({
          password:
            PASSWORD_BARU,
        });

    assert(
      res.status === 200,
      `Ganti password gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    ok(
      nomor++,
      "Admin berhasil mengganti password petugas.",
    );
  }

  // ==========================================================
  // 5. TOKEN LAMA HARUS MATI
  // ==========================================================

  {
    const res =
      await request(app)
        .get(
          "/api/auth/me",
        )
        .set(
          "Authorization",
          `Bearer ${tokenLama}`,
        );

    assert(
      res.status === 401,
      `Token lama setelah ganti password harus 401, mendapat ${res.status}`,
    );

    ok(
      nomor++,
      "Token lama direvoke setelah password berubah.",
    );
  }

  // ==========================================================
  // 6. PASSWORD LAMA GAGAL
  // ==========================================================

  {
    const res =
      await login(
        TEST_USERNAME,
        PASSWORD_LAMA,
      );

    assert(
      res.status === 401,
      `Password lama harus ditolak, mendapat ${res.status}`,
    );

    ok(
      nomor++,
      "Password lama tidak lagi dapat digunakan.",
    );
  }

  // ==========================================================
  // 7. PASSWORD BARU BERHASIL
  // ==========================================================

  const loginBaru =
    await login(
      TEST_USERNAME,
      PASSWORD_BARU,
    );

  assert(
    loginBaru.status ===
      200,
    `Password baru gagal login: ${loginBaru.status}`,
  );

  const tokenBaru =
    loginBaru.body
      .data.token as string;

  ok(
    nomor++,
    "Password baru berhasil digunakan.",
  );

  // ==========================================================
  // 8. ADMIN NONAKTIFKAN USER
  // ==========================================================

  {
    const res =
      await request(app)
        .put(
          `/api/users/${userId}`,
        )
        .set(
          "Authorization",
          `Bearer ${adminToken}`,
        )
        .send({
          aktif:
            false,
        });

    assert(
      res.status === 200,
      `Nonaktifkan user gagal: ${res.status} ${JSON.stringify(res.body)}`,
    );

    assert(
      res.body.data
        .aktif ===
        false,
      "Status user seharusnya false.",
    );

    ok(
      nomor++,
      "Admin berhasil menonaktifkan user.",
    );
  }

  // ==========================================================
  // 9. TOKEN BARU LANGSUNG MATI
  // ==========================================================

  {
    const res =
      await request(app)
        .get(
          "/api/auth/me",
        )
        .set(
          "Authorization",
          `Bearer ${tokenBaru}`,
        );

    assert(
      res.status === 401,
      `Token setelah user nonaktif harus 401, mendapat ${res.status}`,
    );

    ok(
      nomor++,
      "Session direvoke saat user dinonaktifkan.",
    );
  }

  // ==========================================================
  // 10. USER NONAKTIF TIDAK BISA LOGIN
  // ==========================================================

  {
    const res =
      await login(
        TEST_USERNAME,
        PASSWORD_BARU,
      );

    assert(
      res.status === 401,
      `User nonaktif harus gagal login, mendapat ${res.status}`,
    );

    ok(
      nomor++,
      "User nonaktif tidak dapat login.",
    );
  }

  console.log("");

  console.log(
    "========================================",
  );

  console.log(
    `SESSION REVOCATION TEST SELESAI: ${nomor - 1}/10 BERHASIL`,
  );

  console.log(
    "========================================",
  );

  await cleanup();
}

main().catch(
  async (
    error,
  ) => {
    console.error("");

    console.error(
      "TEST SESSION REVOCATION GAGAL",
    );

    console.error(
      error,
    );

    try {
      await cleanup();
    } catch (
      cleanupError
    ) {
      console.error(
        "Cleanup gagal:",
        cleanupError,
      );
    }

    process.exitCode =
      1;
  },
);