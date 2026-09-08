import request from "supertest";

import { app } from "../app.js";

const ADMIN_USERNAME = "admin";

const ADMIN_PASSWORD = process.env.POSGA_TEST_ADMIN_PASSWORD;

const PETUGAS_USERNAME = "petugas_test";

const PETUGAS_PASSWORD = "PasswordPetugas123!";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function ok(number: number, message: string) {
  console.log(`âœ… ${number}. ${message}`);
}

async function loginUser(username: string, password: string) {
  const res = await request(app).post("/api/auth/login").send({
    username,
    password,
  });

  assert(
    res.status === 200,
    `Login ${username} gagal. Status ${res.status}: ${JSON.stringify(res.body)}`,
  );

  const token = res.body.data?.token;

  assert(typeof token === "string", `Token ${username} tidak ditemukan.`);

  return token as string;
}

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error("POSGA_TEST_ADMIN_PASSWORD belum diisi.");
  }

  delete process.env.POSGA_TEST_BYPASS_AUTH;

  const adminToken = await loginUser(ADMIN_USERNAME, ADMIN_PASSWORD);

  const petugasToken = await loginUser(PETUGAS_USERNAME, PETUGAS_PASSWORD);

  let nomor = 1;

  // ==========================================================
  // 1. PETUGAS BOLEH MEMBACA PESERTA
  // ==========================================================

  {
    const res = await request(app)
      .get("/api/peserta")
      .set("Authorization", `Bearer ${petugasToken}`);

    assert(
      res.status === 200,
      `Petugas GET /peserta harus 200, mendapat ${res.status}`,
    );

    ok(nomor++, "Petugas dapat membaca peserta.");
  }

  // ==========================================================
  // 2. PETUGAS BOLEH MEMBACA LOKASI
  // ==========================================================

  {
    const res = await request(app)
      .get("/api/lokasi")
      .set("Authorization", `Bearer ${petugasToken}`);

    assert(
      res.status === 200,
      `Petugas GET /lokasi harus 200, mendapat ${res.status}`,
    );

    ok(nomor++, "Petugas dapat membaca lokasi.");
  }

  // ==========================================================
  // 3. PETUGAS TIDAK BOLEH TAMBAH LOKASI
  // ==========================================================

  {
    const res = await request(app)
      .post("/api/lokasi")
      .set("Authorization", `Bearer ${petugasToken}`)
      .send({
        nama: "Lokasi Role Test",
      });

    assert(
      res.status === 403,
      `Petugas POST /lokasi harus 403, mendapat ${res.status}`,
    );

    ok(nomor++, "Petugas ditolak saat menambah lokasi.");
  }

  // ==========================================================
  // 4. PETUGAS TIDAK BOLEH UPDATE LOKASI
  // ==========================================================

  {
    const res = await request(app)
      .put("/api/lokasi/1")
      .set("Authorization", `Bearer ${petugasToken}`)
      .send({
        nama: "Tidak Boleh",
      });

    assert(
      res.status === 403,
      `Petugas PUT /lokasi/:id harus 403, mendapat ${res.status}`,
    );

    ok(nomor++, "Petugas ditolak saat update lokasi.");
  }

  // ==========================================================
  // 5. PETUGAS TIDAK BOLEH DELETE LOKASI
  // ==========================================================

  {
    const res = await request(app)
      .delete("/api/lokasi/1")
      .set("Authorization", `Bearer ${petugasToken}`);

    assert(
      res.status === 403,
      `Petugas DELETE /lokasi/:id harus 403, mendapat ${res.status}`,
    );

    ok(nomor++, "Petugas ditolak saat menghapus lokasi.");
  }

  // ==========================================================
  // 6. PETUGAS TIDAK BOLEH TAMBAH POSYANDU
  // ==========================================================

  {
    const res = await request(app)
      .post("/api/posyandu")
      .set("Authorization", `Bearer ${petugasToken}`)
      .send({
        lokasiId: 1,
        nama: "Posyandu Role Test",
      });

    assert(
      res.status === 403,
      `Petugas POST /posyandu harus 403, mendapat ${res.status}`,
    );

    ok(nomor++, "Petugas ditolak saat menambah posyandu.");
  }

  // ==========================================================
  // 7. PETUGAS TIDAK BOLEH BATALKAN SESI
  // ==========================================================

  {
    const res = await request(app)
      .post("/api/sesi/1/batal")
      .set("Authorization", `Bearer ${petugasToken}`);

    assert(
      res.status === 403,
      `Petugas POST /sesi/:id/batal harus 403, mendapat ${res.status}`,
    );

    ok(nomor++, "Petugas ditolak saat membatalkan sesi.");
  }

  // ==========================================================
  // 8. PETUGAS BOLEH KOREKSI / CLEAR PEMERIKSAAN
  //
  // Resource bisa saja tidak ada. Yang penting role petugas
  // tidak ditolak oleh 401/403.
  // ==========================================================

  {
    const res = await request(app)
      .delete("/api/pemeriksaan/1")
      .set("Authorization", `Bearer ${petugasToken}`);

    assert(
      res.status !== 401 && res.status !== 403,
      `Petugas harus boleh koreksi pemeriksaan. Status ${res.status}`,
    );

    ok(nomor++, "Petugas dapat melewati role check koreksi pemeriksaan.");
  }

  // ==========================================================
  // 9. PETUGAS BOLEH KOREKSI / CLEAR SKRINING
  // ==========================================================

  {
    const res = await request(app)
      .delete("/api/skrining/1")
      .set("Authorization", `Bearer ${petugasToken}`);

    assert(
      res.status !== 401 && res.status !== 403,
      `Petugas harus boleh koreksi skrining. Status ${res.status}`,
    );

    ok(nomor++, "Petugas dapat melewati role check koreksi skrining.");
  }

  // ==========================================================
  // 10. PETUGAS BOLEH KOREKSI / CLEAR KONSELING
  // ==========================================================

  {
    const res = await request(app)
      .delete("/api/konseling/1")
      .set("Authorization", `Bearer ${petugasToken}`);

    assert(
      res.status !== 401 && res.status !== 403,
      `Petugas harus boleh koreksi konseling. Status ${res.status}`,
    );

    ok(nomor++, "Petugas dapat melewati role check koreksi konseling.");
  }

  // ==========================================================
  // 11. ADMIN BOLEH MASUK KE ENDPOINT ADMIN
  //
  // Kita tidak mengharuskan aksi berhasil secara domain,
  // karena resource ID bisa saja tidak ada.
  // Yang penting bukan 401/403.
  // ==========================================================

  {
    const res = await request(app)
      .delete("/api/pemeriksaan/999999999")
      .set("Authorization", `Bearer ${adminToken}`);

    assert(
      res.status !== 401 && res.status !== 403,
      `Admin tidak boleh mendapat 401/403. Status ${res.status}`,
    );

    ok(nomor++, "Admin lolos role check endpoint sensitif.");
  }

  // ==========================================================
  // 12. TANPA TOKEN TETAP 401
  // ==========================================================

  {
    const res = await request(app).delete("/api/pemeriksaan/1");

    assert(res.status === 401, `Tanpa token harus 401, mendapat ${res.status}`);

    ok(nomor++, "Endpoint sensitif tanpa token tetap ditolak.");
  }

  console.log("");

  console.log("========================================");

  console.log(`ROLE TEST SELESAI: ${nomor - 1}/12 BERHASIL`);

  console.log("========================================");
}

main().catch((error) => {
  console.error("");

  console.error("âŒ ROLE TEST GAGAL");

  console.error(error);

  process.exitCode = 1;
});
