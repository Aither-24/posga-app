import { eq } from "drizzle-orm";

import { db } from "../db/index.js";

import { peserta, pesertaSesiPosga, sesiPosga } from "../db/schema.js";

import { hitungUmurLengkap } from "./kategori.js";

import {
  ambilPaketIndikatorDasar,
  type KategoriIndikator,
} from "./indikator.service.js";

import { ambilSkriningTerakhir } from "./skrining.service.js";

// ============================================================
// TYPE
// ============================================================

export type StatusKelayakanIndikator =
  | "tampil"
  | "tidak_berlaku"
  | "belum_jatuh_tempo"
  | "sudah_selesai"
  | "sesuai_indikasi";

export type FrekuensiRule =
  | "setiap_sesi"
  | "tahunan"
  | "dua_kali_tahun"
  | "sekali_seumur_hidup"
  | "usia_tertentu"
  | "sesuai_indikasi"
  | "manual";

export interface RiwayatTerakhirRule {
  id: number;

  tanggalSkrining: string;

  sumber: "posga" | "eksternal";

  namaFasilitas: string | null;

  sesiPosgaId: number | null;
}

export interface HasilRuleIndikator {
  aturanId: number;

  indikatorId: number;

  kode: string;

  nama: string;

  kelompok: "pemeriksaan" | "skrining" | "konseling";

  tipeInput: "number" | "text" | "boolean" | "date" | "select" | "multiselect";

  satuan: string | null;

  derived: boolean;

  frekuensi: FrekuensiRule;

  wajib: boolean;

  berdasarkanIndikasi: boolean;

  statusKelayakan: StatusKelayakanIndikator;

  alasan: string;

  riwayatTerakhir: RiwayatTerakhirRule | null;

  opsi: Array<{
    id: number;

    indikatorId: number;

    kode: string;

    label: string;

    nilaiNumerik: number | null;

    urutan: number;

    aktif: boolean;
  }>;
}

export interface FormPesertaSesi {
  pesertaSesiId: number;

  pesertaNik: string;

  nama: string;

  tanggalLahir: string;

  jenisKelamin: "L" | "P";

  tanggalPosga: string;

  kategori: KategoriIndikator;

  umur: {
    tahun: number;

    bulan: number;

    hari: number;

    totalBulan: number;
  };

  pemeriksaan: HasilRuleIndikator[];

  skrining: HasilRuleIndikator[];

  konseling: HasilRuleIndikator[];
}

// ============================================================
// INTERNAL TYPE
// ============================================================

interface AturanJsonParsed {
  usiaBulan?: number[];

  usiaTahun?: number[];

  intervalBulan?: number;

  windowMulaiBulan?: number;

  gunakanPeriodeKalender?: boolean;

  periode?: "semester" | "tahun";
}

// ============================================================
// CONTEXT PESERTA SESI
// ============================================================

export async function ambilContextPesertaSesi(pesertaSesiId: number) {
  const hasil = await db
    .select({
      pesertaSesiId: pesertaSesiPosga.id,

      pesertaNik: peserta.nik,

      nama: peserta.nama,

      tanggalLahir: peserta.tanggalLahir,

      jenisKelamin: peserta.jenisKelamin,

      kategori: pesertaSesiPosga.kategoriSaatItu,

      statusPemeriksaan: pesertaSesiPosga.statusPemeriksaan,

      sesiStatus: sesiPosga.status,

      tanggalPosga: sesiPosga.tanggalPosga,

      sesiPosgaId: sesiPosga.id,
    })
    .from(pesertaSesiPosga)
    .innerJoin(peserta, eq(peserta.nik, pesertaSesiPosga.pesertaNik))
    .innerJoin(sesiPosga, eq(sesiPosga.id, pesertaSesiPosga.sesiPosgaId))
    .where(eq(pesertaSesiPosga.id, pesertaSesiId))
    .limit(1);

  return hasil[0] ?? null;
}

// ============================================================
// PARSE YYYY-MM-DD
// ============================================================

function parseTanggal(nilai: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai)) {
    throw new Error(`Format tanggal tidak valid: ${nilai}`);
  }

  const bagian = nilai.split("-");

  const tahun = Number(bagian[0]);

  const bulan = Number(bagian[1]);

  const hari = Number(bagian[2]);

  const date = new Date(Date.UTC(tahun, bulan - 1, hari));

  if (
    date.getUTCFullYear() !== tahun ||
    date.getUTCMonth() + 1 !== bulan ||
    date.getUTCDate() !== hari
  ) {
    throw new Error(`Tanggal tidak valid: ${nilai}`);
  }

  return {
    tahun,
    bulan,
    hari,
    date,
  };
}

// ============================================================
// SELISIH BULAN KALENDER
//
// Sengaja tidak memakai selisih hari / 30.
//
// Contoh:
// Januari -> Oktober = 9 bulan kalender.
//
// Ini sesuai keputusan bahwa jadwal tidak boleh terlalu kaku
// terhadap jumlah hari.
// ============================================================

export function hitungSelisihBulanKalender(
  tanggalAwal: string,
  tanggalAkhir: string,
) {
  const awal = parseTanggal(tanggalAwal);

  const akhir = parseTanggal(tanggalAkhir);

  const hasil = (akhir.tahun - awal.tahun) * 12 + (akhir.bulan - awal.bulan);

  return hasil;
}

// ============================================================
// SEMESTER
// ============================================================

function semesterDariBulan(bulan: number) {
  return bulan <= 6 ? 1 : 2;
}

function sudahBergantiTahun(tanggalAwal: string, tanggalSekarang: string) {
  const awal = parseTanggal(tanggalAwal);

  const sekarang = parseTanggal(tanggalSekarang);

  return sekarang.tahun > awal.tahun;
}

function sudahBergantiSemester(tanggalAwal: string, tanggalSekarang: string) {
  const awal = parseTanggal(tanggalAwal);

  const sekarang = parseTanggal(tanggalSekarang);

  if (sekarang.tahun > awal.tahun) {
    return true;
  }

  if (sekarang.tahun < awal.tahun) {
    return false;
  }

  return semesterDariBulan(sekarang.bulan) !== semesterDariBulan(awal.bulan);
}

// ============================================================
// PARSE ATURAN JSON
// ============================================================

function parseAturanJson(aturanJson: string | null): AturanJsonParsed {
  if (!aturanJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(aturanJson) as unknown;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed as AturanJsonParsed;
  } catch {
    return {};
  }
}

// ============================================================
// RULE USIA TERTENTU
// ============================================================

function berlakuUntukUsiaTertentu(
  aturanJson: string | null,

  umurTahun: number,

  totalBulan: number,
) {
  const aturan = parseAturanJson(aturanJson);

  if (Array.isArray(aturan.usiaBulan)) {
    return aturan.usiaBulan.includes(totalBulan);
  }

  if (Array.isArray(aturan.usiaTahun)) {
    return aturan.usiaTahun.includes(umurTahun);
  }

  return true;
}

// ============================================================
// KONVERSI RIWAYAT
// ============================================================

function buatRiwayatTerakhir(
  item: Awaited<ReturnType<typeof ambilSkriningTerakhir>>,
): RiwayatTerakhirRule | null {
  if (!item) {
    return null;
  }

  return {
    id: item.id,

    tanggalSkrining: item.tanggalSkrining,

    sumber: item.sumber,

    namaFasilitas: item.namaFasilitas,

    sesiPosgaId: item.sesiPosgaId,
  };
}

// ============================================================
// HASIL DASAR
// ============================================================

type PaketIndikatorItem = Awaited<
  ReturnType<typeof ambilPaketIndikatorDasar>
>[number];

function buatHasilDasar(
  item: PaketIndikatorItem,

  status: StatusKelayakanIndikator,

  alasan: string,

  riwayatTerakhir: RiwayatTerakhirRule | null = null,
): HasilRuleIndikator {
  return {
    aturanId: item.aturanId,

    indikatorId: item.indikatorId,

    kode: item.kode,

    nama: item.nama,

    kelompok: item.kelompok,

    tipeInput: item.tipeInput,

    satuan: item.satuan,

    derived: item.derived,

    frekuensi: item.frekuensi,

    wajib: item.wajib,

    berdasarkanIndikasi: item.berdasarkanIndikasi,

    statusKelayakan: status,

    alasan,

    riwayatTerakhir,

    opsi: item.opsi,
  };
}

// ============================================================
// EVALUASI RULE TANPA RIWAYAT
// ============================================================

function evaluasiRuleDasar(
  item: PaketIndikatorItem,

  umurTahun: number,

  totalBulan: number,
): HasilRuleIndikator {
  if (item.frekuensi === "sesuai_indikasi") {
    return buatHasilDasar(
      item,
      "sesuai_indikasi",
      "Dilakukan jika terdapat indikasi.",
    );
  }

  if (item.frekuensi === "usia_tertentu") {
    const berlaku = berlakuUntukUsiaTertentu(
      item.aturanJson,
      umurTahun,
      totalBulan,
    );

    return buatHasilDasar(
      item,

      berlaku ? "tampil" : "belum_jatuh_tempo",

      berlaku
        ? "Usia peserta sesuai dengan jadwal indikator."
        : "Usia peserta belum sesuai dengan jadwal indikator.",
    );
  }

  if (item.frekuensi === "manual") {
    return buatHasilDasar(item, "tampil", "Indikator tersedia secara manual.");
  }

  return buatHasilDasar(item, "tampil", "Indikator berlaku pada peserta.");
}

// ============================================================
// EVALUASI TAHUNAN
//
// Default:
// interval ideal = 12 bulan
// window mulai = 9 bulan
//
// 1. Belum pernah -> tampil
// 2. >= interval ideal -> tampil
// 3. >= window mulai DAN sudah berganti tahun -> tampil
// 4. selain itu -> belum jatuh tempo
//
// aturanJson dapat override:
// {
//   intervalBulan: 12,
//   windowMulaiBulan: 9,
//   gunakanPeriodeKalender: true
// }
// ============================================================

function evaluasiTahunan(
  item: PaketIndikatorItem,

  tanggalSekarang: string,

  riwayat: RiwayatTerakhirRule | null,
) {
  if (!riwayat) {
    return buatHasilDasar(
      item,
      "tampil",
      "Belum pernah dilakukan. Skrining dapat dilakukan sekarang.",
      null,
    );
  }

  const konfigurasi = parseAturanJson(item.aturanJson);

  const intervalBulan =
    typeof konfigurasi.intervalBulan === "number" &&
    konfigurasi.intervalBulan > 0
      ? konfigurasi.intervalBulan
      : 12;

  const windowMulaiBulan =
    typeof konfigurasi.windowMulaiBulan === "number" &&
    konfigurasi.windowMulaiBulan >= 0
      ? konfigurasi.windowMulaiBulan
      : 9;

  const gunakanPeriodeKalender = konfigurasi.gunakanPeriodeKalender ?? true;

  const selisihBulan = hitungSelisihBulanKalender(
    riwayat.tanggalSkrining,
    tanggalSekarang,
  );

  if (selisihBulan < 0) {
    return buatHasilDasar(
      item,
      "belum_jatuh_tempo",
      "Riwayat skrining terakhir berada setelah tanggal sesi.",
      riwayat,
    );
  }

  if (selisihBulan >= intervalBulan) {
    return buatHasilDasar(
      item,
      "tampil",
      `Sudah mencapai interval sekitar ${intervalBulan} bulan sejak skrining terakhir.`,
      riwayat,
    );
  }

  if (selisihBulan >= windowMulaiBulan) {
    if (
      !gunakanPeriodeKalender ||
      sudahBergantiTahun(riwayat.tanggalSkrining, tanggalSekarang)
    ) {
      return buatHasilDasar(
        item,
        "tampil",
        `Sudah memasuki window skrining tahunan (${selisihBulan} bulan sejak pemeriksaan terakhir).`,
        riwayat,
      );
    }
  }

  return buatHasilDasar(
    item,
    "belum_jatuh_tempo",
    `Belum memasuki window skrining tahunan. Terakhir dilakukan ${riwayat.tanggalSkrining}.`,
    riwayat,
  );
}

// ============================================================
// EVALUASI 2X / TAHUN
//
// Default:
// interval ideal = 6 bulan
// window mulai = 4 bulan
//
// 1. Belum pernah -> tampil
// 2. >= 6 bulan -> tampil
// 3. >= 4 bulan DAN sudah berganti semester -> tampil
// 4. selain itu -> belum jatuh tempo
//
// aturanJson dapat override:
// {
//   intervalBulan: 6,
//   windowMulaiBulan: 4,
//   gunakanPeriodeKalender: true,
//   periode: "semester"
// }
// ============================================================

function evaluasiDuaKaliTahun(
  item: PaketIndikatorItem,

  tanggalSekarang: string,

  riwayat: RiwayatTerakhirRule | null,
) {
  if (!riwayat) {
    return buatHasilDasar(
      item,
      "tampil",
      "Belum pernah dilakukan. Skrining dapat dilakukan sekarang.",
      null,
    );
  }

  const konfigurasi = parseAturanJson(item.aturanJson);

  const intervalBulan =
    typeof konfigurasi.intervalBulan === "number" &&
    konfigurasi.intervalBulan > 0
      ? konfigurasi.intervalBulan
      : 6;

  const windowMulaiBulan =
    typeof konfigurasi.windowMulaiBulan === "number" &&
    konfigurasi.windowMulaiBulan >= 0
      ? konfigurasi.windowMulaiBulan
      : 4;

  const gunakanPeriodeKalender = konfigurasi.gunakanPeriodeKalender ?? true;

  const selisihBulan = hitungSelisihBulanKalender(
    riwayat.tanggalSkrining,
    tanggalSekarang,
  );

  if (selisihBulan < 0) {
    return buatHasilDasar(
      item,
      "belum_jatuh_tempo",
      "Riwayat skrining terakhir berada setelah tanggal sesi.",
      riwayat,
    );
  }

  if (selisihBulan >= intervalBulan) {
    return buatHasilDasar(
      item,
      "tampil",
      `Sudah mencapai interval sekitar ${intervalBulan} bulan sejak skrining terakhir.`,
      riwayat,
    );
  }

  if (selisihBulan >= windowMulaiBulan) {
    if (
      !gunakanPeriodeKalender ||
      sudahBergantiSemester(riwayat.tanggalSkrining, tanggalSekarang)
    ) {
      return buatHasilDasar(
        item,
        "tampil",
        `Sudah memasuki window pemeriksaan berikutnya (${selisihBulan} bulan sejak pemeriksaan terakhir).`,
        riwayat,
      );
    }
  }

  return buatHasilDasar(
    item,
    "belum_jatuh_tempo",
    `Belum memasuki window pemeriksaan berikutnya. Terakhir dilakukan ${riwayat.tanggalSkrining}.`,
    riwayat,
  );
}

// ============================================================
// SEKALI SEUMUR HIDUP
// ============================================================

function evaluasiSekaliSeumurHidup(
  item: PaketIndikatorItem,

  riwayat: RiwayatTerakhirRule | null,
) {
  if (!riwayat) {
    return buatHasilDasar(item, "tampil", "Belum pernah dilakukan.", null);
  }

  return buatHasilDasar(
    item,
    "sudah_selesai",
    `Skrining ini sudah pernah dilakukan pada ${riwayat.tanggalSkrining}.`,
    riwayat,
  );
}

// ============================================================
// EVALUASI SKRINING DENGAN RIWAYAT
// ============================================================

async function evaluasiSkrining(
  item: PaketIndikatorItem,

  pesertaNik: string,

  tanggalPosga: string,

  umurTahun: number,

  totalBulan: number,
): Promise<HasilRuleIndikator> {
  // ----------------------------------------------------------
  // USIA TERTENTU TIDAK MEMBUTUHKAN RIWAYAT UNTUK V2
  // ----------------------------------------------------------

  if (item.frekuensi === "usia_tertentu") {
    return evaluasiRuleDasar(item, umurTahun, totalBulan);
  }

  // ----------------------------------------------------------
  // MANUAL
  // ----------------------------------------------------------

  if (item.frekuensi === "manual") {
    return buatHasilDasar(item, "tampil", "Skrining tersedia secara manual.");
  }

  // ----------------------------------------------------------
  // SESUAI INDIKASI
  // ----------------------------------------------------------

  if (item.frekuensi === "sesuai_indikasi") {
    return buatHasilDasar(
      item,
      "sesuai_indikasi",
      "Skrining dilakukan jika terdapat indikasi.",
    );
  }

  // ----------------------------------------------------------
  // SETIAP SESI
  // ----------------------------------------------------------

  if (item.frekuensi === "setiap_sesi") {
    return buatHasilDasar(item, "tampil", "Skrining berlaku pada setiap sesi.");
  }

  // ----------------------------------------------------------
  // AMBIL RIWAYAT TERAKHIR SAMPAI TANGGAL SESI
  // ----------------------------------------------------------

  const terakhir = await ambilSkriningTerakhir(
    pesertaNik,
    item.indikatorId,
    tanggalPosga,
  );

  const riwayat = buatRiwayatTerakhir(terakhir);

  // ----------------------------------------------------------
  // TAHUNAN
  // ----------------------------------------------------------

  if (item.frekuensi === "tahunan") {
    return evaluasiTahunan(item, tanggalPosga, riwayat);
  }

  // ----------------------------------------------------------
  // 2X SETAHUN
  // ----------------------------------------------------------

  if (item.frekuensi === "dua_kali_tahun") {
    return evaluasiDuaKaliTahun(item, tanggalPosga, riwayat);
  }

  // ----------------------------------------------------------
  // SEKALI SEUMUR HIDUP
  // ----------------------------------------------------------

  if (item.frekuensi === "sekali_seumur_hidup") {
    return evaluasiSekaliSeumurHidup(item, riwayat);
  }

  return buatHasilDasar(item, "tampil", "Indikator berlaku.");
}

// ============================================================
// EVALUASI SATU ITEM
// ============================================================

async function evaluasiIndikator(
  item: PaketIndikatorItem,

  pesertaNik: string,

  tanggalPosga: string,

  umurTahun: number,

  totalBulan: number,
): Promise<HasilRuleIndikator> {
  if (item.kelompok === "skrining") {
    return evaluasiSkrining(
      item,
      pesertaNik,
      tanggalPosga,
      umurTahun,
      totalBulan,
    );
  }

  return evaluasiRuleDasar(item, umurTahun, totalBulan);
}

// ============================================================
// GENERATE FORM PESERTA SESI
// ============================================================

export async function generateFormPesertaSesi(
  pesertaSesiId: number,
): Promise<FormPesertaSesi> {
  const context = await ambilContextPesertaSesi(pesertaSesiId);

  if (!context) {
    throw new Error("Peserta sesi tidak ditemukan.");
  }

  if (context.sesiStatus === "dibatalkan") {
    throw new Error("Form tidak dapat dibuat karena sesi sudah dibatalkan.");
  }

  const umur = hitungUmurLengkap(
    new Date(`${context.tanggalLahir}T00:00:00Z`),
    new Date(`${context.tanggalPosga}T00:00:00Z`),
  );

  const paket = await ambilPaketIndikatorDasar(
    context.kategori,
    umur.totalBulan,
    context.jenisKelamin,
  );

  const hasil: HasilRuleIndikator[] = [];

  // Sengaja sequential.
  // Lebih mudah dilacak dan jumlah indikator per peserta
  // masih relatif kecil.
  for (const item of paket) {
    hasil.push(
      await evaluasiIndikator(
        item,
        context.pesertaNik,
        context.tanggalPosga,
        umur.tahun,
        umur.totalBulan,
      ),
    );
  }

  const relevan = hasil.filter(
    (item) => item.statusKelayakan !== "tidak_berlaku",
  );

  return {
    pesertaSesiId: context.pesertaSesiId,

    pesertaNik: context.pesertaNik,

    nama: context.nama,

    tanggalLahir: context.tanggalLahir,

    jenisKelamin: context.jenisKelamin,

    tanggalPosga: context.tanggalPosga,

    kategori: context.kategori,

    umur: {
      tahun: umur.tahun,

      bulan: umur.bulan,

      hari: umur.hari,

      totalBulan: umur.totalBulan,
    },

    pemeriksaan: relevan.filter((item) => item.kelompok === "pemeriksaan"),

    skrining: relevan.filter((item) => item.kelompok === "skrining"),

    konseling: relevan.filter((item) => item.kelompok === "konseling"),
  };
}
