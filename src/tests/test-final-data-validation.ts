import {
  and,
  asc,
  count,
  eq,
  inArray,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  aturanIndikator,
  episodeKehamilan,
  episodeNifas,
  hasilKonseling,
  hasilPemeriksaan,
  hasilSkrining,
  indikator,
  peserta,
  pesertaPosyandu,
  pesertaSesiPosga,
  sesiPosga,
} from "../db/schema.js";

import {
  tentukanKategoriPemeriksaan,
} from "../lib/sesi-posga.service.js";

type Temuan = {
  level:
    | "ERROR"
    | "WARNING";
  kode: string;
  pesan: string;
};

const temuan: Temuan[] =
  [];

function error(
  kode: string,
  pesan: string,
) {
  temuan.push({
    level: "ERROR",
    kode,
    pesan,
  });
}

function warning(
  kode: string,
  pesan: string,
) {
  temuan.push({
    level: "WARNING",
    kode,
    pesan,
  });
}

function tanggalValid(
  value:
    | string
    | null,
) {
  if (!value) {
    return true;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return false;
  }

  const y =
    Number(
      match[1],
    );
  const m =
    Number(
      match[2],
    );
  const d =
    Number(
      match[3],
    );

  const date =
    new Date(
      Date.UTC(
        y,
        m - 1,
        d,
      ),
    );

  return (
    date.getUTCFullYear() ===
      y &&
    date.getUTCMonth() ===
      m - 1 &&
    date.getUTCDate() ===
      d
  );
}

function overlap(
  aStart: string,
  aEnd: string | null,
  bStart: string,
  bEnd: string | null,
) {
  const akhirA =
    aEnd ??
    "9999-12-31";
  const akhirB =
    bEnd ??
    "9999-12-31";

  return (
    aStart <=
      akhirB &&
    bStart <=
      akhirA
  );
}

async function main() {
  console.log(
    "========================================",
  );
  console.log(
    "POSGA FINAL DATA VALIDATION 13.1",
  );
  console.log(
    "========================================",
  );

  const [
    pesertaRows,
    keanggotaanRows,
    sesiRows,
    pesertaSesiRows,
    kehamilanRows,
    nifasRows,
    indikatorRows,
    aturanRows,
  ] =
    await Promise.all([
      db
        .select()
        .from(
          peserta,
        ),
      db
        .select()
        .from(
          pesertaPosyandu,
        )
        .orderBy(
          asc(
            pesertaPosyandu.pesertaNik,
          ),
          asc(
            pesertaPosyandu.tanggalMulai,
          ),
        ),
      db
        .select()
        .from(
          sesiPosga,
        ),
      db
        .select()
        .from(
          pesertaSesiPosga,
        ),
      db
        .select()
        .from(
          episodeKehamilan,
        ),
      db
        .select()
        .from(
          episodeNifas,
        ),
      db
        .select()
        .from(
          indikator,
        ),
      db
        .select()
        .from(
          aturanIndikator,
        ),
    ]);

  // ==========================================================
  // TANGGAL DAN MASTER PESERTA
  // ==========================================================

  for (
    const row of
    pesertaRows
  ) {
    if (
      !tanggalValid(
        row.tanggalLahir,
      )
    ) {
      error(
        "PESERTA_TANGGAL_LAHIR",
        `${row.nik}: tanggal lahir tidak valid.`,
      );
    }
  }

  // ==========================================================
  // KEANGGOTAAN POSYANDU
  // ==========================================================

  const byNik =
    new Map<
      string,
      typeof keanggotaanRows
    >();

  for (
    const row of
    keanggotaanRows
  ) {
    const list =
      byNik.get(
        row.pesertaNik,
      ) ??
      [];

    list.push(
      row,
    );

    byNik.set(
      row.pesertaNik,
      list,
    );

    if (
      !tanggalValid(
        row.tanggalMulai,
      ) ||
      !tanggalValid(
        row.tanggalSelesai,
      )
    ) {
      error(
        "KEANGGOTAAN_TANGGAL",
        `${row.pesertaNik}: periode keanggotaan tidak valid.`,
      );
    }

    if (
      row.tanggalSelesai &&
      row.tanggalMulai >
        row.tanggalSelesai
    ) {
      error(
        "KEANGGOTAAN_PERIODE",
        `${row.pesertaNik}: tanggal mulai setelah tanggal selesai.`,
      );
    }
  }

  for (
    const [
      nik,
      list,
    ] of byNik
  ) {
    const aktif =
      list.filter(
        (row) =>
          row.aktif,
      );

    if (
      aktif.length >
      1
    ) {
      error(
        "KEANGGOTAAN_AKTIF_GANDA",
        `${nik}: memiliki ${aktif.length} keanggotaan aktif.`,
      );
    }

    for (
      let i = 0;
      i <
      list.length;
      i++
    ) {
      for (
        let j =
          i + 1;
        j <
        list.length;
        j++
      ) {
        const a =
          list[i];
        const b =
          list[j];

        if (
          a &&
          b &&
          overlap(
            a.tanggalMulai,
            a.tanggalSelesai,
            b.tanggalMulai,
            b.tanggalSelesai,
          )
        ) {
          error(
            "KEANGGOTAAN_OVERLAP",
            `${nik}: periode keanggotaan ID ${a.id} dan ${b.id} bertumpang tindih.`,
          );
        }
      }
    }
  }

  for (
    const row of
    pesertaRows.filter(
      (x) => x.aktif,
    )
  ) {
    const aktif =
      (
        byNik.get(
          row.nik,
        ) ??
        []
      ).filter(
        (x) =>
          x.aktif,
      );

    if (
      aktif.length ===
      0
    ) {
      warning(
        "PESERTA_TANPA_POSYANDU",
        `${row.nik} ${row.nama}: peserta aktif belum memiliki Posyandu aktif.`,
      );
    }
  }

  // ==========================================================
  // SESI + PESERTA SESI
  // ==========================================================

  const sesiMap =
    new Map(
      sesiRows.map(
        (row) => [
          row.id,
          row,
        ],
      ),
    );

  const pesertaMap =
    new Map(
      pesertaRows.map(
        (row) => [
          row.nik,
          row,
        ],
      ),
    );

  for (
    const sesi of
    sesiRows
  ) {
    if (
      !tanggalValid(
        sesi.tanggalPosga,
      )
    ) {
      error(
        "SESI_TANGGAL",
        `Sesi ${sesi.id}: tanggal POSGA tidak valid.`,
      );
    }
  }

  for (
    const row of
    pesertaSesiRows
  ) {
    const sesi =
      sesiMap.get(
        row.sesiPosgaId,
      );

    const p =
      pesertaMap.get(
        row.pesertaNik,
      );

    if (
      !sesi ||
      !p
    ) {
      error(
        "PESERTA_SESI_REFERENSI",
        `Peserta sesi ${row.id}: referensi sesi/peserta tidak ditemukan.`,
      );
      continue;
    }

    const memberships =
      byNik.get(
        row.pesertaNik,
      ) ??
      [];

    const membership =
      memberships.find(
        (m) =>
          m.posyanduId ===
            sesi.posyanduId &&
          m.tanggalMulai <=
            sesi.tanggalPosga &&
          (
            m.tanggalSelesai ===
              null ||
            m.tanggalSelesai >=
              sesi.tanggalPosga
          ),
      );

    if (
      !membership
    ) {
      error(
        "PESERTA_SESI_POSYANDU",
        `Peserta sesi ${row.id}: ${row.pesertaNik} tidak memiliki keanggotaan Posyandu yang berlaku pada ${sesi.tanggalPosga}.`,
      );
    }

    try {
      const kategori =
        await tentukanKategoriPemeriksaan(
          row.pesertaNik,
          p.tanggalLahir,
          p.jenisKelamin,
          sesi.tanggalPosga,
        );

      if (
        kategori.kategori !==
        row.kategoriSaatItu
      ) {
        error(
          "KATEGORI_SNAPSHOT",
          `Peserta sesi ${row.id}: snapshot ${row.kategoriSaatItu}, seharusnya ${kategori.kategori}.`,
        );
      }
    } catch (
      err
    ) {
      error(
        "KATEGORI_HITUNG",
        `Peserta sesi ${row.id}: gagal menghitung kategori (${err instanceof Error ? err.message : "error"}).`,
      );
    }
  }

  // ==========================================================
  // EPISODE REPRODUKSI
  // ==========================================================

  async function validasiEpisode(
    label: string,
    rows: Array<{
      id: number;
      pesertaNik: string;
      tanggalMulai: string;
      tanggalSelesai: string | null;
      status: "aktif" | "selesai" | "dibatalkan";
    }>,
  ) {
    const groups =
      new Map<
        string,
        Array<{
          id: number;
          pesertaNik: string;
          tanggalMulai: string;
          tanggalSelesai: string | null;
          status: "aktif" | "selesai" | "dibatalkan";
        }>
      >();

    for (
      const row of rows
    ) {
      const list =
        groups.get(
          row.pesertaNik,
        ) ??
        [];

      list.push(
        row,
      );

      groups.set(
        row.pesertaNik,
        list,
      );

      if (
        !tanggalValid(
          row.tanggalMulai,
        ) ||
        !tanggalValid(
          row.tanggalSelesai,
        )
      ) {
        error(
          "REPRO_TANGGAL",
          `${label} ID ${row.id}: periode tidak valid.`,
        );
      }

      if (
        row.tanggalSelesai &&
        row.tanggalMulai >
          row.tanggalSelesai
      ) {
        error(
          "REPRO_PERIODE",
          `${label} ID ${row.id}: tanggal mulai setelah tanggal selesai.`,
        );
      }
    }

    for (
      const [
        nik,
        list,
      ] of groups
    ) {
      const aktif =
        list.filter(
          (x) =>
            x.status ===
            "aktif",
        );

      if (
        aktif.length >
        1
      ) {
        error(
          "REPRO_AKTIF_GANDA",
          `${nik}: memiliki ${aktif.length} episode ${label} aktif.`,
        );
      }
    }
  }

  await validasiEpisode(
    "kehamilan",
    kehamilanRows,
  );

  await validasiEpisode(
    "nifas",
    nifasRows,
  );

  // ==========================================================
  // HASIL KLINIS HARUS SESUAI KELOMPOK INDIKATOR
  // ==========================================================

  const indikatorMap =
    new Map(
      indikatorRows.map(
        (row) => [
          row.id,
          row,
        ],
      ),
    );

  const pemeriksaanRows =
    await db
      .select()
      .from(
        hasilPemeriksaan,
      );

  for (
    const row of
    pemeriksaanRows
  ) {
    const ind =
      indikatorMap.get(
        row.indikatorId,
      );

    if (
      ind?.kelompok !==
      "pemeriksaan"
    ) {
      error(
        "HASIL_PEMERIKSAAN_KELOMPOK",
        `Hasil pemeriksaan ${row.id}: indikator bukan kelompok pemeriksaan.`,
      );
    }

    const punyaNilai =
      row.nilaiNumber !==
        null ||
      row.nilaiText !==
        null ||
      row.nilaiBoolean !==
        null ||
      row.nilaiDate !==
        null ||
      row.opsiId !==
        null;

    if (
      !punyaNilai &&
      ind?.tipeInput !==
        "multiselect"
    ) {
      warning(
        "HASIL_PEMERIKSAAN_KOSONG",
        `Hasil pemeriksaan ${row.id}: baris tersimpan tanpa nilai.`,
      );
    }
  }

  const skriningRows =
    await db
      .select()
      .from(
        hasilSkrining,
      );

  for (
    const row of
    skriningRows
  ) {
    const ind =
      indikatorMap.get(
        row.indikatorId,
      );

    if (
      ind?.kelompok !==
      "skrining"
    ) {
      error(
        "HASIL_SKRINING_KELOMPOK",
        `Hasil skrining ${row.id}: indikator bukan kelompok skrining.`,
      );
    }

    if (
      row.sumber ===
        "posga" &&
      row.sesiPosgaId ===
        null
    ) {
      error(
        "SKRINING_POSGA_TANPA_SESI",
        `Hasil skrining ${row.id}: sumber POSGA tanpa sesi.`,
      );
    }

    if (
      row.sumber ===
        "eksternal" &&
      row.sesiPosgaId !==
        null
    ) {
      error(
        "SKRINING_EKSTERNAL_DENGAN_SESI",
        `Hasil skrining ${row.id}: sumber eksternal masih memiliki sesi POSGA.`,
      );
    }
  }

  const konselingRows =
    await db
      .select()
      .from(
        hasilKonseling,
      );

  for (
    const row of
    konselingRows
  ) {
    const ind =
      indikatorMap.get(
        row.indikatorId,
      );

    if (
      ind?.kelompok !==
      "konseling"
    ) {
      error(
        "HASIL_KONSELING_KELOMPOK",
        `Hasil konseling ${row.id}: indikator bukan kelompok konseling.`,
      );
    }
  }

  // ==========================================================
  // RULE MASTER
  // ==========================================================

  const ruleKey =
    new Set<string>();

  for (
    const row of
    aturanRows
  ) {
    if (
      row.kategori ===
      null
    ) {
      warning(
        "RULE_TANPA_KATEGORI",
        `Aturan ${row.id}: kategori kosong.`,
      );
    }

    const key =
      `${row.indikatorId}|${row.kategori}|${row.frekuensi}|${row.jenisKelamin ?? ""}|${row.usiaMinBulan ?? ""}|${row.usiaMaxBulan ?? ""}`;

    if (
      ruleKey.has(
        key,
      )
    ) {
      warning(
        "RULE_DUPLIKAT",
        `Aturan ${row.id}: definisi rule tampak duplikat.`,
      );
    }

    ruleKey.add(
      key,
    );
  }

  // ==========================================================
  // OUTPUT
  // ==========================================================

  const errors =
    temuan.filter(
      (x) =>
        x.level ===
        "ERROR",
    );

  const warnings =
    temuan.filter(
      (x) =>
        x.level ===
        "WARNING",
    );

  console.log(
    "",
  );
  console.log(
    `Peserta            : ${pesertaRows.length}`,
  );
  console.log(
    `Keanggotaan        : ${keanggotaanRows.length}`,
  );
  console.log(
    `Sesi               : ${sesiRows.length}`,
  );
  console.log(
    `Peserta sesi       : ${pesertaSesiRows.length}`,
  );
  console.log(
    `Pemeriksaan        : ${pemeriksaanRows.length}`,
  );
  console.log(
    `Skrining           : ${skriningRows.length}`,
  );
  console.log(
    `Konseling          : ${konselingRows.length}`,
  );
  console.log(
    `ERROR              : ${errors.length}`,
  );
  console.log(
    `WARNING            : ${warnings.length}`,
  );

  for (
    const item of
    temuan.slice(
      0,
      100,
    )
  ) {
    console.log(
      `${item.level} [${item.kode}] ${item.pesan}`,
    );
  }

  if (
    temuan.length >
    100
  ) {
    console.log(
      `... ${temuan.length - 100} temuan lain tidak ditampilkan.`,
    );
  }

  if (
    errors.length >
    0
  ) {
    throw new Error(
      `Final data validation gagal: ${errors.length} error.`,
    );
  }

  console.log(
    "",
  );
  console.log(
    "FINAL DATA VALIDATION PASS",
  );
}

main()
  .catch(
    (err) => {
      console.error(
        err,
      );
      process.exit(
        1,
      );
    },
  );
