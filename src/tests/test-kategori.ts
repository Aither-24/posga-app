import assert from "node:assert/strict";
import { tentukanKategoriUsia } from "../lib/kategori.js";

const kasusKategori = [
  {
    lahir: "2025-09-03",
    periksa: "2026-09-02",
    kategori: "bayi",
    totalBulan: 11,
  },
  {
    lahir: "2025-09-02",
    periksa: "2026-09-02",
    kategori: "balita",
    totalBulan: 12,
  },
  {
    lahir: "2021-09-02",
    periksa: "2026-09-02",
    kategori: "prasekolah",
    totalBulan: 60,
  },
  {
    lahir: "2019-09-02",
    periksa: "2026-09-02",
    kategori: "sekolah",
    totalBulan: 84,
  },
  {
    lahir: "2008-09-02",
    periksa: "2026-09-02",
    kategori: "dewasa",
    totalBulan: 216,
  },
  {
    lahir: "1966-09-02",
    periksa: "2026-09-02",
    kategori: "lansia",
    totalBulan: 720,
  },
] as const;

for (const kasus of kasusKategori) {
  const hasil = tentukanKategoriUsia(
    kasus.lahir,
    kasus.periksa,
  );

  assert.equal(
    hasil.kategori,
    kasus.kategori,
    `Kategori salah untuk ${kasus.lahir}`,
  );

  assert.equal(
    hasil.totalBulan,
    kasus.totalBulan,
    `Total bulan salah untuk ${kasus.lahir}`,
  );

  assert.ok(
    hasil.umur.hari >= 0,
    `Hari tidak boleh negatif untuk ${kasus.lahir}`,
  );
}

// ============================================================
// REGRESSION TEST: AKHIR BULAN
// ============================================================

const akhirBulan =
  tentukanKategoriUsia(
    "2023-01-31",
    "2023-03-01",
  );

assert.deepEqual(
  akhirBulan.umur,
  {
    tahun: 0,
    bulan: 1,
    hari: 1,
  },
);

assert.equal(
  akhirBulan.totalBulan,
  1,
);

assert.equal(
  akhirBulan.kategori,
  "bayi",
);

// ============================================================
// REGRESSION TEST: FEBRUARI TAHUN KABISAT
// ============================================================

const tahunKabisat =
  tentukanKategoriUsia(
    "2024-02-29",
    "2025-02-28",
  );

assert.deepEqual(
  tahunKabisat.umur,
  {
    tahun: 1,
    bulan: 0,
    hari: 0,
  },
);

assert.equal(
  tahunKabisat.totalBulan,
  12,
);

assert.equal(
  tahunKabisat.kategori,
  "balita",
);

// ============================================================
// TANGGAL PEMERIKSAAN SEBELUM LAHIR
// ============================================================

assert.throws(
  () =>
    tentukanKategoriUsia(
      "2026-09-03",
      "2026-09-02",
    ),
  /lebih awal dari tanggal lahir/,
);

// ============================================================
// TANGGAL TIDAK VALID
// ============================================================

assert.throws(
  () =>
    tentukanKategoriUsia(
      "2026-02-30",
      "2026-09-02",
    ),
  /Tanggal tidak valid/,
);

console.log(
  "✅ test-kategori: seluruh pengujian lulus",
);