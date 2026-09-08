import {
  ambilAturanIndikator,
  ambilIndikatorByKode,
  ambilOpsiIndikator,
  tambahAturanIndikator,
  tambahIndikator,
  tambahOpsiIndikator,
  updateAturanIndikator,
  updateIndikator,
  updateOpsiIndikator,
  type FrekuensiIndikator,
  type KategoriIndikator,
  type KelompokIndikator,
  type TipeInputIndikator,
} from "../lib/indikator.service.js";

// ============================================================
// TYPE SEED
// ============================================================

interface SeedOpsi {
  kode: string;
  label: string;
  urutan?: number;
  nilaiNumerik?: number | null;
}

interface SeedAturan {
  kategori: KategoriIndikator;

  frekuensi: FrekuensiIndikator;

  usiaMinBulan?: number | null;

  usiaMaxBulan?: number | null;

  jenisKelamin?: "L" | "P" | null;

  wajib?: boolean;

  berdasarkanIndikasi?: boolean;

  aturanJson?: Record<string, unknown> | null;
}

interface SeedIndikator {
  kode: string;

  nama: string;

  kelompok: KelompokIndikator;

  tipeInput: TipeInputIndikator;

  satuan?: string | null;

  derived?: boolean;

  deskripsi?: string | null;

  urutanDefault: number;

  opsi?: SeedOpsi[];

  aturan: SeedAturan[];
}

// ============================================================
// HELPER
// ============================================================

function kodeNormal(nilai: string) {
  return nilai
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function jsonStabil(nilai: Record<string, unknown> | null | undefined) {
  if (!nilai) {
    return null;
  }

  return JSON.stringify(nilai);
}

// ============================================================
// UPSERT INDIKATOR
// ============================================================

async function pastikanIndikator(item: SeedIndikator) {
  let existing = await ambilIndikatorByKode(item.kode);

  if (!existing) {
    existing = await tambahIndikator({
      kode: item.kode,

      nama: item.nama,

      kelompok: item.kelompok,

      tipeInput: item.tipeInput,

      ...(item.satuan !== undefined
        ? {
            satuan: item.satuan,
          }
        : {}),

      derived: item.derived ?? false,

      ...(item.deskripsi !== undefined
        ? {
            deskripsi: item.deskripsi,
          }
        : {}),

      urutanDefault: item.urutanDefault,

      aktif: true,
    });

    if (!existing) {
      throw new Error(`Gagal membuat indikator ${item.kode}`);
    }

    console.log(`CREATE indikator ${item.kode}`);
  } else {
    existing = await updateIndikator(existing.id, {
      nama: item.nama,

      kelompok: item.kelompok,

      tipeInput: item.tipeInput,

      satuan: item.satuan ?? null,

      derived: item.derived ?? false,

      deskripsi: item.deskripsi ?? null,

      urutanDefault: item.urutanDefault,

      aktif: true,
    });

    if (!existing) {
      throw new Error(`Gagal memperbarui indikator ${item.kode}`);
    }

    console.log(`UPDATE indikator ${item.kode}`);
  }

  return existing;
}

// ============================================================
// UPSERT OPSI
// ============================================================

async function pastikanOpsi(indikatorId: number, daftar: SeedOpsi[]) {
  const existing = await ambilOpsiIndikator(indikatorId, false);

  for (let i = 0; i < daftar.length; i++) {
    const opsi = daftar[i]!;

    const kode = kodeNormal(opsi.kode);

    const ditemukan = existing.find((item) => item.kode === kode);

    if (!ditemukan) {
      await tambahOpsiIndikator({
        indikatorId,

        kode,

        label: opsi.label,

        ...(opsi.nilaiNumerik !== undefined
          ? {
              nilaiNumerik: opsi.nilaiNumerik,
            }
          : {}),

        urutan: opsi.urutan ?? i + 1,

        aktif: true,
      });

      console.log(`  CREATE opsi ${kode}`);

      continue;
    }

    await updateOpsiIndikator(ditemukan.id, {
      label: opsi.label,

      nilaiNumerik: opsi.nilaiNumerik ?? null,

      urutan: opsi.urutan ?? i + 1,

      aktif: true,
    });

    console.log(`  UPDATE opsi ${kode}`);
  }

  const kodeAktif =
    new Set(
      daftar.map(
        (item) =>
          kodeNormal(item.kode),
      ),
    );

  for (const lama of existing) {
    if (!kodeAktif.has(lama.kode) && lama.aktif) {
      await updateOpsiIndikator(lama.id, {
        aktif: false,
      });

      console.log(`  NONAKTIF opsi lama ${lama.kode}`);
    }
  }
}

// ============================================================
// COCOKKAN ATURAN
// ============================================================

function aturanSama(
  existing: Awaited<ReturnType<typeof ambilAturanIndikator>>[number],
  target: SeedAturan,
) {
  const targetJson = jsonStabil(target.aturanJson);

  return (
    existing.kategori === target.kategori &&
    existing.frekuensi === target.frekuensi &&
    existing.usiaMinBulan === (target.usiaMinBulan ?? null) &&
    existing.usiaMaxBulan === (target.usiaMaxBulan ?? null) &&
    existing.jenisKelamin === (target.jenisKelamin ?? null) &&
    existing.aturanJson === targetJson
  );
}

// ============================================================
// UPSERT ATURAN
// ============================================================

async function pastikanAturan(indikatorId: number, daftar: SeedAturan[]) {
  const existing = await ambilAturanIndikator(indikatorId, false);

  for (const aturan of daftar) {
    const ditemukan = existing.find((item) => aturanSama(item, aturan));

    const aturanJson = jsonStabil(aturan.aturanJson);

    if (!ditemukan) {
      await tambahAturanIndikator({
        indikatorId,

        kategori: aturan.kategori,

        frekuensi: aturan.frekuensi,

        ...(aturan.usiaMinBulan !== undefined
          ? {
              usiaMinBulan: aturan.usiaMinBulan,
            }
          : {}),

        ...(aturan.usiaMaxBulan !== undefined
          ? {
              usiaMaxBulan: aturan.usiaMaxBulan,
            }
          : {}),

        ...(aturan.jenisKelamin !== undefined
          ? {
              jenisKelamin: aturan.jenisKelamin,
            }
          : {}),

        wajib: aturan.wajib ?? false,

        berdasarkanIndikasi: aturan.berdasarkanIndikasi ?? false,

        ...(aturanJson !== null
          ? {
              aturanJson,
            }
          : {}),

        aktif: true,
      });

      console.log(`  CREATE aturan ${aturan.kategori} / ${aturan.frekuensi}`);

      continue;
    }

    await updateAturanIndikator(ditemukan.id, {
      wajib: aturan.wajib ?? false,

      berdasarkanIndikasi: aturan.berdasarkanIndikasi ?? false,

      aktif: true,
    });

    console.log(`  UPDATE aturan ${aturan.kategori} / ${aturan.frekuensi}`);
  }

  for (const lama of existing) {
    const masihDipakai =
      daftar.some(
        (aturan) =>
          aturanSama(
            lama,
            aturan,
          ),
      );

    if (!masihDipakai && lama.aktif) {
      await updateAturanIndikator(lama.id, {
        aktif: false,
      });

      console.log(
        `  NONAKTIF aturan lama ${lama.kategori} / ${lama.frekuensi}`,
      );
    }
  }
}

// ============================================================
// HELPER RULE
// ============================================================

function setiapSesi(kategori: KategoriIndikator, wajib = false): SeedAturan {
  return {
    kategori,
    frekuensi: "setiap_sesi",
    wajib,
  };
}

function tahunan(kategori: KategoriIndikator): SeedAturan {
  return {
    kategori,
    frekuensi: "tahunan",
    wajib: false,
  };
}

function indikasi(kategori: KategoriIndikator): SeedAturan {
  return {
    kategori,
    frekuensi: "sesuai_indikasi",
    wajib: false,
    berdasarkanIndikasi: true,
  };
}

function sekali(kategori: KategoriIndikator): SeedAturan {
  return {
    kategori,
    frekuensi: "sekali_seumur_hidup",
    wajib: false,
  };
}

// ============================================================
// MASTER INDIKATOR POSGA
// ============================================================

const DATA: SeedIndikator[] = [
  // ==========================================================
  // PENGUKURAN UMUM
  // ==========================================================

  {
    kode: "BB",
    nama: "Berat Badan",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "kg",
    urutanDefault: 10,

    aturan: [
      setiapSesi("bayi", true),

      setiapSesi("balita", true),

      setiapSesi("prasekolah", true),

      setiapSesi("sekolah", true),

      setiapSesi("dewasa", true),

      setiapSesi("lansia", true),

      setiapSesi("ibu_hamil", true),

      setiapSesi("ibu_nifas", true),
    ],
  },

  {
    kode: "PB",
    nama: "Panjang Badan",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "cm",
    urutanDefault: 20,

    aturan: [
      setiapSesi("bayi", true),
      {
        kategori: "balita",
        frekuensi: "setiap_sesi",
        usiaMaxBulan: 23,
        wajib: true,
      },
    ],
  },

  {
    kode: "TB",
    nama: "Tinggi Badan",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "cm",
    urutanDefault: 20,

    aturan: [
      {
        kategori: "balita",
        frekuensi: "setiap_sesi",
        usiaMinBulan: 24,
        usiaMaxBulan: 59,
        wajib: true,
      },
      setiapSesi("prasekolah", true),
      setiapSesi("sekolah", true),
      setiapSesi("dewasa", true),
      setiapSesi("lansia", true),
    ],
  },

  {
    kode: "LIKA",
    nama: "Lingkar Kepala",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "cm",
    urutanDefault: 30,

    aturan: [setiapSesi("bayi"), setiapSesi("balita"), setiapSesi("prasekolah")],
  },

  {
    kode: "LILA",
    nama: "Lingkar Lengan Atas",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "cm",
    urutanDefault: 40,

    aturan: [
      setiapSesi("bayi"),
      setiapSesi("balita"),
      setiapSesi("prasekolah"),
      setiapSesi("sekolah"),
      setiapSesi("dewasa"),
      setiapSesi("lansia"),
    ],
  },

  {
    kode: "LIPE",
    nama: "Lingkar Perut",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "cm",
    urutanDefault: 50,

    aturan: [
      setiapSesi("bayi"),
      setiapSesi("balita"),
      setiapSesi("dewasa"),
      setiapSesi("lansia"),
    ],
  },

  {
    kode: "STATUS_LIPE",
    nama: "Status Lingkar Perut",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 51,

    opsi: [
      {
        kode: "TIDAK_VALID",
        label: "Nilai Tidak Valid",
      },
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "OBESITAS_SENTRAL",
        label: "Obesitas Sentral",
      },
    ],

    aturan: [
      setiapSesi("dewasa"),
      setiapSesi("lansia"),
    ],
  },

  {
    kode: "IMT",
    nama: "Indeks Massa Tubuh",
    kelompok: "pemeriksaan",
    tipeInput: "number",
      satuan: "kg/m²",
    derived: true,
    urutanDefault: 60,

    aturan: [
      setiapSesi("balita"),
      setiapSesi("sekolah"),
      setiapSesi("dewasa"),
      setiapSesi("lansia"),
    ],
  },

  // ==========================================================
  // TEKANAN DARAH
  // ==========================================================

  {
    kode: "TD_SISTOLIK",
    nama: "Tekanan Darah Sistolik",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "mmHg",
    urutanDefault: 70,

    aturan: [
      setiapSesi("sekolah"),
      setiapSesi("dewasa"),
      setiapSesi("lansia"),
      setiapSesi("ibu_hamil"),
      setiapSesi("ibu_nifas"),
    ],
  },

  {
    kode: "TD_DIASTOLIK",
    nama: "Tekanan Darah Diastolik",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "mmHg",
    urutanDefault: 71,

    aturan: [
      setiapSesi("sekolah"),
      setiapSesi("dewasa"),
      setiapSesi("lansia"),
      setiapSesi("ibu_hamil"),
      setiapSesi("ibu_nifas"),
    ],
  },

  {
    kode: "MAP",
    nama: "Mean Arterial Pressure",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "mmHg",
    derived: true,
    urutanDefault: 72,

    aturan: [setiapSesi("ibu_hamil")],
  },

  {
    kode: "ROT",
    nama: "Roll Over Test",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    urutanDefault: 73,

    aturan: [setiapSesi("ibu_hamil")],
  },

  // ==========================================================
  // GULA DARAH / HB
  // ==========================================================

  {
    kode: "GDA_GDP",
    nama: "Gula Darah Hamil/Nifas",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "mg/dL",
    urutanDefault: 80,

    aturan: [setiapSesi("ibu_hamil"), setiapSesi("ibu_nifas")],
  },

  {
    kode: "GDA",
    nama: "Gula Darah Sewaktu",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "mg/dL",
    urutanDefault: 80,

    aturan: [setiapSesi("dewasa"), setiapSesi("lansia")],
  },

  {
    kode: "HB",
    nama: "Hemoglobin",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "g/dL",
    urutanDefault: 81,

    aturan: [
      {
        kategori: "sekolah",
        frekuensi: "usia_tertentu",
        jenisKelamin: "P",
        aturanJson: {
          usiaTahun: [7, 10, 12, 15],
        },
      },
      setiapSesi("ibu_hamil"),
      setiapSesi("ibu_nifas"),
    ],
  },

  {
    kode: "JUMLAH_TTD",
    nama: "Jumlah Tablet Tambah Darah yang Telah Diminum",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    satuan: "tablet",
    urutanDefault: 82,

    aturan: [setiapSesi("ibu_hamil"), setiapSesi("ibu_nifas")],
  },

  // ==========================================================
  // SDIDTK
  // ==========================================================

  {
    kode: "SDIDTK",
    nama: "SDIDTK",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    urutanDefault: 100,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "MERAGUKAN",
        label: "Meragukan",
      },
      {
        kode: "MUNGKIN_MENYIMPANG",
        label: "Mungkin Menyimpang",
      },
    ],

    aturan: [
      {
        kategori: "bayi",

        frekuensi: "usia_tertentu",

        aturanJson: {
          usiaBulan: [3, 6, 9],
        },
      },

      {
        kategori: "balita",

        frekuensi: "usia_tertentu",

        aturanJson: {
          usiaBulan: [12, 18, 24, 30, 36, 42, 48, 54, 60],
        },
      },

      {
        kategori: "prasekolah",

        frekuensi: "usia_tertentu",

        aturanJson: {
          usiaBulan: [60, 66, 72],
        },
      },
    ],
  },

  // ==========================================================
  // STATUS ANTROPOMETRI BAYI/BALITA
  // ==========================================================

  {
    kode: "BB_U",
    nama: "BB/U",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    derived: true,
    urutanDefault: 110,

    aturan: [setiapSesi("bayi"), setiapSesi("balita"), setiapSesi("prasekolah")],
  },

  {
    kode: "STATUS_BB_U",
    nama: "Status Gizi BB/U",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 111,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "KURANG",
        label: "Kurang",
      },
      {
        kode: "SANGAT_KURANG",
        label: "Sangat Kurang",
      },
      {
        kode: "BADAN_LEBIH",
        label: "Badan Lebih",
      },
    ],

    aturan: [setiapSesi("bayi"), setiapSesi("balita"), setiapSesi("prasekolah")],
  },

  {
    kode: "TB_U",
    nama: "TB/U",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    derived: true,
    urutanDefault: 112,

    aturan: [setiapSesi("bayi"), setiapSesi("balita"), setiapSesi("prasekolah")],
  },

  {
    kode: "STATUS_TB_U",
    nama: "Status Gizi TB/U",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 113,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "PENDEK",
        label: "Pendek",
      },
      {
        kode: "SANGAT_PENDEK",
        label: "Sangat Pendek",
      },
      {
        kode: "TINGGI",
        label: "Tinggi",
      },
    ],

    aturan: [setiapSesi("bayi"), setiapSesi("balita"), setiapSesi("prasekolah")],
  },

  {
    kode: "BB_TB",
    nama: "BB/TB",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    derived: true,
    urutanDefault: 114,

    aturan: [
      setiapSesi("bayi"),
      setiapSesi("balita"),
    ],
  },

  {
    kode: "STATUS_BB_TB",
    nama: "Status Gizi BB/TB",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 115,

    opsi: [
      {
        kode: "BAIK",
        label: "Baik",
      },
      {
        kode: "BURUK",
        label: "Buruk",
      },
      {
        kode: "KURANG",
        label: "Kurang",
      },
      {
        kode: "RISIKO_GIZI_LEBIH",
        label: "Risiko Gizi Lebih",
      },
      {
        kode: "GIZI_LEBIH",
        label: "Gizi Lebih",
      },
      {
        kode: "OBESITAS",
        label: "Obesitas",
      },
    ],

    aturan: [
      setiapSesi("bayi"),
      setiapSesi("balita"),
    ],
  },

  {
    kode: "STATUS_LILA",
    nama: "Status Gizi Berdasarkan LILA",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 116,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "KURANG",
        label: "Kurang",
      },
      {
        kode: "BURUK",
        label: "Buruk",
      },
    ],

    aturan: [setiapSesi("bayi"), setiapSesi("balita")],
  },

  {
    kode: "STATUS_LIKA",
    nama: "Status Lingkar Kepala",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 117,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "MAKROSEFAL",
        label: "Makrosefal",
      },
      {
        kode: "MIKROSEFAL",
        label: "Mikrosefal",
      },
    ],

    aturan: [setiapSesi("bayi"), setiapSesi("balita")],
  },

  // ==========================================================
  // IMT / OBESITAS
  // ==========================================================

  {
    kode: "IMT_U",
    nama: "IMT/U",
    kelompok: "pemeriksaan",
    tipeInput: "number",
    derived: true,
    urutanDefault: 118,
    aturan: [setiapSesi("prasekolah"), setiapSesi("sekolah")],
  },

  {
    kode: "STATUS_IMT_U",
    nama: "Status Gizi IMT/U",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 119,

    opsi: [
      {
        kode: "BAIK",
        label: "Gizi Baik",
      },
      {
        kode: "KURANG",
        label: "Gizi Kurang",
      },
      {
        kode: "BURUK",
        label: "Gizi Buruk",
      },
      {
        kode: "LEBIH",
        label: "Gizi Lebih",
      },
      {
        kode: "OBESITAS",
        label: "Obesitas",
      },
    ],

    aturan: [setiapSesi("prasekolah"), setiapSesi("sekolah")],
  },

  {
    kode: "STATUS_IMT_BALITA",
    nama: "Status IMT Balita",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 120,

    opsi: [
      {
        kode: "BAIK",
        label: "Gizi Baik",
      },
      {
        kode: "KURANG",
        label: "Gizi Kurang",
      },
      {
        kode: "BURUK",
        label: "Gizi Buruk",
      },
      {
        kode: "LEBIH",
        label: "Gizi Lebih",
      },
      {
        kode: "OBESITAS",
        label: "Obesitas",
      },
    ],

    aturan: [setiapSesi("balita")],
  },

  {
    kode: "STATUS_OBESITAS",
    nama: "Status IMT",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 121,

    opsi: [
      {
        kode: "KURANG",
        label: "Kurang",
      },
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "OVERWEIGHT",
        label: "Overweight",
      },
      {
        kode: "OBESITAS_1",
        label: "Obesitas I",
      },
      {
        kode: "OBESITAS_2",
        label: "Obesitas II",
      },
    ],

    aturan: [setiapSesi("dewasa"), setiapSesi("lansia")],
  },

  // ==========================================================
  // DIABETES
  // ==========================================================

  {
    kode: "STATUS_DM",
    nama: "Status Gula Darah",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 130,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "PREDIABETES",
        label: "Prediabetes",
      },
      {
        kode: "DM",
        label: "Diabetes Melitus",
      },
    ],

    aturan: [
      setiapSesi("dewasa"),
      setiapSesi("lansia"),
    ],
  },

  // ==========================================================
  // HIPERTENSI
  // ==========================================================

  {
    kode: "STATUS_HIPERTENSI",
    nama: "Status Tekanan Darah",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 131,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "PREHIPERTENSI",
        label: "Prehipertensi",
      },
      {
        kode: "HIPERTENSI_1",
        label: "Hipertensi Derajat 1",
      },
      {
        kode: "HIPERTENSI_2",
        label: "Hipertensi Derajat 2",
      },
      {
        kode: "HIPERTENSI_3",
        label: "Hipertensi Derajat 3",
      },
      {
        kode: "HT_SISTOLIK_TERISOLASI",
        label: "Hipertensi Sistolik Terisolasi",
      },
    ],

    aturan: [setiapSesi("dewasa"), setiapSesi("lansia")],
  },

  {
    kode: "STATUS_HT_NIFAS",
    nama: "Status Tekanan Darah Nifas",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 132,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "PREHIPERTENSI",
        label: "Prehipertensi",
      },
      {
        kode: "HIPERTENSI_1",
        label: "Hipertensi Derajat 1",
      },
      {
        kode: "HIPERTENSI_2",
        label: "Hipertensi Derajat 2",
      },
      {
        kode: "HIPERTENSI_3",
        label: "Hipertensi Derajat 3",
      },
      {
        kode: "HT_SISTOLIK_TERISOLASI",
        label: "Hipertensi Sistolik Terisolasi",
      },
    ],

    aturan: [setiapSesi("ibu_nifas")],
  },

  // ==========================================================
  // ANEMIA
  // ==========================================================

  {
    kode: "STATUS_ANEMIA",
    nama: "Status Anemia",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 140,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "RINGAN",
        label: "Ringan",
      },
      {
        kode: "SEDANG",
        label: "Sedang",
      },
      {
        kode: "BERAT",
        label: "Berat",
      },
    ],

    aturan: [
      {
        kategori: "sekolah",

        frekuensi: "usia_tertentu",

        jenisKelamin: "P",

        aturanJson: {
          usiaTahun: [7, 10, 12, 15],
        },
      },

      setiapSesi("ibu_hamil"),

      setiapSesi("ibu_nifas"),
    ],
  },

  // ==========================================================
  // KEHAMILAN
  // ==========================================================

  {
    kode: "KSPR",
    nama: "KSPR",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    urutanDefault: 150,

    opsi: [
      {
        kode: "RR",
        label: "RR",
      },
      {
        kode: "RT",
        label: "RT",
      },
      {
        kode: "RST",
        label: "RST",
      },
    ],

    aturan: [setiapSesi("ibu_hamil")],
  },

  {
    kode: "STATUS_PREEKLAMPSIA",
    nama: "Skrining Pre-eklampsia",
    kelompok: "skrining",
    tipeInput: "select",
    derived: false,
    urutanDefault: 151,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "SK_PE_POSITIF",
        label: "Skrining PE Positif",
      },
    ],

    aturan: [indikasi("ibu_hamil")],
  },

  {
    kode: "JENIS_KUNJUNGAN_HAMIL",
    nama: "Jenis Kunjungan Kehamilan",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    urutanDefault: 152,

    opsi: [
      {
        kode: "K1",
        label: "K1",
      },
      {
        kode: "K2",
        label: "K2",
      },
      {
        kode: "K3",
        label: "K3",
      },
      {
        kode: "K4",
        label: "K4",
      },
      {
        kode: "K5",
        label: "K5",
      },
      {
        kode: "K6",
        label: "K6",
      },
    ],

    aturan: [setiapSesi("ibu_hamil")],
  },

  {
    kode: "JENIS_KUNJUNGAN_NIFAS",
    nama: "Jenis Kunjungan Nifas",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    derived: true,
    urutanDefault: 153,

    opsi: [
      {
        kode: "KF1",
        label: "KF1 (0–2 hari)",
      },
      {
        kode: "KF2",
        label: "KF2 (3–7 hari)",
      },
      {
        kode: "KF3",
        label: "KF3 (8–28 hari)",
      },
      {
        kode: "KF4",
        label: "KF4 (29–42 hari)",
      },
    ],

    aturan: [setiapSesi("ibu_nifas")],
  },

  // ==========================================================
  // SKRINING DASAR ANAK
  // ==========================================================

  {
    kode: "SKRINING_SHK",
    nama: "Skrining Hipotiroid Kongenital",
    kelompok: "skrining",
    tipeInput: "text",
    urutanDefault: 200,

    aturan: [sekali("bayi")],
  },

  {
    kode: "SKRINING_PBJ",
    nama: "Skrining PBJ",
    kelompok: "skrining",
    tipeInput: "text",
    urutanDefault: 201,

    aturan: [sekali("bayi")],
  },

  {
    kode: "VITAMIN_A_BIRU",
    nama: "Vitamin A Biru",
    kelompok: "skrining",
    tipeInput: "boolean",
    urutanDefault: 202,

    aturan: [tahunan("bayi"), tahunan("balita"), tahunan("prasekolah")],
  },

  // ==========================================================
  // TBC
  // ==========================================================

  {
    kode: "SKRINING_TBC",
    nama: "Skrining TBC",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 210,

    opsi: [
      {
        kode: "TERDUGA_TB",
        label: "Terduga TB",
      },
      {
        kode: "TIDAK_TERDUGA_TB",
        label: "Tidak Terduga TB",
      },
    ],

    aturan: [
      {
        kategori: "bayi",
        frekuensi: "manual",
      },

      {
        kategori: "balita",
        frekuensi: "manual",
      },

      {
        kategori: "prasekolah",
        frekuensi: "manual",
      },

      {
        kategori: "sekolah",
        frekuensi: "manual",
      },

      {
        kategori: "dewasa",
        frekuensi: "manual",
      },

      {
        kategori: "lansia",
        frekuensi: "manual",
      },

      {
        kategori: "ibu_hamil",
        frekuensi: "manual",
      },

      {
        kategori: "ibu_nifas",
        frekuensi: "manual",
      },
    ],
  },

  // ==========================================================
  // SDQ / KESWA
  // ==========================================================

  {
    kode: "SKRINING_SDQ",
    nama: "Skrining SDQ",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 211,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "BORDERLINE",
        label: "Borderline",
      },
      {
        kode: "TERINDIKASI_BERMASALAH",
        label: "Terindikasi Bermasalah",
      },
    ],

    aturan: [
      {
        kategori: "balita",

        frekuensi: "manual",

        usiaMinBulan: 48,
      },

      {
        kategori: "prasekolah",
        frekuensi: "manual",
      },
    ],
  },

  {
    kode: "SKRINING_KESWA",
    nama: "Skrining Kesehatan Jiwa",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 212,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "BORDERLINE",
        label: "Borderline",
      },
      {
        kode: "TERINDIKASI_BERMASALAH",
        label: "Terindikasi Bermasalah",
      },
    ],

    aturan: [tahunan("sekolah"), tahunan("dewasa"), tahunan("lansia")],
  },

  // ==========================================================
  // INFEKSI / RISIKO
  // ==========================================================

  {
    kode: "SKRINING_HIV",
    nama: "Skrining HIV",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 220,

    opsi: [
      {
        kode: "BERISIKO",
        label: "Berisiko",
      },
      {
        kode: "TIDAK_BERISIKO",
        label: "Tidak Berisiko",
      },
    ],

    aturan: [
      tahunan("balita"),
      tahunan("prasekolah"),
      tahunan("sekolah"),
      indikasi("dewasa"),
      indikasi("lansia"),
    ],
  },

  {
    kode: "SKRINING_HEPATITIS_B",
    nama: "Skrining Hepatitis B",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 221,

    opsi: [
      {
        kode: "BERISIKO",
        label: "Berisiko",
      },
      {
        kode: "TIDAK_BERISIKO",
        label: "Tidak Berisiko",
      },
    ],

    aturan: [
      tahunan("balita"),
      tahunan("prasekolah"),
      tahunan("sekolah"),
      indikasi("dewasa"),
      indikasi("lansia"),
    ],
  },

  {
    kode: "SKRINING_MALARIA",
    nama: "Skrining Malaria",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 222,

    opsi: [
      {
        kode: "BERISIKO",
        label: "Berisiko",
      },
      {
        kode: "TIDAK_BERISIKO",
        label: "Tidak Berisiko",
      },
    ],

    aturan: [
      {
        kategori: "balita",
        frekuensi: "manual",
      },

      {
        kategori: "prasekolah",
        frekuensi: "manual",
      },

      {
        kategori: "sekolah",
        frekuensi: "manual",
      },

      indikasi("dewasa"),
      indikasi("lansia"),
    ],
  },

  {
    kode: "SKRINING_TALASEMIA",
    nama: "Skrining Talasemia",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 223,

    opsi: [
      {
        kode: "BERISIKO",
        label: "Berisiko",
      },
      {
        kode: "TIDAK_BERISIKO",
        label: "Tidak Berisiko",
      },
    ],

    aturan: [
      sekali("balita"),
      sekali("prasekolah"),
      sekali("sekolah"),
      sekali("dewasa"),
      sekali("lansia"),
    ],
  },

  // ==========================================================
  // KEKERASAN
  // ==========================================================

  {
    kode: "SKRINING_KEKERASAN",
    nama: "Skrining Kekerasan",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 230,

    opsi: [
      {
        kode: "TIDAK_TERINDIKASI",
        label: "Tidak Terindikasi",
      },
      {
        kode: "TERINDIKASI",
        label: "Terindikasi",
      },
    ],

    aturan: [
      indikasi("balita"),
      indikasi("prasekolah"),
      indikasi("sekolah"),
      indikasi("dewasa"),
      indikasi("lansia"),
    ],
  },

  // ==========================================================
  // MEROKOK
  // ==========================================================

  {
    kode: "FAKTOR_RISIKO_MEROKOK",
    nama: "Faktor Risiko Merokok",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 231,

    opsi: [
      {
        kode: "TIDAK_MEROKOK",
        label: "Tidak Merokok",
      },
      {
        kode: "MEROKOK",
        label: "Merokok",
      },
    ],

    aturan: [
      {
        kategori: "prasekolah",

        frekuensi: "manual",

        usiaMinBulan: 72,
      },

      {
        kategori: "sekolah",
        frekuensi: "manual",
      },

      {
        kategori: "dewasa",
        frekuensi: "manual",
      },

      {
        kategori: "lansia",
        frekuensi: "manual",
      },
    ],
  },

  // ==========================================================
  // GILUT
  // ==========================================================

  {
    kode: "SKRINING_GILUT",
    nama: "Skrining Gigi dan Mulut",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 232,

    opsi: [
      {
        kode: "ADA_MASALAH",
        label: "Ada Masalah",
      },
      {
        kode: "TIDAK_ADA_MASALAH",
        label: "Tidak Ada Masalah",
      },
    ],

    aturan: [
      tahunan("balita"),
      tahunan("prasekolah"),
      tahunan("sekolah"),
      tahunan("dewasa"),
      tahunan("lansia"),
      tahunan("ibu_hamil"),
      tahunan("ibu_nifas"),
    ],
  },

  // ==========================================================
  // SKRINING KEHAMILAN / NIFAS
  // ==========================================================

  {
    kode: "SKRINING_GIZI_KEHAMILAN",
    nama: "Skrining Gizi",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 240,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "KURANG",
        label: "Kurang",
      },
      {
        kode: "LEBIH",
        label: "Lebih",
      },
      {
        kode: "SANGAT_LEBIH",
        label: "Sangat Lebih",
      },
    ],

    aturan: [
      {
        kategori: "ibu_hamil",
        frekuensi: "manual",
      },

      {
        kategori: "ibu_nifas",
        frekuensi: "manual",
      },
    ],
  },

  {
    kode: "TRIPLE_E",
    nama: "Triple E",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 241,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "TIDAK_NORMAL",
        label: "Tidak Normal",
      },
    ],

    aturan: [
      {
        kategori: "ibu_hamil",
        frekuensi: "manual",
      },

      {
        kategori: "ibu_nifas",
        frekuensi: "manual",
      },
    ],
  },

  {
    kode: "WAST",
    nama: "WAST",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 242,

    opsi: [
      {
        kode: "TIDAK_ADA_KEKERASAN",
        label: "Tidak Ada Kekerasan",
      },
      {
        kode: "ADA_KEKERASAN",
        label: "Ada Kekerasan",
      },
    ],

    aturan: [
      {
        kategori: "ibu_hamil",
        frekuensi: "manual",
      },

      {
        kategori: "ibu_nifas",
        frekuensi: "manual",
      },
    ],
  },

  {
    kode: "SRQ20",
    nama: "SRQ-20",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 243,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "TERINDIKASI_BERMASALAH",
        label: "Terindikasi Bermasalah",
      },
    ],

    aturan: [
      {
        kategori: "ibu_hamil",
        frekuensi: "manual",
      },

      {
        kategori: "ibu_nifas",
        frekuensi: "manual",
      },
    ],
  },

  // ==========================================================
  // DEWASA / LANSIA - DM
  // ==========================================================

  {
    kode: "SKRINING_DM",
    nama: "Skrining Diabetes Melitus",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 300,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "PREDIABETES",
        label: "Prediabetes",
      },
      {
        kode: "DM",
        label: "DM",
      },
    ],

    aturan: [tahunan("dewasa"), tahunan("lansia")],
  },

  // ==========================================================
  // STROKE
  // ==========================================================

  {
    kode: "RISIKO_STROKE",
    nama: "Faktor Risiko Stroke",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 301,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "SANGAT_TINGGI",
        label: "Sangat Tinggi",
      },
    ],

    aturan: [
      {
        kategori: "dewasa",

        frekuensi: "dua_kali_tahun",

        usiaMinBulan: 480,
      },

      {
        kategori: "lansia",

        frekuensi: "dua_kali_tahun",
      },
    ],
  },

  {
    kode: "KOLESTEROL_1",
    nama: "Kolesterol Pemeriksaan 1",
    kelompok: "skrining",
    tipeInput: "number",
    satuan: "mg/dL",
    urutanDefault: 302,

    aturan: [
      {
        kategori: "dewasa",

        frekuensi: "dua_kali_tahun",

        usiaMinBulan: 480,
      },

      {
        kategori: "lansia",
        frekuensi: "dua_kali_tahun",
      },
    ],
  },

  {
    kode: "KOLESTEROL_2",
    nama: "Kolesterol Pemeriksaan 2",
    kelompok: "skrining",
    tipeInput: "number",
    satuan: "mg/dL",
    urutanDefault: 303,

    aturan: [
      {
        kategori: "dewasa",

        frekuensi: "dua_kali_tahun",

        usiaMinBulan: 480,
      },

      {
        kategori: "lansia",
        frekuensi: "dua_kali_tahun",
      },
    ],
  },

  {
    kode: "HASIL_EKG",
    nama: "Hasil EKG",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 304,

    opsi: [
      {
        kode: "TIDAK_ADA_KELAINAN",
        label: "Tidak Ada Kelainan",
      },
      {
        kode: "ADA_KELAINAN",
        label: "Ada Kelainan",
      },
    ],

    aturan: [
      {
        kategori: "dewasa",

        frekuensi: "dua_kali_tahun",

        usiaMinBulan: 480,
      },

      {
        kategori: "lansia",
        frekuensi: "dua_kali_tahun",
      },
    ],
  },

  {
    kode: "RISIKO_JANTUNG",
    nama: "Faktor Risiko Jantung",
    kelompok: "skrining",
    tipeInput: "text",
    urutanDefault: 305,

    aturan: [tahunan("dewasa"), tahunan("lansia")],
  },

  {
    kode: "GINJAL_KRONIS",
    nama: "Skrining Ginjal Kronis",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 306,

    opsi: [
      {
        kode: "TIDAK_ADA_KELAINAN",
        label: "Tidak Ada Kelainan",
      },
      {
        kode: "ADA_KELAINAN",
        label: "Ada Kelainan",
      },
    ],

    aturan: [tahunan("dewasa"), tahunan("lansia")],
  },

  // ==========================================================
  // KANKER
  // ==========================================================

  {
    kode: "KANKER_PAYUDARA",
    nama: "Skrining Kanker Payudara",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 310,

    opsi: [
      {
        kode: "RR",
        label: "RR",
      },
      {
        kode: "RT",
        label: "RT",
      },
      {
        kode: "RST",
        label: "RST",
      },
    ],

    aturan: [
      {
        kategori: "dewasa",

        frekuensi: "manual",

        jenisKelamin: "P",
      },

      {
        kategori: "lansia",

        frekuensi: "manual",

        jenisKelamin: "P",
      },
    ],
  },

  {
    kode: "KANKER_SERVIKS",
    nama: "Skrining Kanker Leher Rahim",
    kelompok: "skrining",
    tipeInput: "boolean",
    urutanDefault: 311,

    aturan: [
      {
        kategori: "dewasa",

        frekuensi: "manual",

        jenisKelamin: "P",

        usiaMinBulan: 360,

        usiaMaxBulan: 719,

        aturanJson: {
          intervalTahun: 10,
        },
      },

      {
        kategori: "lansia",

        frekuensi: "manual",

        jenisKelamin: "P",

        usiaMinBulan: 720,

        usiaMaxBulan: 839,

        aturanJson: {
          intervalTahun: 10,
        },
      },
    ],
  },

  {
    kode: "KANKER_PARU",
    nama: "Skrining Kanker Paru",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 312,

    opsi: [
      {
        kode: "RISIKO_RINGAN",
        label: "Risiko Ringan",
      },
      {
        kode: "RISIKO_SEDANG",
        label: "Risiko Sedang",
      },
      {
        kode: "RISIKO_TINGGI",
        label: "Risiko Tinggi",
      },
    ],

    aturan: [
      {
        kategori: "dewasa",

        frekuensi: "tahunan",

        usiaMinBulan: 540,

        usiaMaxBulan: 719,
      },

      {
        kategori: "lansia",

        frekuensi: "tahunan",

        usiaMinBulan: 720,

        usiaMaxBulan: 852,
      },
    ],
  },

  {
    kode: "KANKER_KOLOREKTAL",
    nama: "Skrining Kanker Kolorektal",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 313,

    opsi: [
      {
        kode: "RISIKO_RINGAN",
        label: "Risiko Ringan",
      },
      {
        kode: "RISIKO_SEDANG",
        label: "Risiko Sedang",
      },
      {
        kode: "RISIKO_TINGGI",
        label: "Risiko Tinggi",
      },
    ],

    aturan: [tahunan("dewasa"), tahunan("lansia")],
  },

  // ==========================================================
  // PPOK
  // ==========================================================

  {
    kode: "PPOK_PUMA",
    nama: "Skrining PPOK/PUMA",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 320,

    opsi: [
      {
        kode: "RR",
        label: "RR",
      },
      {
        kode: "RT",
        label: "RT",
      },
    ],

    aturan: [
      {
        kategori: "dewasa",
        frekuensi: "manual",
      },

      {
        kategori: "lansia",
        frekuensi: "manual",
      },
    ],
  },

  // ==========================================================
  // PENGLIHATAN
  // ==========================================================

  {
    kode: "PENGLIHATAN",
    nama: "Skrining Penglihatan",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 321,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "KELAINAN_MATA_LUAR",
        label: "Kelainan Mata Luar",
      },
      {
        kode: "REFRAKSI_0_5",
        label: "Refraksi >0,5",
      },
      {
        kode: "SILINDER_0_25",
        label: "Silinder >0,25",
      },
    ],

    aturan: [tahunan("dewasa"), tahunan("lansia")],
  },

  {
    kode: "BUTA_WARNA",
    nama: "Skrining Buta Warna",
    kelompok: "skrining",
    tipeInput: "boolean",
    urutanDefault: 322,

    aturan: [sekali("dewasa"), sekali("lansia")],
  },

  {
    kode: "KATARAK",
    nama: "Skrining Katarak",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 323,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "POSITIF",
        label: "Positif",
      },
      {
        kode: "PSEUDO_POSITIF",
        label: "Pseudo Positif",
      },
      {
        kode: "NEGATIF",
        label: "Negatif",
      },
    ],

    aturan: [
      {
        kategori: "dewasa",

        frekuensi: "manual",

        usiaMinBulan: 480,
      },

      {
        kategori: "lansia",
        frekuensi: "manual",
      },
    ],
  },

  {
    kode: "PENDENGARAN",
    nama: "Skrining Pendengaran",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 324,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "ADA_KELAINAN",
        label: "Ada Kelainan",
      },
    ],

    aturan: [tahunan("dewasa"), tahunan("lansia")],
  },

  // ==========================================================
  // NAPZA
  // ==========================================================

  {
    kode: "NAPZA",
    nama: "Skrining NAPZA",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 330,

    opsi: [
      {
        kode: "RISIKO_RENDAH",
        label: "Risiko Rendah",
      },
      {
        kode: "RISIKO_SEDANG",
        label: "Risiko Sedang",
      },
      {
        kode: "RISIKO_TINGGI",
        label: "Risiko Tinggi",
      },
    ],

    aturan: [indikasi("dewasa"), indikasi("lansia")],
  },

  {
    kode: "LAYAK_HAMIL",
    nama: "Skrining Layak Hamil",
    kelompok: "skrining",
    tipeInput: "boolean",
    urutanDefault: 331,

    aturan: [
      {
        kategori: "dewasa",

        frekuensi: "tahunan",

        jenisKelamin: "P",
      },
    ],
  },

  {
    kode: "SIFILIS",
    nama: "Skrining Sifilis",
    kelompok: "skrining",
    tipeInput: "text",
    urutanDefault: 332,

    aturan: [indikasi("dewasa"), indikasi("lansia")],
  },

  // ==========================================================
  // KEBUGARAN
  // ==========================================================

  {
    kode: "KEBUGARAN",
    nama: "Skrining Kebugaran",
    kelompok: "skrining",
    tipeInput: "select",
    urutanDefault: 340,

    opsi: [
      {
        kode: "BAIK_SEKALI",
        label: "Baik Sekali",
      },
      {
        kode: "BAIK",
        label: "Baik",
      },
      {
        kode: "CUKUP",
        label: "Cukup",
      },
      {
        kode: "KURANG",
        label: "Kurang",
      },
      {
        kode: "KURANG_SEKALI",
        label: "Kurang Sekali",
      },
    ],

    aturan: [
      {
        kategori: "dewasa",
        frekuensi: "dua_kali_tahun",
      },

      {
        kategori: "lansia",
        frekuensi: "dua_kali_tahun",
      },
    ],
  },

  // ==========================================================
  // LANSIA KHUSUS
  // ==========================================================

  {
    kode: "SKILAS",
    nama: "SKILAS",
    kelompok: "skrining",
    tipeInput: "text",
    urutanDefault: 350,

    aturan: [tahunan("lansia")],
  },

  {
    kode: "AKS_ADL",
    nama: "AKS / ADL",
    kelompok: "skrining",
    tipeInput: "text",
    urutanDefault: 351,

    aturan: [tahunan("lansia")],
  },

  // ==========================================================
  // LAYANAN / KESIMPULAN / RUJUK
  // ==========================================================

  {
    kode: "LAYANAN_MEDIS",
    nama: "Layanan Medis yang Diberikan",
    kelompok: "pemeriksaan",
    tipeInput: "text",
    urutanDefault: 900,

    aturan: [
      setiapSesi("bayi"),
      setiapSesi("balita"),
      setiapSesi("prasekolah"),
      setiapSesi("sekolah"),
      setiapSesi("dewasa"),
      setiapSesi("lansia"),
    ],
  },

  {
    kode: "TINDAK_LANJUT",
    nama: "Tindak Lanjut",
    kelompok: "pemeriksaan",
    tipeInput: "text",
    urutanDefault: 901,

    aturan: [setiapSesi("bayi")],
  },

  {
    kode: "ALASAN_RUJUK",
    nama: "Alasan Dirujuk / KR",
    kelompok: "pemeriksaan",
    tipeInput: "text",
    urutanDefault: 999,

    aturan: [
      setiapSesi("bayi"),
      setiapSesi("balita"),
      setiapSesi("prasekolah"),
      setiapSesi("sekolah"),
      setiapSesi("dewasa"),
      setiapSesi("lansia"),
      setiapSesi("ibu_hamil"),
      setiapSesi("ibu_nifas"),
    ],
  },

  // ==========================================================
  // KESIMPULAN
  // ==========================================================

  {
    kode: "KESIMPULAN_ANAK",
    nama: "Kesimpulan Pemeriksaan Anak",
    kelompok: "pemeriksaan",
    tipeInput: "select",
    urutanDefault: 910,

    opsi: [
      {
        kode: "NORMAL",
        label: "Normal",
      },
      {
        kode: "RUJUK_PUSTU",
        label: "Rujuk Pustu",
      },
      {
        kode: "RUJUK_PKM",
        label: "Rujuk PKM",
      },
      {
        kode: "KUNJUNGAN_RUMAH",
        label: "Kunjungan Rumah",
      },
    ],

    aturan: [
      setiapSesi("bayi"),
      setiapSesi("balita"),
      setiapSesi("prasekolah"),
    ],
  },

  {
    kode: "KESIMPULAN_UMUM",
    nama: "Kesimpulan Pemeriksaan",
    kelompok: "pemeriksaan",
    tipeInput: "text",
    urutanDefault: 911,

    aturan: [
      setiapSesi("sekolah"),
      setiapSesi("dewasa"),
      setiapSesi("lansia"),
      setiapSesi("ibu_hamil"),
      setiapSesi("ibu_nifas"),
    ],
  },

  // ==========================================================
  // KONSELING BAYI
  // ==========================================================

  {
    kode: "KONSELING_BAYI",
    nama: "Jenis Konseling Bayi",
    kelompok: "konseling",
    tipeInput: "multiselect",
    urutanDefault: 950,

    opsi: [
      {
        kode: "PERAWATAN_BBL",
        label: "Perawatan BBL",
      },
      {
        kode: "PERAWATAN_BBLR",
        label: "Perawatan BBLR",
      },
      {
        kode: "PERAWATAN_BAYI_PREMATUR",
        label: "Perawatan Bayi Prematur",
      },
      {
        kode: "MENYUSUI",
        label: "Menyusui",
      },
      {
        kode: "TANDA_BAHAYA_BBL",
        label: "Tanda Bahaya BBL",
      },
      {
        kode: "IMUNISASI",
        label: "Imunisasi",
      },
      {
        kode: "MPASI",
        label: "MPASI",
      },
      {
        kode: "SDIDTK",
        label: "SDIDTK",
      },
    ],

    aturan: [setiapSesi("bayi")],
  },

  // ==========================================================
  // KONSELING BALITA
  // ==========================================================

  {
    kode: "KONSELING_BALITA",
    nama: "Jenis Konseling Balita",
    kelompok: "konseling",
    tipeInput: "multiselect",
    urutanDefault: 951,

    opsi: [
      {
        kode: "SDIDTK",
        label: "SDIDTK",
      },
      {
        kode: "GIZI",
        label: "Gizi",
      },
      {
        kode: "EDUKASI_GILUT",
        label: "Edukasi Gilut",
      },
    ],

    aturan: [setiapSesi("balita")],
  },

  // ==========================================================
  // KONSELING PRASEKOLAH
  // ==========================================================

  {
    kode: "KONSELING_PRASEKOLAH",
    nama: "Jenis Konseling Prasekolah",
    kelompok: "konseling",
    tipeInput: "multiselect",
    urutanDefault: 952,

    opsi: [
      {
        kode: "SDIDTK",
        label: "SDIDTK",
      },
      {
        kode: "GIZI",
        label: "Gizi",
      },
      {
        kode: "PHBS",
        label: "PHBS",
      },
      {
        kode: "EDUKASI_SEKSUAL",
        label: "Edukasi Seksual",
      },
    ],

    aturan: [setiapSesi("prasekolah")],
  },

  // ==========================================================
  // KONSELING DEWASA/LANSIA
  // ==========================================================

  {
    kode: "KONSELING_DEWASA",
    nama: "Jenis Konseling Dewasa/Lansia",
    kelompok: "konseling",
    tipeInput: "multiselect",
    urutanDefault: 953,

    opsi: [
      {
        kode: "12_TIPS_HIDUP_SEHAT",
        label: "12 Tips Hidup Sehat",
      },
      {
        kode: "UBM",
        label: "UBM",
      },
      {
        kode: "MENCEGAH_DIABETES",
        label: "Mencegah Diabetes",
      },
      {
        kode: "PERSIAPAN_BERHENTI_MEROKOK",
        label: "Persiapan Berhenti Merokok",
      },
      {
        kode: "TIPS_HIDUP_SEHAT_DM",
        label: "Tips Hidup Sehat Penyandang Diabetes",
      },
      {
        kode: "KENDALIKAN_HIPERTENSI",
        label: "Kendalikan Hipertensi",
      },
      {
        kode: "GIZI_SEIMBANG",
        label: "Gizi Seimbang",
      },
      {
        kode: "KEPATUHAN_MINUM_OBAT",
        label: "Kepatuhan Minum Obat",
      },
    ],

    aturan: [setiapSesi("dewasa"), setiapSesi("lansia")],
  },

  // ==========================================================
  // KONSELING HAMIL/NIFAS
  // ==========================================================

  {
    kode: "KONSELING_REPRODUKSI",
    nama: "Jenis Konseling Ibu Hamil/Nifas",
    kelompok: "konseling",
    tipeInput: "multiselect",
    urutanDefault: 954,

    opsi: [
      {
        kode: "GIZI",
        label: "Gizi",
      },
      {
        kode: "MENYUSUI",
        label: "Menyusui",
      },
      {
        kode: "TANDA_BAHAYA_NIFAS",
        label: "Tanda Bahaya Nifas",
      },
      {
        kode: "KB",
        label: "KB",
      },
      {
        kode: "KUNJUNGAN_ULANG",
        label: "Kunjungan Ulang",
      },
    ],

    aturan: [setiapSesi("ibu_hamil"), setiapSesi("ibu_nifas")],
  },
];

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("\n========================================");

  console.log("SEED MASTER INDIKATOR POSGA");

  console.log("========================================");

  console.log(`Jumlah definisi indikator: ${DATA.length}`);

  for (let index = 0; index < DATA.length; index++) {
    const item = DATA[index]!;

    console.log(`\n[${index + 1}/${DATA.length}] ${item.kode}`);

    const master = await pastikanIndikator(item);

    if (item.opsi && item.opsi.length > 0) {
      await pastikanOpsi(master.id, item.opsi);
    }

    await pastikanAturan(master.id, item.aturan);
  }

  console.log("\n========================================");

  console.log("SEED MASTER POSGA SELESAI");

  console.log("========================================");
}

main().catch((error) => {
  console.error("\n========================================");

  console.error("SEED MASTER POSGA GAGAL");

  console.error("========================================");

  console.error(error);

  process.exitCode = 1;
});

