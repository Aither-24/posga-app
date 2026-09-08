import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { calculateAll } from "@pedi-growth/core";

import { db } from "../db/index.js";

import {
  hitungImt,
  hitungMap,
  klasifikasiAnemia,
  klasifikasiGds,
  klasifikasiKunjunganNifas,
  klasifikasiLingkarPerutAsia,
  klasifikasiObesitasAsiaPasifik,
  klasifikasiTekananDarahDewasa,
  zScoreMasukRentangWho,
} from "./clinical-derived-calculator.js";

import {
  episodeKehamilan,
  episodeNifas,
  hasilPemeriksaan,
  indikator,
  opsiIndikator,
  peserta,
  pesertaSesiPosga,
  sesiPosga,
} from "../db/schema.js";

// ============================================================
// DERIVED ANTROPOMETRI POSGA
//
// Prinsip:
// - perhitungan dilakukan SEBELUM transaksi database;
// - hasil perhitungan hanya berupa "rencana";
// - sumber + seluruh derived tetap ditulis di transaksi yang sama;
// - tidak ada Promise di dalam better-sqlite3 transaction.
//
// Sumber z-score:
// @pedi-growth/core -> WHO Anthro / WHO AnthroPlus.
// ============================================================

const KODE_BB = "BB";
const KODE_PB = "PB";
const KODE_TB = "TB";
const KODE_LIKA = "LIKA";
const KODE_LILA = "LILA";
const KODE_LIPE = "LIPE";
const KODE_TD_SISTOLIK = "TD_SISTOLIK";
const KODE_TD_DIASTOLIK = "TD_DIASTOLIK";
const KODE_GDA = "GDA";
const KODE_HB = "HB";

const KODE_IMT = "IMT";
const KODE_BB_U = "BB_U";
const KODE_STATUS_BB_U = "STATUS_BB_U";
const KODE_TB_U = "TB_U";
const KODE_STATUS_TB_U = "STATUS_TB_U";
const KODE_BB_TB = "BB_TB";
const KODE_STATUS_BB_TB = "STATUS_BB_TB";
const KODE_STATUS_LILA = "STATUS_LILA";
const KODE_STATUS_LIKA = "STATUS_LIKA";
const KODE_STATUS_IMT_BALITA = "STATUS_IMT_BALITA";
const KODE_IMT_U = "IMT_U";
const KODE_STATUS_IMT_U = "STATUS_IMT_U";
const KODE_STATUS_OBESITAS = "STATUS_OBESITAS";
const KODE_STATUS_DM = "STATUS_DM";
const KODE_STATUS_HIPERTENSI = "STATUS_HIPERTENSI";
const KODE_STATUS_ANEMIA = "STATUS_ANEMIA";
const KODE_STATUS_LIPE = "STATUS_LIPE";
const KODE_MAP = "MAP";
const KODE_STATUS_HT_NIFAS = "STATUS_HT_NIFAS";
const KODE_JENIS_KUNJUNGAN_NIFAS = "JENIS_KUNJUNGAN_NIFAS";

const KODE_SUMBER = [
  KODE_BB,
  KODE_PB,
  KODE_TB,
  KODE_LIKA,
  KODE_LILA,
  KODE_LIPE,
  KODE_TD_SISTOLIK,
  KODE_TD_DIASTOLIK,
  KODE_GDA,
  KODE_HB,
] as const;

const KODE_DERIVED = [
  KODE_IMT,
  KODE_BB_U,
  KODE_STATUS_BB_U,
  KODE_TB_U,
  KODE_STATUS_TB_U,
  KODE_BB_TB,
  KODE_STATUS_BB_TB,
  KODE_STATUS_LILA,
  KODE_STATUS_LIKA,
  KODE_STATUS_IMT_BALITA,
  KODE_IMT_U,
  KODE_STATUS_IMT_U,
  KODE_STATUS_OBESITAS,
  KODE_STATUS_DM,
  KODE_STATUS_HIPERTENSI,
  KODE_STATUS_ANEMIA,
  KODE_STATUS_LIPE,
  KODE_MAP,
  KODE_STATUS_HT_NIFAS,
  KODE_JENIS_KUNJUNGAN_NIFAS,
] as const;

type DerivedExecutor =
  Pick<
    typeof db,
    "select" | "insert" | "update" | "delete"
  >;

type NilaiSumber = {
  bb: number | null;
  pb: number | null;
  tb: number | null;
  lika: number | null;
  lila: number | null;
  lipe: number | null;
  tdSistolik: number | null;
  tdDiastolik: number | null;
  gda: number | null;
  hb: number | null;
};

export type OverrideDerived = {
  indikatorId: number;
  nilaiNumber?: number | null;
  hapus?: boolean;
};

type RencanaDerived =
  | {
      jenis: "number";
      indikatorId: number;
      nilai: number;
      catatan: string;
    }
  | {
      jenis: "select";
      indikatorId: number;
      opsiId: number;
      catatan: string;
    }
  | {
      jenis: "hapus";
      indikatorId: number;
    };

export interface RencanaDerivedIndicators {
  pesertaSesiPosgaId: number;
  items: RencanaDerived[];
}

// ============================================================
// HELPER
// ============================================================

function bulatkan(nilai: number, desimal = 2) {
  const faktor = 10 ** desimal;
  return Math.round((nilai + Number.EPSILON) * faktor) / faktor;
}

function tanggalUtc(value: string) {
  const [tahun, bulan, hari] = value.split("-").map(Number);

  if (!tahun || !bulan || !hari) {
    throw new Error(`Tanggal tidak valid: ${value}`);
  }

  return new Date(Date.UTC(tahun, bulan - 1, hari));
}

function selisihHari(tanggalLahir: string, tanggalPemeriksaan: string) {
  const lahir = tanggalUtc(tanggalLahir);
  const periksa = tanggalUtc(tanggalPemeriksaan);
  const ms = periksa.getTime() - lahir.getTime();

  return Math.floor(ms / 86_400_000);
}

function bulanUmurApprox(hari: number) {
  return hari / 30.4375;
}

function nomorValid(nilai: unknown): number | null {
  if (
    typeof nilai !== "number" ||
    !Number.isFinite(nilai) ||
    nilai <= 0
  ) {
    return null;
  }

  return nilai;
}

function normalisasiIndicatorName(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function ambilZScoreDariAssessment(
  assessment: unknown,
  indikatorTarget: string,
): number | null {
  const target = normalisasiIndicatorName(indikatorTarget);
  const visited = new Set<object>();

  function walk(value: unknown): number | null {
    if (!value || typeof value !== "object") return null;

    if (visited.has(value as object)) return null;
    visited.add(value as object);

    const obj = value as Record<string, unknown>;
    const indicator = normalisasiIndicatorName(
      obj.indicator ??
      obj.indikator ??
      obj.name ??
      obj.key,
    );

    const zRaw =
      obj.zScore ??
      obj.zscore ??
      obj.z ??
      obj.z_score;

    if (
      indicator === target &&
      typeof zRaw === "number" &&
      Number.isFinite(zRaw)
    ) {
      return zRaw;
    }

    for (const child of Object.values(obj)) {
      if (Array.isArray(child)) {
        for (const item of child) {
          const found = walk(item);
          if (found !== null) return found;
        }
      } else if (child && typeof child === "object") {
        const found = walk(child);
        if (found !== null) return found;
      }
    }

    return null;
  }

  return walk(assessment);
}

function statusBbU(z: number) {
  if (z < -3) return "SANGAT_KURANG";
  if (z < -2) return "KURANG";
  if (z <= 1) return "NORMAL";
  return "BADAN_LEBIH";
}

function statusTbU(z: number) {
  if (z < -3) return "SANGAT_PENDEK";
  if (z < -2) return "PENDEK";
  if (z <= 3) return "NORMAL";
  return "TINGGI";
}

function statusBbTb(z: number) {
  if (z < -3) return "BURUK";
  if (z < -2) return "KURANG";
  if (z <= 1) return "BAIK";
  if (z <= 2) return "RISIKO_GIZI_LEBIH";
  if (z <= 3) return "GIZI_LEBIH";
  return "OBESITAS";
}

function statusImt(z: number) {
  if (z < -3) return "BURUK";
  if (z < -2) return "KURANG";
  if (z <= 1) return "BAIK";
  if (z <= 2) return "LEBIH";
  return "OBESITAS";
}

function statusLika(z: number) {
  if (z < -2) return "MIKROSEFAL";
  if (z > 2) return "MAKROSEFAL";
  return "NORMAL";
}

function statusLila(
  nilaiCm: number,
  umurHari: number,
): "NORMAL" | "KURANG" | "BURUK" | null {
  // WHO/UNICEF MUAC community classification diterapkan
  // pada anak 6–59 bulan.
  const bulan = bulanUmurApprox(umurHari);

  if (bulan < 6 || bulan >= 60) {
    return null;
  }

  if (nilaiCm < 11.5) return "BURUK";
  if (nilaiCm < 12.5) return "KURANG";
  return "NORMAL";
}

// ============================================================
// MASTER / CONTEXT
// ============================================================

async function ambilMasterSemua() {
  return db
    .select({
      id: indikator.id,
      kode: indikator.kode,
      tipeInput: indikator.tipeInput,
      derived: indikator.derived,
      aktif: indikator.aktif,
    })
    .from(indikator)
    .where(
      inArray(
        indikator.kode,
        [...KODE_SUMBER, ...KODE_DERIVED],
      ),
    );
}

async function ambilContextPesertaSesi(pesertaSesiPosgaId: number) {
  const rows = await db
    .select({
      pesertaNik: pesertaSesiPosga.pesertaNik,
      kategori: pesertaSesiPosga.kategoriSaatItu,
      tanggalLahir: peserta.tanggalLahir,
      jenisKelamin: peserta.jenisKelamin,
      tanggalPosga: sesiPosga.tanggalPosga,
    })
    .from(pesertaSesiPosga)
    .innerJoin(
      peserta,
      eq(peserta.nik, pesertaSesiPosga.pesertaNik),
    )
    .innerJoin(
      sesiPosga,
      eq(sesiPosga.id, pesertaSesiPosga.sesiPosgaId),
    )
    .where(eq(pesertaSesiPosga.id, pesertaSesiPosgaId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw new Error("Peserta sesi POSGA tidak ditemukan untuk kalkulasi antropometri.");
  }

  return row;
}

async function ambilNilaiSumber(
  pesertaSesiPosgaId: number,
  masterMap: Map<string, number>,
): Promise<NilaiSumber> {
  const ids = KODE_SUMBER
    .map((kode) => masterMap.get(kode))
    .filter((id): id is number => typeof id === "number");

  if (ids.length === 0) {
    return {
      bb: null,
      pb: null,
      tb: null,
      lika: null,
      lila: null,
      lipe: null,
      tdSistolik: null,
      tdDiastolik: null,
      gda: null,
      hb: null,
    };
  }

  const rows = await db
    .select({
      indikatorId: hasilPemeriksaan.indikatorId,
      nilaiNumber: hasilPemeriksaan.nilaiNumber,
    })
    .from(hasilPemeriksaan)
    .where(
      and(
        eq(
          hasilPemeriksaan.pesertaSesiPosgaId,
          pesertaSesiPosgaId,
        ),
        inArray(hasilPemeriksaan.indikatorId, ids),
      ),
    );

  function value(kode: string) {
    const id = masterMap.get(kode);
    if (!id) return null;

    return nomorValid(
      rows.find((x) => x.indikatorId === id)?.nilaiNumber,
    );
  }

  return {
    bb: value(KODE_BB),
    pb: value(KODE_PB),
    tb: value(KODE_TB),
    lika: value(KODE_LIKA),
    lila: value(KODE_LILA),
    lipe: value(KODE_LIPE),
    tdSistolik: value(KODE_TD_SISTOLIK),
    tdDiastolik: value(KODE_TD_DIASTOLIK),
    gda: value(KODE_GDA),
    hb: value(KODE_HB),
  };
}

async function ambilOpsiId(
  indikatorId: number,
  kodeOpsi: string,
) {
  const rows = await db
    .select({
      id: opsiIndikator.id,
    })
    .from(opsiIndikator)
    .where(
      and(
        eq(opsiIndikator.indikatorId, indikatorId),
        eq(opsiIndikator.kode, kodeOpsi),
        eq(opsiIndikator.aktif, true),
      ),
    )
    .limit(1);

  return rows[0]?.id ?? null;
}

// ============================================================
// SIAPKAN RENCANA DERIVED
// ============================================================

export async function siapkanRencanaDerivedIndicators(
  pesertaSesiPosgaId: number,
  override?: OverrideDerived,
): Promise<RencanaDerivedIndicators> {
  const masterRows = await ambilMasterSemua();

  const masterByKode = new Map(
    masterRows.map((row) => [row.kode, row]),
  );

  const masterMap = new Map(
    masterRows.map((row) => [row.kode, row.id]),
  );

  const context = await ambilContextPesertaSesi(
    pesertaSesiPosgaId,
  );

  const umurHari = selisihHari(
    context.tanggalLahir,
    context.tanggalPosga,
  );

  if (umurHari < 0) {
    throw new Error(
      "Tanggal sesi lebih awal daripada tanggal lahir peserta.",
    );
  }

  const sumber = await ambilNilaiSumber(
    pesertaSesiPosgaId,
    masterMap,
  );

  if (override) {
    const masterOverride = masterRows.find(
      (row) => row.id === override.indikatorId,
    );

    if (masterOverride) {
      const nilai = override.hapus
        ? null
        : nomorValid(override.nilaiNumber);

      if (masterOverride.kode === KODE_BB) sumber.bb = nilai;
      if (masterOverride.kode === KODE_PB) sumber.pb = nilai;
      if (masterOverride.kode === KODE_TB) sumber.tb = nilai;
      if (masterOverride.kode === KODE_LIKA) sumber.lika = nilai;
      if (masterOverride.kode === KODE_LILA) sumber.lila = nilai;
      if (masterOverride.kode === KODE_LIPE) sumber.lipe = nilai;
      if (masterOverride.kode === KODE_TD_SISTOLIK) sumber.tdSistolik = nilai;
      if (masterOverride.kode === KODE_TD_DIASTOLIK) sumber.tdDiastolik = nilai;
      if (masterOverride.kode === KODE_GDA) sumber.gda = nilai;
      if (masterOverride.kode === KODE_HB) sumber.hb = nilai;
    }
  }

  const items: RencanaDerived[] = [];

  const tambahHapus = (kode: string) => {
    const master = masterByKode.get(kode);
    if (master?.aktif && master.derived) {
      items.push({
        jenis: "hapus",
        indikatorId: master.id,
      });
    }
  };

  const tambahNumber = (
    kode: string,
    nilai: number | null,
    catatan: string,
  ) => {
    const master = masterByKode.get(kode);

    if (!master?.aktif || !master.derived) return;

    if (nilai === null || !Number.isFinite(nilai)) {
      tambahHapus(kode);
      return;
    }

    items.push({
      jenis: "number",
      indikatorId: master.id,
      nilai: bulatkan(nilai, 2),
      catatan,
    });
  };

  const tambahSelect = async (
    kode: string,
    kodeOpsi: string | null,
    catatan: string,
  ) => {
    const master = masterByKode.get(kode);

    if (!master?.aktif || !master.derived) return;

    if (!kodeOpsi) {
      tambahHapus(kode);
      return;
    }

    const opsiId = await ambilOpsiId(master.id, kodeOpsi);

    if (!opsiId) {
      throw new Error(
        `Opsi ${kodeOpsi} untuk indikator ${kode} tidak ditemukan.`,
      );
    }

    items.push({
      jenis: "select",
      indikatorId: master.id,
      opsiId,
      catatan,
    });
  };

  // ----------------------------------------------------------
  // IMT: berlaku jika BB dan TB tersedia untuk kategori yang
  // memang menampilkan indikator IMT.
  // ----------------------------------------------------------

  const panjangTinggi =
    sumber.tb ??
    sumber.pb;

  const imt =
    sumber.bb !== null &&
    panjangTinggi !== null
      ? hitungImt(
          sumber.bb,
          panjangTinggi,
        )
      : null;

  tambahNumber(
    KODE_IMT,
    imt,
    "Dihitung otomatis dari BB dan TB.",
  );

  // ----------------------------------------------------------
  // WHO assessment.
  // calculateAll otomatis memilih tabel WHO sesuai umur.
  // ----------------------------------------------------------

  let assessment: unknown = null;

  if (
    sumber.bb !== null ||
    panjangTinggi !== null ||
    sumber.lika !== null
  ) {
    assessment = await calculateAll({
      sex: context.jenisKelamin === "L"
        ? "male"
        : "female",
      dateOfBirth: tanggalUtc(context.tanggalLahir),
      dateOfMeasurement: tanggalUtc(context.tanggalPosga),
      ...(sumber.bb !== null
        ? { weight: sumber.bb }
        : {}),
      ...(panjangTinggi !== null
        ? { lengthHeight: panjangTinggi }
        : {}),
      ...(sumber.lika !== null
        ? { headCircumference: sumber.lika }
        : {}),
      chartSet: "who-standard",
    });
  }

  const zWfa = zScoreMasukRentangWho(
    "WAZ",
    assessment
      ? ambilZScoreDariAssessment(
          assessment,
          "weight-for-age",
        )
      : null,
  );

  const zHfa = zScoreMasukRentangWho(
    "HAZ",
    assessment
      ? ambilZScoreDariAssessment(
          assessment,
          "length-height-for-age",
        )
      : null,
  );

  const zBmi = zScoreMasukRentangWho(
    "BAZ",
    assessment
      ? ambilZScoreDariAssessment(
          assessment,
          "bmi-for-age",
        )
      : null,
  );

  const zHc = zScoreMasukRentangWho(
    "HCZ",
    assessment
      ? ambilZScoreDariAssessment(
          assessment,
          "head-circumference-for-age",
        )
      : null,
  );

  const zWfl = zScoreMasukRentangWho(
    "WHZ",
    assessment
      ? ambilZScoreDariAssessment(
          assessment,
          "weight-for-length",
        )
      : null,
  );

  const zWfh = zScoreMasukRentangWho(
    "WHZ",
    assessment
      ? ambilZScoreDariAssessment(
          assessment,
          "weight-for-height",
        )
      : null,
  );

  const umurBulan = bulanUmurApprox(umurHari);
  const under5 = umurBulan < 60;
  const usiaSekolah =
    context.kategori === "prasekolah" ||
    context.kategori === "sekolah";
  const dewasaAtauLansia =
    context.kategori === "dewasa" ||
    context.kategori === "lansia";

  // ----------------------------------------------------------
  // BB/U
  // WHO 0-5 + WHO 2007 sampai usia 10 tahun.
  // POSGA saat ini memakai sampai kategori prasekolah (<7 th).
  // ----------------------------------------------------------

  const bbUSupported =
    sumber.bb !== null &&
    umurBulan < 120;

  tambahNumber(
    KODE_BB_U,
    bbUSupported ? zWfa : null,
    "Z-score BB/U dihitung otomatis dari standar pertumbuhan WHO.",
  );

  await tambahSelect(
    KODE_STATUS_BB_U,
    bbUSupported && zWfa !== null
      ? statusBbU(zWfa)
      : null,
    "Klasifikasi otomatis berdasarkan Z-score BB/U WHO.",
  );

  // ----------------------------------------------------------
  // TB/U / PB/U
  // ----------------------------------------------------------

  tambahNumber(
    KODE_TB_U,
    panjangTinggi !== null ? zHfa : null,
    "Z-score PB/TB menurut umur dihitung otomatis dari standar WHO.",
  );

  await tambahSelect(
    KODE_STATUS_TB_U,
    panjangTinggi !== null && zHfa !== null
      ? statusTbU(zHfa)
      : null,
    "Klasifikasi otomatis berdasarkan Z-score PB/TB menurut umur WHO.",
  );

  // ----------------------------------------------------------
  // BB/PB atau BB/TB hanya <5 tahun.
  // Untuk >=5 tahun gunakan IMT/U.
  // ----------------------------------------------------------

  const zBbTb = under5
    ? (umurBulan < 24 ? zWfl : zWfh)
    : null;

  tambahNumber(
    KODE_BB_TB,
    sumber.bb !== null && panjangTinggi !== null
      ? zBbTb
      : null,
    umurBulan < 24
      ? "Z-score BB/PB dihitung otomatis dari standar WHO."
      : "Z-score BB/TB dihitung otomatis dari standar WHO.",
  );

  await tambahSelect(
    KODE_STATUS_BB_TB,
    sumber.bb !== null &&
    panjangTinggi !== null &&
    zBbTb !== null
      ? statusBbTb(zBbTb)
      : null,
    "Klasifikasi otomatis berdasarkan Z-score BB/PB atau BB/TB WHO.",
  );

  // ----------------------------------------------------------
  // IMT/U
  // Dipakai terutama pada prasekolah >=5 tahun.
  // ----------------------------------------------------------

  tambahNumber(
    KODE_IMT_U,
    usiaSekolah && imt !== null
      ? zBmi
      : null,
    "Z-score IMT/U dihitung otomatis dari standar WHO 2007.",
  );

  await tambahSelect(
    KODE_STATUS_IMT_U,
    usiaSekolah && zBmi !== null
      ? statusImt(zBmi)
      : null,
    "Klasifikasi otomatis berdasarkan Z-score IMT/U WHO.",
  );

  // Balita: status IMT existing tetap disinkronkan.
  await tambahSelect(
    KODE_STATUS_IMT_BALITA,
    context.kategori === "balita" &&
    zBmi !== null
      ? statusImt(zBmi)
      : null,
    "Klasifikasi otomatis berdasarkan Z-score IMT/U WHO.",
  );

  // ----------------------------------------------------------
  // Lingkar kepala: WHO 0-5 tahun.
  // ----------------------------------------------------------

  await tambahSelect(
    KODE_STATUS_LIKA,
    under5 &&
    sumber.lika !== null &&
    zHc !== null
      ? statusLika(zHc)
      : null,
    "Klasifikasi otomatis berdasarkan lingkar kepala menurut umur WHO.",
  );

  // ----------------------------------------------------------
  // LILA: WHO/UNICEF community cut-off 6-59 bulan.
  // <11,5 buruk; 11,5-<12,5 kurang; >=12,5 normal.
  // ----------------------------------------------------------

  await tambahSelect(
    KODE_STATUS_LILA,
    sumber.lila !== null
      ? statusLila(sumber.lila, umurHari)
      : null,
    "Klasifikasi otomatis LILA anak usia 6–59 bulan.",
  );

  // ----------------------------------------------------------
  // DEWASA/LANSIA — STATUS OBESITAS
  // Asia Pasifik: <18,5; 18,5-22,9; 23-24,9; 25-29,9; >=30.
  // ----------------------------------------------------------

  await tambahSelect(
    KODE_STATUS_OBESITAS,
    dewasaAtauLansia && imt !== null
      ? klasifikasiObesitasAsiaPasifik(imt)
      : null,
    "Klasifikasi otomatis status obesitas berdasarkan IMT Asia Pasifik.",
  );

  // ----------------------------------------------------------
  // DEWASA/LANSIA — GULA DARAH SEWAKTU
  // SATUSEHAT skrining PTM: <140 normal; 140-199,9 prediabetes;
  // >=200 diabetes.
  // ----------------------------------------------------------

  await tambahSelect(
    KODE_STATUS_DM,
    dewasaAtauLansia && sumber.gda !== null
      ? klasifikasiGds(sumber.gda)
      : null,
    "Klasifikasi otomatis berdasarkan Gula Darah Sewaktu skrining PTM.",
  );

  // ----------------------------------------------------------
  // DEWASA/LANSIA — TEKANAN DARAH
  // ----------------------------------------------------------

  await tambahSelect(
    KODE_STATUS_HIPERTENSI,
    dewasaAtauLansia &&
    sumber.tdSistolik !== null &&
    sumber.tdDiastolik !== null
      ? klasifikasiTekananDarahDewasa(
          sumber.tdSistolik,
          sumber.tdDiastolik,
        )
      : null,
    "Klasifikasi otomatis tekanan darah berdasarkan skrining PTM.",
  );

  // ----------------------------------------------------------
  // DEWASA/LANSIA — LINGKAR PERUT
  // ----------------------------------------------------------

  await tambahSelect(
    KODE_STATUS_LIPE,
    dewasaAtauLansia &&
    sumber.lipe !== null
      ? klasifikasiLingkarPerutAsia(
          sumber.lipe,
          context.jenisKelamin,
        )
      : null,
    "Klasifikasi otomatis lingkar perut berdasarkan batas obesitas sentral Asia.",
  );

  // ----------------------------------------------------------
  // IBU HAMIL — MAP
  // ----------------------------------------------------------

  tambahNumber(
    KODE_MAP,
    context.kategori === "ibu_hamil" &&
    sumber.tdSistolik !== null &&
    sumber.tdDiastolik !== null
      ? hitungMap(
          sumber.tdSistolik,
          sumber.tdDiastolik,
        )
      : null,
    "MAP dihitung otomatis dari tekanan darah sistolik dan diastolik.",
  );

  // ----------------------------------------------------------
  // IBU NIFAS — STATUS TEKANAN DARAH AKTUAL
  // ----------------------------------------------------------

  await tambahSelect(
    KODE_STATUS_HT_NIFAS,
    context.kategori === "ibu_nifas" &&
    sumber.tdSistolik !== null &&
    sumber.tdDiastolik !== null
      ? klasifikasiTekananDarahDewasa(
          sumber.tdSistolik,
          sumber.tdDiastolik,
        )
      : null,
    "Klasifikasi otomatis tekanan darah aktual pada masa nifas.",
  );

  // ----------------------------------------------------------
  // IBU NIFAS — KF1..KF4 BERDASARKAN TANGGAL MELAHIRKAN
  // ----------------------------------------------------------

  let jenisKunjunganNifas:
    "KF1" | "KF2" | "KF3" | "KF4" | null = null;

  if (context.kategori === "ibu_nifas") {
    const nifas = await db
      .select({
        tanggalMelahirkan:
          episodeNifas.tanggalMelahirkan,
      })
      .from(episodeNifas)
      .where(
        and(
          eq(
            episodeNifas.pesertaNik,
            context.pesertaNik,
          ),
          lte(
            episodeNifas.tanggalMulai,
            context.tanggalPosga,
          ),
          or(
            isNull(episodeNifas.tanggalSelesai),
            gte(
              episodeNifas.tanggalSelesai,
              context.tanggalPosga,
            ),
          ),
        ),
      )
      .orderBy(
        desc(
          episodeNifas.tanggalMulai,
        ),
      )
      .limit(1);

    const tanggalMelahirkan =
      nifas[0]?.tanggalMelahirkan;

    if (tanggalMelahirkan) {
      jenisKunjunganNifas =
        klasifikasiKunjunganNifas(
          tanggalMelahirkan,
          context.tanggalPosga,
        );
    }
  }

  await tambahSelect(
    KODE_JENIS_KUNJUNGAN_NIFAS,
    jenisKunjunganNifas,
    "Jenis kunjungan nifas dihitung otomatis dari tanggal melahirkan dan tanggal sesi.",
  );

  // ----------------------------------------------------------
  // ANEMIA — sekolah perempuan, ibu hamil, ibu nifas.
  // Untuk ibu hamil trimester dihitung dari HPHT bila tersedia.
  // ----------------------------------------------------------

  let trimesterKehamilan: 1 | 2 | 3 | null = null;

  if (context.kategori === "ibu_hamil") {
    const episode = await db
      .select({
        hpht: episodeKehamilan.hpht,
      })
      .from(episodeKehamilan)
      .where(
        and(
          eq(
            episodeKehamilan.pesertaNik,
            context.pesertaNik,
          ),
          lte(
            episodeKehamilan.tanggalMulai,
            context.tanggalPosga,
          ),
          or(
            isNull(episodeKehamilan.tanggalSelesai),
            gte(
              episodeKehamilan.tanggalSelesai,
              context.tanggalPosga,
            ),
          ),
        ),
      )
      .orderBy(desc(episodeKehamilan.tanggalMulai))
      .limit(1);

    const hpht = episode[0]?.hpht;

    if (hpht) {
      const usiaKehamilanHari = selisihHari(
        hpht,
        context.tanggalPosga,
      );

      if (usiaKehamilanHari >= 0) {
        const minggu =
          usiaKehamilanHari / 7;

        trimesterKehamilan =
          minggu < 14
            ? 1
            : minggu < 28
              ? 2
              : 3;
      }
    }
  }

  await tambahSelect(
    KODE_STATUS_ANEMIA,
    sumber.hb !== null
      ? klasifikasiAnemia(
          sumber.hb,
          {
            umurTahun:
              umurHari / 365.2425,
            jenisKelamin:
              context.jenisKelamin,
            kategori:
              context.kategori,
            trimesterKehamilan,
          },
        )
      : null,
    "Klasifikasi otomatis anemia berdasarkan kadar hemoglobin WHO 2024.",
  );

  return {
    pesertaSesiPosgaId,
    items,
  };
}

// ============================================================
// TERAPKAN RENCANA DI DALAM TRANSAKSI
// ============================================================

function hapusDerived(
  pesertaSesiPosgaId: number,
  indikatorId: number,
  executor: DerivedExecutor,
) {
  executor
    .delete(hasilPemeriksaan)
    .where(
      and(
        eq(
          hasilPemeriksaan.pesertaSesiPosgaId,
          pesertaSesiPosgaId,
        ),
        eq(
          hasilPemeriksaan.indikatorId,
          indikatorId,
        ),
      ),
    )
    .run();
}

function ambilExistingId(
  pesertaSesiPosgaId: number,
  indikatorId: number,
  executor: DerivedExecutor,
) {
  return executor
    .select({
      id: hasilPemeriksaan.id,
    })
    .from(hasilPemeriksaan)
    .where(
      and(
        eq(
          hasilPemeriksaan.pesertaSesiPosgaId,
          pesertaSesiPosgaId,
        ),
        eq(
          hasilPemeriksaan.indikatorId,
          indikatorId,
        ),
      ),
    )
    .limit(1)
    .all()[0]?.id ?? null;
}

export function terapkanRencanaDerivedIndicators(
  rencana: RencanaDerivedIndicators,
  executor: DerivedExecutor = db,
) {
  for (const item of rencana.items) {
    if (item.jenis === "hapus") {
      hapusDerived(
        rencana.pesertaSesiPosgaId,
        item.indikatorId,
        executor,
      );
      continue;
    }

    const existingId = ambilExistingId(
      rencana.pesertaSesiPosgaId,
      item.indikatorId,
      executor,
    );

    const nilai =
      item.jenis === "number"
        ? {
            opsiId: null,
            nilaiNumber: item.nilai,
            nilaiText: null,
            nilaiBoolean: null,
            nilaiDate: null,
            catatan: item.catatan,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          }
        : {
            opsiId: item.opsiId,
            nilaiNumber: null,
            nilaiText: null,
            nilaiBoolean: null,
            nilaiDate: null,
            catatan: item.catatan,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          };

    if (existingId) {
      executor
        .update(hasilPemeriksaan)
        .set(nilai)
        .where(eq(hasilPemeriksaan.id, existingId))
        .run();
    } else {
      executor
        .insert(hasilPemeriksaan)
        .values({
          pesertaSesiPosgaId: rencana.pesertaSesiPosgaId,
          indikatorId: item.indikatorId,
          opsiId: nilai.opsiId,
          nilaiNumber: nilai.nilaiNumber,
          nilaiText: null,
          nilaiBoolean: null,
          nilaiDate: null,
          catatan: item.catatan,
        })
        .run();
    }
  }
}

// ============================================================
// COMPATIBILITY: sinkron manual tanpa override.
// Dipakai test/utilitas. Tidak dipakai di dalam transaction klinis.
// ============================================================

export async function sinkronkanDerivedIndicators(
  pesertaSesiPosgaId: number,
) {
  const rencana =
    await siapkanRencanaDerivedIndicators(
      pesertaSesiPosgaId,
    );

  db.transaction((tx) => {
    terapkanRencanaDerivedIndicators(
      rencana,
      tx,
    );
  });

  return rencana;
}

// ============================================================
// APAKAH SUMBER MEMENGARUHI DERIVED
// ============================================================

export async function indikatorMemengaruhiDerived(
  indikatorId: number,
) {
  const master = await db
    .select({
      kode: indikator.kode,
    })
    .from(indikator)
    .where(eq(indikator.id, indikatorId))
    .limit(1);

  return KODE_SUMBER.includes(
    master[0]?.kode as (typeof KODE_SUMBER)[number],
  );
}

// ============================================================
// VALIDASI INPUT MANUAL DERIVED
// ============================================================

export async function pastikanBukanDerivedManual(
  indikatorId: number,
) {
  const rows = await db
    .select({
      kode: indikator.kode,
      derived: indikator.derived,
    })
    .from(indikator)
    .where(eq(indikator.id, indikatorId))
    .limit(1);

  const master = rows[0];

  if (master?.derived) {
    throw new Error(
      `Indikator ${master.kode} merupakan indikator derived dan tidak boleh diisi secara manual.`,
    );
  }
}
