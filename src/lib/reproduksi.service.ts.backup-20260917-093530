import {
  and,
  eq,
  sql,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  episodeKehamilan,
  episodeNifas,
  komplikasiPersalinan,
  peserta,
  tindakanPersalinan,
} from "../db/schema.js";

// ============================================================
// TYPE
// ============================================================

export type StatusEpisodeReproduksi =
  | "aktif"
  | "selesai"
  | "dibatalkan";

export interface TambahEpisodeKehamilanInput {
  tanggalMulai: string;

  bbSebelumHamilKg?:
    number | null;

  tbCm?:
    number | null;

  hpht?:
    string | null;

  hpl?:
    string | null;

  lilaAwalCm?:
    number | null;

  catatan?:
    string | null;
}

export interface UpdateEpisodeKehamilanInput {
  tanggalMulai?:
    string;

  tanggalSelesai?:
    string | null;

  bbSebelumHamilKg?:
    number | null;

  tbCm?:
    number | null;

  hpht?:
    string | null;

  hpl?:
    string | null;

  lilaAwalCm?:
    number | null;

  catatan?:
    string | null;
}

export interface TambahEpisodeNifasInput {
  episodeKehamilanId?:
    number | null;

  tanggalMulai:
    string;

  tanggalMelahirkan?:
    string | null;

  jamBersalin?:
    string | null;

  caraPersalinan?:
    "pervaginam"
    | "sesar"
    | null;

  vitaminA?:
    boolean | null;

  asiEksklusif?:
    boolean | null;

  catatan?:
    string | null;
}

export interface UpdateEpisodeNifasInput {
  episodeKehamilanId?:
    number | null;

  tanggalMulai?:
    string;

  tanggalSelesai?:
    string | null;

  tanggalMelahirkan?:
    string | null;

  jamBersalin?:
    string | null;

  caraPersalinan?:
    "pervaginam"
    | "sesar"
    | null;

  vitaminA?:
    boolean | null;

  asiEksklusif?:
    boolean | null;

  catatan?:
    string | null;
}

export interface TambahItemPersalinanInput {
  kode: string;

  label: string;

  catatan?:
    string | null;
}

export interface UpdateItemPersalinanInput {
  kode?:
    string;

  label?:
    string;

  catatan?:
    string | null;
}

// ============================================================
// HELPER
// ============================================================

function normalisasiText(
  value:
    string | null | undefined,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const hasil =
    value.trim();

  return hasil.length > 0
    ? hasil
    : null;
}

function validasiNik(
  nik: string,
) {
  if (
    !/^\d{16}$/.test(
      nik,
    )
  ) {
    throw new Error(
      "NIK harus terdiri dari 16 digit.",
    );
  }
}

function validasiTanggal(
  value: string,
  label: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    throw new Error(
      `${label} harus menggunakan format YYYY-MM-DD.`,
    );
  }

  const [
    tahunText,
    bulanText,
    hariText,
  ] =
    value.split("-");

  const tahun =
    Number(tahunText);

  const bulan =
    Number(bulanText);

  const hari =
    Number(hariText);

  const tanggal =
    new Date(
      Date.UTC(
        tahun,
        bulan - 1,
        hari,
      ),
    );

  if (
    tanggal.getUTCFullYear() !==
      tahun ||
    tanggal.getUTCMonth() !==
      bulan - 1 ||
    tanggal.getUTCDate() !==
      hari
  ) {
    throw new Error(
      `${label} tidak valid.`,
    );
  }
}

function validasiTanggalOpsional(
  value:
    string | null | undefined,
  label: string,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return;
  }

  validasiTanggal(
    value,
    label,
  );
}

function validasiJam(
  value:
    string | null | undefined,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return;
  }

  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      value,
    )
  ) {
    throw new Error(
      "Jam bersalin harus menggunakan format HH:MM.",
    );
  }
}

function validasiAngkaPositif(
  value:
    number | null | undefined,
  label: string,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return;
  }

  if (
    !Number.isFinite(
      value,
    ) ||
    value <= 0
  ) {
    throw new Error(
      `${label} harus lebih dari 0.`,
    );
  }
}

function validasiUrutanTanggal(
  awal: string,
  akhir:
    string | null | undefined,
  labelAwal: string,
  labelAkhir: string,
) {
  if (
    akhir === undefined ||
    akhir === null
  ) {
    return;
  }

  if (
    akhir < awal
  ) {
    throw new Error(
      `${labelAkhir} tidak boleh lebih awal dari ${labelAwal}.`,
    );
  }
}

// ============================================================
// INTEGRITAS PERIODE REPRODUKSI
// ============================================================

const DURASI_NIFAS_HARI =
  45;

function tambahHariIso(
  tanggalIso: string,
  jumlahHari: number,
) {
  validasiTanggal(
    tanggalIso,
    "Tanggal",
  );

  const [
    tahunText,
    bulanText,
    hariText,
  ] =
    tanggalIso.split("-");

  const tanggal =
    new Date(
      Date.UTC(
        Number(tahunText),
        Number(bulanText) - 1,
        Number(hariText),
      ),
    );

  tanggal.setUTCDate(
    tanggal.getUTCDate() +
      jumlahHari,
  );

  return tanggal
    .toISOString()
    .slice(0, 10);
}

function tanggalHariIniLokal() {
  const sekarang =
    new Date();

  const tahun =
    sekarang.getFullYear();

  const bulan =
    String(
      sekarang.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const hari =
    String(
      sekarang.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${tahun}-${bulan}-${hari}`;
}

export function tanggalSelesaiOtomatisNifas(
  tanggalMulai: string,
) {
  return tambahHariIso(
    tanggalMulai,
    DURASI_NIFAS_HARI,
  );
}

function periodeTumpangTindih(
  mulaiA: string,
  selesaiA: string | null,
  mulaiB: string,
  selesaiB: string | null,
) {
  const akhirA =
    selesaiA ??
    "9999-12-31";

  const akhirB =
    selesaiB ??
    "9999-12-31";

  return (
    mulaiA <= akhirB &&
    mulaiB <= akhirA
  );
}

function validasiHphtHpl(
  hpht: string | null,
  hpl: string | null,
) {
  if (
    hpht &&
    hpl &&
    hpl < hpht
  ) {
    throw new Error(
      "HPL tidak boleh lebih awal dari HPHT.",
    );
  }
}

function validasiTanggalMelahirkanNifas(
  tanggalMelahirkan: string,
  tanggalMulaiNifas: string,
) {
  if (
    tanggalMelahirkan >
    tanggalMulaiNifas
  ) {
    throw new Error(
      "Tanggal melahirkan tidak boleh lebih akhir dari tanggal mulai nifas.",
    );
  }
}

async function pastikanTidakAdaTumpangTindihKehamilan(
  pesertaNik: string,
  tanggalMulai: string,
  tanggalSelesai: string | null,
  kecualiId?: number,
) {
  const rows =
    await db
      .select({
        id:
          episodeKehamilan.id,
        tanggalMulai:
          episodeKehamilan.tanggalMulai,
        tanggalSelesai:
          episodeKehamilan.tanggalSelesai,
        status:
          episodeKehamilan.status,
      })
      .from(
        episodeKehamilan,
      )
      .where(
        eq(
          episodeKehamilan.pesertaNik,
          pesertaNik,
        ),
      );

  const bentrok =
    rows.find(
      (item) =>
        item.status !==
          "dibatalkan" &&
        item.id !==
          kecualiId &&
        periodeTumpangTindih(
          tanggalMulai,
          tanggalSelesai,
          item.tanggalMulai,
          item.tanggalSelesai,
        ),
    );

  if (bentrok) {
    throw new Error(
      "Periode kehamilan bertumpang tindih dengan episode kehamilan lain.",
    );
  }
}

async function pastikanTidakAdaTumpangTindihNifas(
  pesertaNik: string,
  tanggalMulai: string,
  tanggalSelesai: string | null,
  kecualiId?: number,
) {
  const rows =
    await db
      .select({
        id:
          episodeNifas.id,
        tanggalMulai:
          episodeNifas.tanggalMulai,
        tanggalSelesai:
          episodeNifas.tanggalSelesai,
        status:
          episodeNifas.status,
      })
      .from(
        episodeNifas,
      )
      .where(
        eq(
          episodeNifas.pesertaNik,
          pesertaNik,
        ),
      );

  const bentrok =
    rows.find(
      (item) =>
        item.status !==
          "dibatalkan" &&
        item.id !==
          kecualiId &&
        periodeTumpangTindih(
          tanggalMulai,
          tanggalSelesai,
          item.tanggalMulai,
          item.tanggalSelesai,
        ),
    );

  if (bentrok) {
    throw new Error(
      "Periode nifas bertumpang tindih dengan episode nifas lain.",
    );
  }
}

export async function sinkronkanNifasLewat45Hari(
  pesertaNik?: string,
) {
  const rows =
    await db
      .select({
        id:
          episodeNifas.id,
        pesertaNik:
          episodeNifas.pesertaNik,
        tanggalMulai:
          episodeNifas.tanggalMulai,
        tanggalSelesai:
          episodeNifas.tanggalSelesai,
        tanggalMelahirkan:
          episodeNifas.tanggalMelahirkan,
      })
      .from(
        episodeNifas,
      )
      .where(
        pesertaNik
          ? and(
              eq(
                episodeNifas.status,
                "aktif",
              ),
              eq(
                episodeNifas.pesertaNik,
                pesertaNik,
              ),
            )
          : eq(
              episodeNifas.status,
              "aktif",
            ),
      );

  const hariIni =
    tanggalHariIniLokal();

  let jumlahDiselesaikan =
    0;

  for (
    const item of rows
  ) {
    const batas45Hari =
      tanggalSelesaiOtomatisNifas(
        item.tanggalMelahirkan ??
          item.tanggalMulai,
      );

    const batasEfektif =
      item.tanggalSelesai &&
      item.tanggalSelesai <
        batas45Hari
        ? item.tanggalSelesai
        : batas45Hari;

    if (
      batasEfektif >
      hariIni
    ) {
      continue;
    }

    const updated =
      await db
        .update(
          episodeNifas,
        )
        .set({
          tanggalSelesai:
            batasEfektif,
          status:
            "selesai",
          updatedAt:
            sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(
              episodeNifas.id,
              item.id,
            ),
            eq(
              episodeNifas.status,
              "aktif",
            ),
          ),
        )
        .returning({
          id:
            episodeNifas.id,
        });

    if (
      updated.length > 0
    ) {
      jumlahDiselesaikan +=
        1;
    }
  }

  return {
    jumlahDiselesaikan,
  };
}

// ============================================================
// PESERTA
// ============================================================

async function pastikanPesertaPerempuan(
  pesertaNik: string,
) {
  validasiNik(
    pesertaNik,
  );

  const rows =
    await db
      .select({
        nik:
          peserta.nik,

        nama:
          peserta.nama,

        jenisKelamin:
          peserta.jenisKelamin,

        aktif:
          peserta.aktif,
      })
      .from(
        peserta,
      )
      .where(
        eq(
          peserta.nik,
          pesertaNik,
        ),
      )
      .limit(1);

  const data =
    rows[0];

  if (!data) {
    throw new Error(
      "Peserta tidak ditemukan.",
    );
  }

  if (
    !data.aktif
  ) {
    throw new Error(
      "Peserta sudah tidak aktif.",
    );
  }

  if (
    data.jenisKelamin !==
    "P"
  ) {
    throw new Error(
      "Episode kehamilan dan nifas hanya dapat dicatat untuk peserta perempuan.",
    );
  }

  return data;
}

// ============================================================
// GET KEHAMILAN BY ID
// ============================================================

export async function ambilEpisodeKehamilanById(
  id: number,
) {
  const rows =
    await db
      .select()
      .from(
        episodeKehamilan,
      )
      .where(
        eq(
          episodeKehamilan.id,
          id,
        ),
      )
      .limit(1);

  return (
    rows[0] ??
    null
  );
}

// ============================================================
// RIWAYAT KEHAMILAN
// ============================================================

export async function ambilRiwayatKehamilan(
  pesertaNik: string,
) {
  await pastikanPesertaPerempuan(
    pesertaNik,
  );

  return db
    .select()
    .from(
      episodeKehamilan,
    )
    .where(
      eq(
        episodeKehamilan.pesertaNik,
        pesertaNik,
      ),
    )
    .orderBy(
      episodeKehamilan.tanggalMulai,
    );
}

// ============================================================
// KEHAMILAN AKTIF
// ============================================================

export async function ambilKehamilanAktif(
  pesertaNik: string,
) {
  await pastikanPesertaPerempuan(
    pesertaNik,
  );

  const rows =
    await db
      .select()
      .from(
        episodeKehamilan,
      )
      .where(
        and(
          eq(
            episodeKehamilan.pesertaNik,
            pesertaNik,
          ),

          eq(
            episodeKehamilan.status,
            "aktif",
          ),
        ),
      )
      .limit(1);

  return (
    rows[0] ??
    null
  );
}

// ============================================================
// CREATE KEHAMILAN
// ============================================================

export async function tambahEpisodeKehamilan(
  pesertaNik: string,
  input:
    TambahEpisodeKehamilanInput,
) {
  await pastikanPesertaPerempuan(
    pesertaNik,
  );

  validasiTanggal(
    input.tanggalMulai,
    "Tanggal mulai",
  );

  validasiTanggalOpsional(
    input.hpht,
    "HPHT",
  );

  validasiTanggalOpsional(
    input.hpl,
    "HPL",
  );

  validasiAngkaPositif(
    input.bbSebelumHamilKg,
    "Berat badan sebelum hamil",
  );

  validasiAngkaPositif(
    input.tbCm,
    "Tinggi badan",
  );

  validasiAngkaPositif(
    input.lilaAwalCm,
    "LiLA awal",
  );

  validasiHphtHpl(
    input.hpht ?? null,
    input.hpl ?? null,
  );

  await pastikanTidakAdaTumpangTindihKehamilan(
    pesertaNik,
    input.tanggalMulai,
    null,
  );

  const inserted =
    await db
      .insert(
        episodeKehamilan,
      )
      .values({
        pesertaNik,
        tanggalMulai:
          input.tanggalMulai,
        status:
          "aktif",
        bbSebelumHamilKg:
          input.bbSebelumHamilKg ??
          null,
        tbCm:
          input.tbCm ??
          null,
        hpht:
          input.hpht ??
          null,
        hpl:
          input.hpl ??
          null,
        lilaAwalCm:
          input.lilaAwalCm ??
          null,
        catatan:
          normalisasiText(
            input.catatan,
          ),
      })
      .returning({
        id:
          episodeKehamilan.id,
      });

  const id =
    inserted[0]?.id;

  if (!id) {
    throw new Error(
      "Episode kehamilan gagal disimpan.",
    );
  }

  const hasil =
    await ambilEpisodeKehamilanById(
      id,
    );

  if (!hasil) {
    throw new Error(
      "Episode kehamilan tersimpan tetapi gagal dibaca kembali.",
    );
  }

  return hasil;
}

// ============================================================
// UPDATE KEHAMILAN
// ============================================================

export async function updateEpisodeKehamilan(
  id: number,
  input:
    UpdateEpisodeKehamilanInput,
) {
  const lama =
    await ambilEpisodeKehamilanById(
      id,
    );

  if (!lama) {
    throw new Error(
      "Episode kehamilan tidak ditemukan.",
    );
  }

  const tanggalMulai =
    input.tanggalMulai ??
    lama.tanggalMulai;

  const tanggalSelesai =
    input.tanggalSelesai !==
    undefined
      ? input.tanggalSelesai
      : lama.tanggalSelesai;

  const hpht =
    input.hpht !==
    undefined
      ? input.hpht
      : lama.hpht;

  const hpl =
    input.hpl !==
    undefined
      ? input.hpl
      : lama.hpl;

  validasiTanggal(
    tanggalMulai,
    "Tanggal mulai",
  );

  validasiTanggalOpsional(
    tanggalSelesai,
    "Tanggal selesai",
  );

  validasiUrutanTanggal(
    tanggalMulai,
    tanggalSelesai,
    "tanggal mulai",
    "Tanggal selesai",
  );

  validasiTanggalOpsional(
    hpht,
    "HPHT",
  );

  validasiTanggalOpsional(
    hpl,
    "HPL",
  );

  validasiHphtHpl(
    hpht,
    hpl,
  );

  validasiAngkaPositif(
    input.bbSebelumHamilKg,
    "Berat badan sebelum hamil",
  );

  validasiAngkaPositif(
    input.tbCm,
    "Tinggi badan",
  );

  validasiAngkaPositif(
    input.lilaAwalCm,
    "LiLA awal",
  );

  const statusBaru =
    input.tanggalSelesai !==
      undefined &&
    lama.status !==
      "dibatalkan"
      ? input.tanggalSelesai ===
        null
        ? "aktif"
        : "selesai"
      : lama.status;

  if (
    statusBaru !==
    "dibatalkan"
  ) {
    await pastikanTidakAdaTumpangTindihKehamilan(
      lama.pesertaNik,
      tanggalMulai,
      tanggalSelesai,
      id,
    );
  }

  await db
    .update(
      episodeKehamilan,
    )
    .set({
      ...(input.tanggalMulai !==
      undefined
        ? {
            tanggalMulai:
              input.tanggalMulai,
          }
        : {}),
      ...(input.tanggalSelesai !==
      undefined
        ? {
            tanggalSelesai:
              input.tanggalSelesai,
            status:
              statusBaru,
          }
        : {}),
      ...(input.bbSebelumHamilKg !==
      undefined
        ? {
            bbSebelumHamilKg:
              input.bbSebelumHamilKg,
          }
        : {}),
      ...(input.tbCm !==
      undefined
        ? {
            tbCm:
              input.tbCm,
          }
        : {}),
      ...(input.hpht !==
      undefined
        ? {
            hpht:
              input.hpht,
          }
        : {}),
      ...(input.hpl !==
      undefined
        ? {
            hpl:
              input.hpl,
          }
        : {}),
      ...(input.lilaAwalCm !==
      undefined
        ? {
            lilaAwalCm:
              input.lilaAwalCm,
          }
        : {}),
      ...(input.catatan !==
      undefined
        ? {
            catatan:
              normalisasiText(
                input.catatan,
              ),
          }
        : {}),
      updatedAt:
        sql`CURRENT_TIMESTAMP`,
    })
    .where(
      eq(
        episodeKehamilan.id,
        id,
      ),
    );

  const hasil =
    await ambilEpisodeKehamilanById(
      id,
    );

  if (!hasil) {
    throw new Error(
      "Episode kehamilan gagal dibaca setelah update.",
    );
  }

  return hasil;
}

// ============================================================
// SELESAIKAN KEHAMILAN
// ============================================================

export async function selesaikanEpisodeKehamilan(
  id: number,
  tanggalSelesai: string,
) {
  const lama =
    await ambilEpisodeKehamilanById(
      id,
    );

  if (!lama) {
    throw new Error(
      "Episode kehamilan tidak ditemukan.",
    );
  }

  if (
    lama.status !==
    "aktif"
  ) {
    throw new Error(
      "Hanya episode kehamilan aktif yang dapat diselesaikan.",
    );
  }

  validasiTanggal(
    tanggalSelesai,
    "Tanggal selesai",
  );

  validasiUrutanTanggal(
    lama.tanggalMulai,
    tanggalSelesai,
    "tanggal mulai",
    "Tanggal selesai",
  );

  await db
    .update(
      episodeKehamilan,
    )
    .set({
      tanggalSelesai,

      status:
        "selesai",

      updatedAt:
        sql`CURRENT_TIMESTAMP`,
    })
    .where(
      eq(
        episodeKehamilan.id,
        id,
      ),
    );

  return ambilEpisodeKehamilanById(
    id,
  );
}

// ============================================================
// BATALKAN KEHAMILAN
// ============================================================

export async function batalkanEpisodeKehamilan(
  id: number,
  tanggalSelesai?: string | null,
) {
  const lama =
    await ambilEpisodeKehamilanById(
      id,
    );

  if (!lama) {
    throw new Error(
      "Episode kehamilan tidak ditemukan.",
    );
  }

  if (
    lama.status !==
    "aktif"
  ) {
    throw new Error(
      "Hanya episode kehamilan aktif yang dapat dibatalkan.",
    );
  }

  if (
    tanggalSelesai
  ) {
    validasiTanggal(
      tanggalSelesai,
      "Tanggal selesai",
    );

    validasiUrutanTanggal(
      lama.tanggalMulai,
      tanggalSelesai,
      "tanggal mulai",
      "Tanggal selesai",
    );
  }

  await db
    .update(
      episodeKehamilan,
    )
    .set({
      tanggalSelesai:
        tanggalSelesai ??
        lama.tanggalSelesai,

      status:
        "dibatalkan",

      updatedAt:
        sql`CURRENT_TIMESTAMP`,
    })
    .where(
      eq(
        episodeKehamilan.id,
        id,
      ),
    );

  return ambilEpisodeKehamilanById(
    id,
  );
}

// ============================================================
// GET NIFAS BY ID
// ============================================================

export async function ambilEpisodeNifasById(
  id: number,
) {
  const rows =
    await db
      .select()
      .from(
        episodeNifas,
      )
      .where(
        eq(
          episodeNifas.id,
          id,
        ),
      )
      .limit(1);

  return (
    rows[0] ??
    null
  );
}

// ============================================================
// DETAIL NIFAS + PERSALINAN
// ============================================================

export async function ambilDetailEpisodeNifas(
  id: number,
) {
  const awal =
    await ambilEpisodeNifasById(
      id,
    );

  if (!awal) {
    return null;
  }

  await sinkronkanNifasLewat45Hari(
    awal.pesertaNik,
  );

  const nifas =
    await ambilEpisodeNifasById(
      id,
    );

  if (!nifas) {
    return null;
  }

  const tindakan =
    await db
      .select()
      .from(
        tindakanPersalinan,
      )
      .where(
        eq(
          tindakanPersalinan.episodeNifasId,
          id,
        ),
      )
      .orderBy(
        tindakanPersalinan.id,
      );

  const komplikasi =
    await db
      .select()
      .from(
        komplikasiPersalinan,
      )
      .where(
        eq(
          komplikasiPersalinan.episodeNifasId,
          id,
        ),
      )
      .orderBy(
        komplikasiPersalinan.id,
      );

  return {
    ...nifas,
    tindakanPersalinan:
      tindakan,
    komplikasiPersalinan:
      komplikasi,
  };
}

// ============================================================
// RIWAYAT NIFAS
// ============================================================

export async function ambilRiwayatNifas(
  pesertaNik: string,
) {
  await pastikanPesertaPerempuan(
    pesertaNik,
  );

  await sinkronkanNifasLewat45Hari(
    pesertaNik,
  );

  return db
    .select()
    .from(
      episodeNifas,
    )
    .where(
      eq(
        episodeNifas.pesertaNik,
        pesertaNik,
      ),
    )
    .orderBy(
      episodeNifas.tanggalMulai,
    );
}

// ============================================================
// NIFAS AKTIF
// ============================================================

export async function ambilNifasAktif(
  pesertaNik: string,
) {
  await pastikanPesertaPerempuan(
    pesertaNik,
  );

  await sinkronkanNifasLewat45Hari(
    pesertaNik,
  );

  const rows =
    await db
      .select()
      .from(
        episodeNifas,
      )
      .where(
        and(
          eq(
            episodeNifas.pesertaNik,
            pesertaNik,
          ),
          eq(
            episodeNifas.status,
            "aktif",
          ),
        ),
      )
      .limit(1);

  return (
    rows[0] ??
    null
  );
}

// ============================================================
// VALIDASI KEHAMILAN UNTUK NIFAS
// ============================================================

async function validasiKehamilanUntukNifas(
  pesertaNik: string,
  episodeKehamilanId:
    number | null | undefined,
  kecualiNifasId?: number,
) {
  if (
    episodeKehamilanId ===
      undefined ||
    episodeKehamilanId ===
      null
  ) {
    return null;
  }

  const kehamilan =
    await ambilEpisodeKehamilanById(
      episodeKehamilanId,
    );

  if (!kehamilan) {
    throw new Error(
      "Episode kehamilan yang dirujuk tidak ditemukan.",
    );
  }

  if (
    kehamilan.pesertaNik !==
    pesertaNik
  ) {
    throw new Error(
      "Episode kehamilan tidak dimiliki oleh peserta tersebut.",
    );
  }

  if (
    kehamilan.status ===
    "dibatalkan"
  ) {
    throw new Error(
      "Episode kehamilan yang dibatalkan tidak dapat digunakan untuk episode nifas.",
    );
  }

  const tautan =
    await db
      .select({
        id:
          episodeNifas.id,
        status:
          episodeNifas.status,
      })
      .from(
        episodeNifas,
      )
      .where(
        eq(
          episodeNifas.episodeKehamilanId,
          episodeKehamilanId,
        ),
      );

  const sudahDipakai =
    tautan.find(
      (item) =>
        item.id !==
          kecualiNifasId &&
        item.status !==
          "dibatalkan",
    );

  if (sudahDipakai) {
    throw new Error(
      "Episode kehamilan tersebut sudah terhubung dengan episode nifas lain.",
    );
  }

  return kehamilan;
}

// ============================================================
// CREATE NIFAS
// ============================================================

export async function tambahEpisodeNifas(
  pesertaNik: string,
  input:
    TambahEpisodeNifasInput,
) {
  await pastikanPesertaPerempuan(
    pesertaNik,
  );

  validasiTanggal(
    input.tanggalMulai,
    "Tanggal mulai nifas",
  );

  validasiTanggalOpsional(
    input.tanggalMelahirkan,
    "Tanggal melahirkan",
  );

  validasiJam(
    input.jamBersalin,
  );

  const tanggalMelahirkan =
    input.tanggalMelahirkan ??
    input.tanggalMulai;

  validasiTanggalMelahirkanNifas(
    tanggalMelahirkan,
    input.tanggalMulai,
  );

  await pastikanTidakAdaTumpangTindihNifas(
    pesertaNik,
    input.tanggalMulai,
    null,
  );

  const kehamilan =
    await validasiKehamilanUntukNifas(
      pesertaNik,
      input.episodeKehamilanId,
    );

  if (kehamilan) {
    validasiUrutanTanggal(
      kehamilan.tanggalMulai,
      tanggalMelahirkan,
      "tanggal mulai kehamilan",
      "Tanggal melahirkan",
    );
  }

  const id =
    db.transaction(
      (tx) => {
        const inserted =
          tx
            .insert(
              episodeNifas,
            )
            .values({
              pesertaNik,
              episodeKehamilanId:
                input.episodeKehamilanId ??
                null,
              tanggalMulai:
                input.tanggalMulai,
              tanggalMelahirkan:
                input.tanggalMelahirkan ??
                null,
              jamBersalin:
                normalisasiText(
                  input.jamBersalin,
                ),
              caraPersalinan:
                input.caraPersalinan ??
                null,
              vitaminA:
                input.vitaminA ??
                null,
              asiEksklusif:
                input.asiEksklusif ??
                null,
              status:
                "aktif",
              catatan:
                normalisasiText(
                  input.catatan,
                ),
            })
            .returning({
              id:
                episodeNifas.id,
            })
            .all();

        const id =
          inserted[0]?.id;

        if (!id) {
          throw new Error(
            "Episode nifas gagal disimpan.",
          );
        }

        if (
          kehamilan &&
          kehamilan.status ===
            "aktif"
        ) {
          const updated =
            tx
              .update(
                episodeKehamilan,
              )
              .set({
                tanggalSelesai:
                  tanggalMelahirkan,
                status:
                  "selesai",
                updatedAt:
                  sql`CURRENT_TIMESTAMP`,
              })
              .where(
                and(
                  eq(
                    episodeKehamilan.id,
                    kehamilan.id,
                  ),
                  eq(
                    episodeKehamilan.status,
                    "aktif",
                  ),
                ),
              )
              .returning({
                id:
                  episodeKehamilan.id,
              })
              .all();

          if (
            updated.length !==
            1
          ) {
            throw new Error(
              "Episode kehamilan gagal ditutup saat membuat episode nifas.",
            );
          }
        }

        return id;
      },
    );

  const hasil =
    await ambilDetailEpisodeNifas(
      id,
    );

  if (!hasil) {
    throw new Error(
      "Episode nifas tersimpan tetapi gagal dibaca kembali.",
    );
  }

  return hasil;
}

// ============================================================
// UPDATE NIFAS
// ============================================================

export async function updateEpisodeNifas(
  id: number,
  input:
    UpdateEpisodeNifasInput,
) {
  const lama =
    await ambilEpisodeNifasById(
      id,
    );

  if (!lama) {
    throw new Error(
      "Episode nifas tidak ditemukan.",
    );
  }

  const tanggalMulai =
    input.tanggalMulai ??
    lama.tanggalMulai;

  const tanggalSelesai =
    input.tanggalSelesai !==
    undefined
      ? input.tanggalSelesai
      : lama.tanggalSelesai;

  const tanggalMelahirkan =
    input.tanggalMelahirkan !==
    undefined
      ? input.tanggalMelahirkan ??
        tanggalMulai
      : lama.tanggalMelahirkan ??
        tanggalMulai;

  const episodeKehamilanId =
    input.episodeKehamilanId !==
    undefined
      ? input.episodeKehamilanId
      : lama.episodeKehamilanId;

  validasiTanggal(
    tanggalMulai,
    "Tanggal mulai nifas",
  );

  validasiTanggalOpsional(
    tanggalSelesai,
    "Tanggal selesai nifas",
  );

  validasiUrutanTanggal(
    tanggalMulai,
    tanggalSelesai,
    "tanggal mulai nifas",
    "Tanggal selesai nifas",
  );

  validasiTanggal(
    tanggalMelahirkan,
    "Tanggal melahirkan",
  );

  validasiTanggalMelahirkanNifas(
    tanggalMelahirkan,
    tanggalMulai,
  );

  validasiJam(
    input.jamBersalin,
  );

  const statusBaru =
    input.tanggalSelesai !==
      undefined &&
    lama.status !==
      "dibatalkan"
      ? input.tanggalSelesai ===
        null
        ? "aktif"
        : "selesai"
      : lama.status;

  if (
    statusBaru !==
    "dibatalkan"
  ) {
    await pastikanTidakAdaTumpangTindihNifas(
      lama.pesertaNik,
      tanggalMulai,
      tanggalSelesai,
      id,
    );
  }

  const kehamilan =
    await validasiKehamilanUntukNifas(
      lama.pesertaNik,
      episodeKehamilanId,
      id,
    );

  if (kehamilan) {
    validasiUrutanTanggal(
      kehamilan.tanggalMulai,
      tanggalMelahirkan,
      "tanggal mulai kehamilan",
      "Tanggal melahirkan",
    );
  }

  await db
    .update(
      episodeNifas,
    )
    .set({
      ...(input.episodeKehamilanId !==
      undefined
        ? {
            episodeKehamilanId:
              input.episodeKehamilanId,
          }
        : {}),
      ...(input.tanggalMulai !==
      undefined
        ? {
            tanggalMulai:
              input.tanggalMulai,
          }
        : {}),
      ...(input.tanggalSelesai !==
      undefined
        ? {
            tanggalSelesai:
              input.tanggalSelesai,
            status:
              statusBaru,
          }
        : {}),
      ...(input.tanggalMelahirkan !==
      undefined
        ? {
            tanggalMelahirkan:
              input.tanggalMelahirkan,
          }
        : {}),
      ...(input.jamBersalin !==
      undefined
        ? {
            jamBersalin:
              normalisasiText(
                input.jamBersalin,
              ),
          }
        : {}),
      ...(input.caraPersalinan !==
      undefined
        ? {
            caraPersalinan:
              input.caraPersalinan,
          }
        : {}),
      ...(input.vitaminA !==
      undefined
        ? {
            vitaminA:
              input.vitaminA,
          }
        : {}),
      ...(input.asiEksklusif !==
      undefined
        ? {
            asiEksklusif:
              input.asiEksklusif,
          }
        : {}),
      ...(input.catatan !==
      undefined
        ? {
            catatan:
              normalisasiText(
                input.catatan,
              ),
          }
        : {}),
      updatedAt:
        sql`CURRENT_TIMESTAMP`,
    })
    .where(
      eq(
        episodeNifas.id,
        id,
      ),
    );

  const hasil =
    await ambilDetailEpisodeNifas(
      id,
    );

  if (!hasil) {
    throw new Error(
      "Episode nifas gagal dibaca setelah update.",
    );
  }

  return hasil;
}

// ============================================================
// SELESAIKAN NIFAS
// ============================================================

export async function selesaikanEpisodeNifas(
  id: number,
  tanggalSelesai: string,
) {
  const lama =
    await ambilEpisodeNifasById(
      id,
    );

  if (!lama) {
    throw new Error(
      "Episode nifas tidak ditemukan.",
    );
  }

  if (
    lama.status !==
    "aktif"
  ) {
    throw new Error(
      "Hanya episode nifas aktif yang dapat diselesaikan.",
    );
  }

  validasiTanggal(
    tanggalSelesai,
    "Tanggal selesai nifas",
  );

  validasiUrutanTanggal(
    lama.tanggalMulai,
    tanggalSelesai,
    "tanggal mulai nifas",
    "Tanggal selesai nifas",
  );

  await db
    .update(
      episodeNifas,
    )
    .set({
      tanggalSelesai,

      status:
        "selesai",

      updatedAt:
        sql`CURRENT_TIMESTAMP`,
    })
    .where(
      eq(
        episodeNifas.id,
        id,
      ),
    );

  return ambilDetailEpisodeNifas(
    id,
  );
}

// ============================================================
// BATALKAN NIFAS
// ============================================================

export async function batalkanEpisodeNifas(
  id: number,
  tanggalSelesai?: string | null,
) {
  const lama =
    await ambilEpisodeNifasById(
      id,
    );

  if (!lama) {
    throw new Error(
      "Episode nifas tidak ditemukan.",
    );
  }

  if (
    lama.status !==
    "aktif"
  ) {
    throw new Error(
      "Hanya episode nifas aktif yang dapat dibatalkan.",
    );
  }

  if (
    tanggalSelesai
  ) {
    validasiTanggal(
      tanggalSelesai,
      "Tanggal selesai nifas",
    );
  }

  await db
    .update(
      episodeNifas,
    )
    .set({
      tanggalSelesai:
        tanggalSelesai ??
        lama.tanggalSelesai,

      status:
        "dibatalkan",

      updatedAt:
        sql`CURRENT_TIMESTAMP`,
    })
    .where(
      eq(
        episodeNifas.id,
        id,
      ),
    );

  return ambilDetailEpisodeNifas(
    id,
  );
}

// ============================================================
// TAMBAH TINDAKAN PERSALINAN
// ============================================================

export async function tambahTindakanPersalinan(
  episodeNifasId: number,
  input:
    TambahItemPersalinanInput,
) {
  const nifas =
    await ambilEpisodeNifasById(
      episodeNifasId,
    );

  if (!nifas) {
    throw new Error(
      "Episode nifas tidak ditemukan.",
    );
  }

  const kode =
    normalisasiText(
      input.kode,
    );

  const label =
    normalisasiText(
      input.label,
    );

  if (!kode) {
    throw new Error(
      "Kode tindakan wajib diisi.",
    );
  }

  if (!label) {
    throw new Error(
      "Label tindakan wajib diisi.",
    );
  }

  const rows =
    await db
      .insert(
        tindakanPersalinan,
      )
      .values({
        episodeNifasId,

        kode,

        label,

        catatan:
          normalisasiText(
            input.catatan,
          ),
      })
      .returning();

  const hasil =
    rows[0];

  if (!hasil) {
    throw new Error(
      "Tindakan persalinan gagal disimpan.",
    );
  }

  return hasil;
}

// ============================================================
// UPDATE TINDAKAN
// ============================================================

export async function updateTindakanPersalinan(
  id: number,
  input:
    UpdateItemPersalinanInput,
) {
  const rows =
    await db
      .select()
      .from(
        tindakanPersalinan,
      )
      .where(
        eq(
          tindakanPersalinan.id,
          id,
        ),
      )
      .limit(1);

  const lama =
    rows[0];

  if (!lama) {
    throw new Error(
      "Tindakan persalinan tidak ditemukan.",
    );
  }

  if (
    input.kode !==
    undefined &&
    !normalisasiText(
      input.kode,
    )
  ) {
    throw new Error(
      "Kode tindakan wajib diisi.",
    );
  }

  if (
    input.label !==
    undefined &&
    !normalisasiText(
      input.label,
    )
  ) {
    throw new Error(
      "Label tindakan wajib diisi.",
    );
  }

  await db
    .update(
      tindakanPersalinan,
    )
    .set({
      ...(input.kode !==
      undefined
        ? {
            kode:
              input.kode.trim(),
          }
        : {}),

      ...(input.label !==
      undefined
        ? {
            label:
              input.label.trim(),
          }
        : {}),

      ...(input.catatan !==
      undefined
        ? {
            catatan:
              normalisasiText(
                input.catatan,
              ),
          }
        : {}),
    })
    .where(
      eq(
        tindakanPersalinan.id,
        id,
      ),
    );

  const updated =
    await db
      .select()
      .from(
        tindakanPersalinan,
      )
      .where(
        eq(
          tindakanPersalinan.id,
          id,
        ),
      )
      .limit(1);

  return updated[0];
}

// ============================================================
// DELETE TINDAKAN
// ============================================================

export async function hapusTindakanPersalinan(
  id: number,
) {
  const rows =
    await db
      .select({
        id:
          tindakanPersalinan.id,
      })
      .from(
        tindakanPersalinan,
      )
      .where(
        eq(
          tindakanPersalinan.id,
          id,
        ),
      )
      .limit(1);

  if (
    rows.length ===
    0
  ) {
    throw new Error(
      "Tindakan persalinan tidak ditemukan.",
    );
  }

  await db
    .delete(
      tindakanPersalinan,
    )
    .where(
      eq(
        tindakanPersalinan.id,
        id,
      ),
    );

  return {
    id,
    berhasil: true,
  };
}

// ============================================================
// TAMBAH KOMPLIKASI
// ============================================================

export async function tambahKomplikasiPersalinan(
  episodeNifasId: number,
  input:
    TambahItemPersalinanInput,
) {
  const nifas =
    await ambilEpisodeNifasById(
      episodeNifasId,
    );

  if (!nifas) {
    throw new Error(
      "Episode nifas tidak ditemukan.",
    );
  }

  const kode =
    normalisasiText(
      input.kode,
    );

  const label =
    normalisasiText(
      input.label,
    );

  if (!kode) {
    throw new Error(
      "Kode komplikasi wajib diisi.",
    );
  }

  if (!label) {
    throw new Error(
      "Label komplikasi wajib diisi.",
    );
  }

  const rows =
    await db
      .insert(
        komplikasiPersalinan,
      )
      .values({
        episodeNifasId,

        kode,

        label,

        catatan:
          normalisasiText(
            input.catatan,
          ),
      })
      .returning();

  const hasil =
    rows[0];

  if (!hasil) {
    throw new Error(
      "Komplikasi persalinan gagal disimpan.",
    );
  }

  return hasil;
}

// ============================================================
// UPDATE KOMPLIKASI
// ============================================================

export async function updateKomplikasiPersalinan(
  id: number,
  input:
    UpdateItemPersalinanInput,
) {
  const rows =
    await db
      .select()
      .from(
        komplikasiPersalinan,
      )
      .where(
        eq(
          komplikasiPersalinan.id,
          id,
        ),
      )
      .limit(1);

  const lama =
    rows[0];

  if (!lama) {
    throw new Error(
      "Komplikasi persalinan tidak ditemukan.",
    );
  }

  if (
    input.kode !==
    undefined &&
    !normalisasiText(
      input.kode,
    )
  ) {
    throw new Error(
      "Kode komplikasi wajib diisi.",
    );
  }

  if (
    input.label !==
    undefined &&
    !normalisasiText(
      input.label,
    )
  ) {
    throw new Error(
      "Label komplikasi wajib diisi.",
    );
  }

  await db
    .update(
      komplikasiPersalinan,
    )
    .set({
      ...(input.kode !==
      undefined
        ? {
            kode:
              input.kode.trim(),
          }
        : {}),

      ...(input.label !==
      undefined
        ? {
            label:
              input.label.trim(),
          }
        : {}),

      ...(input.catatan !==
      undefined
        ? {
            catatan:
              normalisasiText(
                input.catatan,
              ),
          }
        : {}),
    })
    .where(
      eq(
        komplikasiPersalinan.id,
        id,
      ),
    );

  const updated =
    await db
      .select()
      .from(
        komplikasiPersalinan,
      )
      .where(
        eq(
          komplikasiPersalinan.id,
          id,
        ),
      )
      .limit(1);

  return updated[0];
}

// ============================================================
// DELETE KOMPLIKASI
// ============================================================

export async function hapusKomplikasiPersalinan(
  id: number,
) {
  const rows =
    await db
      .select({
        id:
          komplikasiPersalinan.id,
      })
      .from(
        komplikasiPersalinan,
      )
      .where(
        eq(
          komplikasiPersalinan.id,
          id,
        ),
      )
      .limit(1);

  if (
    rows.length ===
    0
  ) {
    throw new Error(
      "Komplikasi persalinan tidak ditemukan.",
    );
  }

  await db
    .delete(
      komplikasiPersalinan,
    )
    .where(
      eq(
        komplikasiPersalinan.id,
        id,
      ),
    );

  return {
    id,
    berhasil: true,
  };
}

// ============================================================
// RINGKASAN REPRODUKSI PESERTA
// ============================================================

export async function ambilReproduksiPeserta(
  pesertaNik: string,
) {
  const dataPeserta =
    await pastikanPesertaPerempuan(
      pesertaNik,
    );

  const kehamilan =
    await ambilRiwayatKehamilan(
      pesertaNik,
    );

  const nifas =
    await ambilRiwayatNifas(
      pesertaNik,
    );

  return {
    peserta:
      dataPeserta,

    kehamilan,

    nifas,

    kehamilanAktif:
      kehamilan.find(
        (item) =>
          item.status ===
          "aktif",
      ) ??
      null,

    nifasAktif:
      nifas.find(
        (item) =>
          item.status ===
          "aktif",
      ) ??
      null,
  };
}
