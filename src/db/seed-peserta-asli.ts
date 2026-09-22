import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

interface SeedLokasi {
  nama: string;
  alamat?: string;
}

interface SeedPosyandu {
  key: string;
  nama: string;
  lokasi: string;
}

interface SeedPeserta {
  nik: string;
  nama: string;
  noRm?: string;
  noTelp?: string;
  tanggalLahir: string;
  jenisKelamin: "L" | "P";
  alamatKtp?: string;
  rtKtp?: string;
  rwKtp?: string;
  alamatDomisili?: string;
  rtDomisili?: string;
  rwDomisili?: string;
  posyanduKey: string;
}

interface SeedData {
  meta: {
    referenceDate: string;
    defaultTanggalMulai: string;
    counts?: Record<string, number>;
  };
  lokasi: SeedLokasi[];
  posyandu: SeedPosyandu[];
  peserta: SeedPeserta[];
}

const COMMIT = process.argv.includes("--commit");

const projectRoot = process.cwd();
const seedPath = process.env.POSGA_SEED_FILE
  ? path.resolve(process.env.POSGA_SEED_FILE)
  : path.resolve(projectRoot, "data/private/seed-peserta-asli.json");
const dbPath = process.env.POSGA_DB_PATH
  ? path.resolve(process.env.POSGA_DB_PATH)
  : path.resolve(projectRoot, "data/posga.db");

function fail(message: string): never {
  throw new Error(message);
}

function bacaSeed(): SeedData {
  if (!fs.existsSync(seedPath)) {
    fail(`File seed tidak ditemukan: ${seedPath}`);
  }

  const raw = fs.readFileSync(seedPath, "utf8");
  const data = JSON.parse(raw) as SeedData;

  if (!Array.isArray(data.lokasi) || !Array.isArray(data.posyandu) || !Array.isArray(data.peserta)) {
    fail("Struktur file seed tidak valid.");
  }

  return data;
}

function parseNikIdentity(nik: string, referenceDate: string) {
  if (!/^\d{16}$/.test(nik)) {
    fail(`Seed memuat NIK tidak valid: ${nik}`);
  }

  const rawDay = Number(nik.slice(6, 8));
  const month = Number(nik.slice(8, 10));
  const yy = Number(nik.slice(10, 12));

  let jenisKelamin: "L" | "P";
  let day: number;

  if (rawDay >= 1 && rawDay <= 31) {
    jenisKelamin = "L";
    day = rawDay;
  } else if (rawDay >= 41 && rawDay <= 71) {
    jenisKelamin = "P";
    day = rawDay - 40;
  } else {
    fail(`Kode tanggal pada NIK ${nik} tidak valid.`);
  }

  if (month < 1 || month > 12) {
    fail(`Kode bulan pada NIK ${nik} tidak valid.`);
  }

  const referenceYear = Number(referenceDate.slice(0, 4));
  const pivot = referenceYear % 100;
  const year = yy <= pivot ? 2000 + yy : 1900 + yy;
  const tanggalLahir = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const date = new Date(`${tanggalLahir}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    fail(`Tanggal lahir hasil NIK ${nik} tidak valid.`);
  }

  if (tanggalLahir > referenceDate) {
    fail(`Tanggal lahir hasil NIK ${nik} berada setelah tanggal referensi.`);
  }

  return { tanggalLahir, jenisKelamin };
}

function validasiSeed(data: SeedData) {
  const seenNik = new Set<string>();
  const posyanduKeys = new Set(data.posyandu.map((item) => item.key));
  const lokasiNames = new Set(data.lokasi.map((item) => item.nama));

  for (const item of data.posyandu) {
    if (!lokasiNames.has(item.lokasi)) {
      fail(`Posyandu ${item.key} menunjuk lokasi yang tidak ada: ${item.lokasi}`);
    }
  }

  for (const item of data.peserta) {
    if (seenNik.has(item.nik)) {
      fail(`NIK duplikat masih ada di seed: ${item.nik}`);
    }
    seenNik.add(item.nik);

    if (!item.nama.trim()) {
      fail(`Peserta ${item.nik} tidak memiliki nama.`);
    }

    if (!posyanduKeys.has(item.posyanduKey)) {
      fail(`Peserta ${item.nik} menunjuk Posyandu yang tidak ada.`);
    }

    const parsed = parseNikIdentity(item.nik, data.meta.referenceDate);
    if (parsed.tanggalLahir !== item.tanggalLahir) {
      fail(`Tanggal lahir ${item.nik} tidak konsisten dengan NIK.`);
    }
    if (parsed.jenisKelamin !== item.jenisKelamin) {
      fail(`Jenis kelamin ${item.nik} tidak konsisten dengan NIK.`);
    }
  }
}

function assertSchema(sqlite: Database.Database) {
  const required = new Set(["lokasi", "posyandu", "peserta", "peserta_posyandu"]);
  const rows = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all() as Array<{ name: string }>;
  const available = new Set(rows.map((row) => row.name));
  const missing = [...required].filter((name) => !available.has(name));

  if (missing.length > 0) {
    fail(`Database belum memiliki tabel wajib: ${missing.join(", ")}. Jalankan migrasi database terlebih dahulu.`);
  }
}

function main() {
  const data = bacaSeed();
  validasiSeed(data);

  console.log("=== SEED PESERTA ASLI POSGA ===");
  console.log(`Mode               : ${COMMIT ? "COMMIT" : "DRY RUN"}`);
  console.log(`File seed          : ${seedPath}`);
  console.log(`Peserta siap       : ${data.peserta.length}`);
  console.log(`Posyandu           : ${data.posyandu.length}`);
  console.log(`Lokasi             : ${data.lokasi.length}`);

  if (!fs.existsSync(dbPath)) {
    fail(`Database tidak ditemukan: ${dbPath}`);
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
  assertSchema(sqlite);

  const existingPesertaStmt = sqlite.prepare("SELECT nik FROM peserta WHERE nik = ? LIMIT 1");
  const activeMembershipStmt = sqlite.prepare(`
    SELECT pp.posyandu_id AS posyanduId, p.nama AS posyanduNama, l.nama AS lokasiNama
    FROM peserta_posyandu pp
    INNER JOIN posyandu p ON p.id = pp.posyandu_id
    INNER JOIN lokasi l ON l.id = p.lokasi_id
    WHERE pp.peserta_nik = ? AND pp.aktif = 1 AND pp.tanggal_selesai IS NULL
    LIMIT 1
  `);

  const existingPeserta = new Set<string>();
  const existingMembership = new Map<string, { posyanduId: number; posyanduNama: string; lokasiNama: string }>();

  for (const item of data.peserta) {
    if (existingPesertaStmt.get(item.nik)) {
      existingPeserta.add(item.nik);
    }
    const membership = activeMembershipStmt.get(item.nik) as
      | { posyanduId: number; posyanduNama: string; lokasiNama: string }
      | undefined;
    if (membership) existingMembership.set(item.nik, membership);
  }

  console.log(`Sudah ada di DB     : ${existingPeserta.size}`);
  console.log(`Peserta baru        : ${data.peserta.length - existingPeserta.size}`);

  if (!COMMIT) {
    console.log("\nDATABASE BELUM DIUBAH.");
    console.log("Jika hasil sudah sesuai, jalankan: npm run seed:peserta -- --commit");
    sqlite.close();
    return;
  }

  const tanggalMulai = process.env.POSGA_SEED_TANGGAL_MULAI?.trim() || data.meta.defaultTanggalMulai;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalMulai)) {
    fail("POSGA_SEED_TANGGAL_MULAI harus berformat YYYY-MM-DD.");
  }

  const run = sqlite.transaction(() => {
    const getLokasi = sqlite.prepare("SELECT id FROM lokasi WHERE nama = ? LIMIT 1");
    const insertLokasi = sqlite.prepare(`
      INSERT INTO lokasi (nama, alamat, aktif)
      VALUES (?, ?, 1)
    `);

    const lokasiIds = new Map<string, number>();
    let lokasiBaru = 0;

    for (const item of data.lokasi) {
      let row = getLokasi.get(item.nama) as { id: number } | undefined;
      if (!row) {
        const result = insertLokasi.run(item.nama, item.alamat ?? null);
        row = { id: Number(result.lastInsertRowid) };
        lokasiBaru += 1;
      }
      lokasiIds.set(item.nama, row.id);
    }

    const getPosyandu = sqlite.prepare(
      "SELECT id FROM posyandu WHERE lokasi_id = ? AND nama = ? LIMIT 1",
    );
    const insertPosyandu = sqlite.prepare(`
      INSERT INTO posyandu (lokasi_id, nama, alamat, aktif)
      VALUES (?, ?, NULL, 1)
    `);

    const posyanduIds = new Map<string, number>();
    let posyanduBaru = 0;

    for (const item of data.posyandu) {
      const lokasiId = lokasiIds.get(item.lokasi);
      if (!lokasiId) fail(`Lokasi seed tidak ditemukan untuk ${item.key}.`);

      let row = getPosyandu.get(lokasiId, item.nama) as { id: number } | undefined;
      if (!row) {
        const result = insertPosyandu.run(lokasiId, item.nama);
        row = { id: Number(result.lastInsertRowid) };
        posyanduBaru += 1;
      }
      posyanduIds.set(item.key, row.id);
    }

    const insertPeserta = sqlite.prepare(`
      INSERT INTO peserta (
        nik, nama, no_rm, no_telp, tanggal_lahir, jenis_kelamin,
        alamat_ktp, rt_ktp, rw_ktp,
        alamat_domisili, rt_domisili, rw_domisili, aktif
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(nik) DO NOTHING
    `);

    const insertMembership = sqlite.prepare(`
      INSERT INTO peserta_posyandu (
        peserta_nik, posyandu_id, tanggal_mulai, tanggal_selesai, aktif
      ) VALUES (?, ?, ?, NULL, 1)
    `);

    let pesertaBaru = 0;
    let pesertaSudahAda = 0;
    let keanggotaanBaru = 0;
    let keanggotaanSama = 0;
    const membershipConflicts: Array<{ nik: string; target: string; existing: string }> = [];

    for (const item of data.peserta) {
      const targetPosyanduId = posyanduIds.get(item.posyanduKey);
      if (!targetPosyanduId) fail(`Posyandu seed tidak ditemukan untuk ${item.posyanduKey}.`);

      const result = insertPeserta.run(
        item.nik,
        item.nama,
        item.noRm ?? null,
        item.noTelp ?? null,
        item.tanggalLahir,
        item.jenisKelamin,
        item.alamatKtp ?? null,
        item.rtKtp ?? null,
        item.rwKtp ?? null,
        item.alamatDomisili ?? null,
        item.rtDomisili ?? null,
        item.rwDomisili ?? null,
      );

      if (result.changes > 0) pesertaBaru += 1;
      else pesertaSudahAda += 1;

      const active = activeMembershipStmt.get(item.nik) as
        | { posyanduId: number; posyanduNama: string; lokasiNama: string }
        | undefined;

      if (!active) {
        insertMembership.run(item.nik, targetPosyanduId, tanggalMulai);
        keanggotaanBaru += 1;
      } else if (active.posyanduId === targetPosyanduId) {
        keanggotaanSama += 1;
      } else {
        membershipConflicts.push({
          nik: item.nik,
          target: item.posyanduKey,
          existing: `${active.lokasiNama} / ${active.posyanduNama}`,
        });
      }
    }

    if (membershipConflicts.length > 0) {
      fail(
        `Ditemukan ${membershipConflicts.length} peserta yang sudah aktif di Posyandu lain pada database. Commit dibatalkan agar tidak memindahkan peserta secara otomatis.`,
      );
    }

    return {
      lokasiBaru,
      posyanduBaru,
      pesertaBaru,
      pesertaSudahAda,
      keanggotaanBaru,
      keanggotaanSama,
    };
  });

  const result = run();
  console.log("\n=== HASIL COMMIT ===");
  console.log(`Lokasi baru         : ${result.lokasiBaru}`);
  console.log(`Posyandu baru       : ${result.posyanduBaru}`);
  console.log(`Peserta baru        : ${result.pesertaBaru}`);
  console.log(`Peserta sudah ada   : ${result.pesertaSudahAda}`);
  console.log(`Keanggotaan baru    : ${result.keanggotaanBaru}`);
  console.log(`Keanggotaan sama    : ${result.keanggotaanSama}`);
  console.log("Seed peserta asli selesai.");

  sqlite.close();
}

try {
  main();
} catch (error) {
  console.error("SEED PESERTA ASLI GAGAL:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
