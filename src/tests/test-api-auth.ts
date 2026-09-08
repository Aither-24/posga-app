import request from "supertest";

import { app } from "../app.js";

import { db } from "../db/index.js";

import { auditLog, authSession, user } from "../db/schema.js";

import { eq } from "drizzle-orm";

// ============================================================
// CONFIG TEST
// ============================================================

const ADMIN_USERNAME = "admin";

const ADMIN_PASSWORD = process.env.POSGA_TEST_ADMIN_PASSWORD;

const PETUGAS_USERNAME = "petugas_test";

const PETUGAS_PASSWORD = "PasswordPetugas123!";

// ============================================================
// HELPER
// ============================================================

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function logOk(number: number, message: string) {
  console.log(`âœ… ${number}. ${message}`);
}

// ============================================================
// TEST
// ============================================================

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error("POSGA_TEST_ADMIN_PASSWORD belum diisi.");
  }

  let adminToken = "";

  let petugasToken = "";

  let petugasId = 0;

  let testNumber = 1;

  // ==========================================================
  // CLEANUP USER TEST LAMA
  // ==========================================================

  const petugasLama = await db
    .select()
    .from(user)
    .where(eq(user.username, PETUGAS_USERNAME))
    .limit(1);

  if (petugasLama[0]) {
    await db.delete(user).where(eq(user.id, petugasLama[0].id));
  }

  // ==========================================================
  // 1. LOGIN SALAH
  // ==========================================================

  {
    const res = await request(app).post("/api/auth/login").send({
      username: ADMIN_USERNAME,

      password: "password-salah",
    });

    assert(
      res.status === 401,
      `Login salah seharusnya 401, tetapi mendapat ${res.status}`,
    );

    assert(res.body.success === false, "Login salah harus success=false.");

    logOk(testNumber++, "Login dengan password salah ditolak.");
  }

  // ==========================================================
  // 2. LOGIN ADMIN BENAR
  // ==========================================================

  {
    const res = await request(app).post("/api/auth/login").send({
      username: ADMIN_USERNAME,

      password: ADMIN_PASSWORD,
    });

    assert(
      res.status === 200,
      `Login admin seharusnya 200, tetapi mendapat ${res.status}`,
    );

    assert(res.body.success === true, "Login admin harus success=true.");

    assert(
      typeof res.body.data.token === "string",
      "Login admin harus mengembalikan token.",
    );

    assert(res.body.data.user.role === "admin", "Role admin tidak sesuai.");

    adminToken = res.body.data.token;

    logOk(testNumber++, "Login admin berhasil.");
  }

  // ==========================================================
  // 3. /ME TANPA TOKEN
  // ==========================================================

  {
    const res = await request(app).get("/api/auth/me");

    assert(
      res.status === 401,
      `/me tanpa token harus 401, mendapat ${res.status}`,
    );

    logOk(testNumber++, "/me tanpa token ditolak.");
  }

  // ==========================================================
  // 4. /ME DENGAN TOKEN ADMIN
  // ==========================================================

  {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${adminToken}`);

    assert(res.status === 200, `/me admin harus 200, mendapat ${res.status}`);

    assert(
      res.body.data.username === ADMIN_USERNAME,
      "Username /me tidak sesuai.",
    );

    assert(res.body.data.role === "admin", "Role /me tidak sesuai.");

    logOk(testNumber++, "/me admin berhasil.");
  }

  // ==========================================================
  // 5. ADMIN MEMBUAT PETUGAS
  // ==========================================================

  {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        username: PETUGAS_USERNAME,

        password: PETUGAS_PASSWORD,

        nama: "Petugas Test",

        role: "petugas",
      });

    assert(
      res.status === 201,
      `Create petugas harus 201, mendapat ${res.status}: ${JSON.stringify(res.body)}`,
    );

    assert(res.body.data.role === "petugas", "Role user baru harus petugas.");

    petugasId = res.body.data.id;

    assert(petugasId > 0, "ID petugas tidak valid.");

    logOk(testNumber++, "Admin berhasil membuat petugas.");
  }

  // ==========================================================
  // 6. DUPLIKAT USERNAME
  // ==========================================================

  {
    const res = await request(app)
      .post("/api/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        username: PETUGAS_USERNAME,

        password: PETUGAS_PASSWORD,

        nama: "Duplikat",

        role: "petugas",
      });

    assert(
      res.status === 409,
      `Username duplikat harus 409, mendapat ${res.status}`,
    );

    logOk(testNumber++, "Username duplikat ditolak.");
  }

  // ==========================================================
  // 7. LOGIN PETUGAS
  // ==========================================================

  {
    const res = await request(app).post("/api/auth/login").send({
      username: PETUGAS_USERNAME,

      password: PETUGAS_PASSWORD,
    });

    assert(
      res.status === 200,
      `Login petugas harus 200, mendapat ${res.status}`,
    );

    assert(res.body.data.user.role === "petugas", "Role login petugas salah.");

    petugasToken = res.body.data.token;

    logOk(testNumber++, "Login petugas berhasil.");
  }

  // ==========================================================
  // 8. PETUGAS TIDAK BOLEH LIST USER
  // ==========================================================

  {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${petugasToken}`);

    assert(
      res.status === 403,
      `Petugas akses /users harus 403, mendapat ${res.status}`,
    );

    logOk(testNumber++, "Endpoint admin menolak petugas.");
  }

  // ==========================================================
  // 9. ADMIN BOLEH LIST USER
  // ==========================================================

  {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);

    assert(
      res.status === 200,
      `/users admin harus 200, mendapat ${res.status}`,
    );

    assert(Array.isArray(res.body.data), "/users harus mengembalikan array.");

    const ditemukan = res.body.data.some(
      (item: { username?: string }) => item.username === PETUGAS_USERNAME,
    );

    assert(ditemukan, "Petugas test tidak ditemukan pada list user.");

    logOk(testNumber++, "Admin dapat melihat daftar user.");
  }

  // ==========================================================
  // 10. PASSWORD HASH TIDAK BOLEH BOCOR
  // ==========================================================

  {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${adminToken}`);

    const petugas = res.body.data.find(
      (item: { username?: string }) => item.username === PETUGAS_USERNAME,
    );

    assert(petugas, "Petugas tidak ditemukan.");

    assert(
      !("passwordHash" in petugas),
      "passwordHash tidak boleh dikirim API.",
    );

    logOk(testNumber++, "Password hash tidak terekspos API.");
  }

  // ==========================================================
  // 11. UPDATE USER OLEH ADMIN
  // ==========================================================

  {
    const res = await request(app)
      .put(`/api/users/${petugasId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        nama: "Petugas Test Updated",
      });

    assert(
      res.status === 200,
      `Update petugas harus 200, mendapat ${res.status}`,
    );

    assert(
      res.body.data.nama === "Petugas Test Updated",
      "Nama user gagal diperbarui.",
    );

    logOk(testNumber++, "Admin berhasil memperbarui user.");
  }

  // ==========================================================
  // 12. LOGIN HARUS MENGHASILKAN SESSION DI DATABASE
  // ==========================================================

  {
    const rows = await db.select().from(authSession);

    assert(rows.length >= 2, "Session login tidak tercatat di database.");

    const tokenMentahBocor = rows.some(
      (row) => row.tokenHash === adminToken || row.tokenHash === petugasToken,
    );

    assert(!tokenMentahBocor, "Token mentah tidak boleh disimpan di database.");

    logOk(testNumber++, "Auth session tersimpan menggunakan hash token.");
  }

  // ==========================================================
  // 13. AUDIT LOGIN/CREATE/UPDATE ADA
  // ==========================================================

  {
    const rows = await db.select().from(auditLog);

    const adaLogin = rows.some(
      (row) => row.aksi === "LOGIN" && row.entitas === "auth_session",
    );

    const adaCreate = rows.some(
      (row) => row.aksi === "CREATE" && row.entitas === "user",
    );

    const adaUpdate = rows.some(
      (row) => row.aksi === "UPDATE" && row.entitas === "user",
    );

    assert(adaLogin, "Audit LOGIN tidak ditemukan.");

    assert(adaCreate, "Audit CREATE user tidak ditemukan.");

    assert(adaUpdate, "Audit UPDATE user tidak ditemukan.");

    logOk(testNumber++, "Audit login/create/update tercatat.");
  }

  // ==========================================================
  // 14. LOGOUT PETUGAS
  // ==========================================================

  {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${petugasToken}`);

    assert(
      res.status === 200,
      `Logout petugas harus 200, mendapat ${res.status}`,
    );

    assert(
      res.body.data.berhasil === true,
      "Logout tidak mengembalikan berhasil=true.",
    );

    logOk(testNumber++, "Logout petugas berhasil.");
  }

  // ==========================================================
  // 15. TOKEN SETELAH LOGOUT TIDAK BERLAKU
  // ==========================================================

  {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${petugasToken}`);

    assert(
      res.status === 401,
      `Token setelah logout harus 401, mendapat ${res.status}`,
    );

    logOk(testNumber++, "Token petugas tidak berlaku setelah logout.");
  }

  // ==========================================================
  // 16. AUDIT LOGOUT ADA
  // ==========================================================

  {
    const rows = await db.select().from(auditLog);

    const adaLogout = rows.some(
      (row) => row.aksi === "LOGOUT" && row.entitas === "auth_session",
    );

    assert(adaLogout, "Audit LOGOUT tidak ditemukan.");

    logOk(testNumber++, "Audit logout tercatat.");
  }

  console.log("");
  console.log("========================================");
  console.log(`AUTH TEST SELESAI: ${testNumber - 1}/16 BERHASIL`);
  console.log("========================================");
}

main().catch((error) => {
  console.error("");
  console.error("âŒ TEST AUTH GAGAL");

  console.error(error);

  process.exitCode = 1;
});
