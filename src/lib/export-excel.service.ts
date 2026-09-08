import * as XLSX from "xlsx";

import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  ne,
  or,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  aturanIndikator,
  biodataAnak,
  biodataDewasa,
  episodeKehamilan,
  episodeNifas,
  hasilKonseling,
  hasilKonselingOpsi,
  hasilPemeriksaan,
  hasilPemeriksaanOpsi,
  hasilSkrining,
  indikator,
  komplikasiPersalinan,
  lokasi,
  opsiIndikator,
  peserta,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
  tindakanPersalinan,
} from "../db/schema.js";

import {
  notFound,
} from "./api-error.js";

import type {
  ExportPosgaQuery,
} from "../validation/export.schemas.js";

type Kategori =
  | "bayi"
  | "balita"
  | "prasekolah"
  | "sekolah"
  | "dewasa"
  | "lansia"
  | "ibu_hamil"
  | "ibu_nifas";

const KATEGORI: Array<{
  kode: Kategori;
  sheet: string;
  label: string;
}> = [
  {
    kode: "bayi",
    sheet: "Bayi",
    label: "Bayi",
  },
  {
    kode: "balita",
    sheet: "Balita",
    label: "Balita",
  },
  {
    kode: "prasekolah",
    sheet: "Prasekolah",
    label: "Prasekolah",
  },
  {
    kode: "sekolah",
    sheet: "Sekolah",
    label: "Sekolah",
  },
  {
    kode: "dewasa",
    sheet: "Dewasa",
    label: "Dewasa",
  },
  {
    kode: "lansia",
    sheet: "Lansia",
    label: "Lansia",
  },
  {
    kode: "ibu_hamil",
    sheet: "Ibu Hamil",
    label: "Ibu Hamil",
  },
  {
    kode: "ibu_nifas",
    sheet: "Ibu Nifas",
    label: "Ibu Nifas",
  },
];

function nilaiBoolean(
  value:
    | boolean
    | null
    | undefined,
) {
  if (value === true) {
    return "Ya";
  }

  if (value === false) {
    return "Tidak";
  }

  return "";
}

function tanggalIndonesia(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return "";
  }

  const [
    tahun,
    bulan,
    hari,
  ] =
    value
      .split("-")
      .map(Number);

  if (
    !tahun ||
    !bulan ||
    !hari
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(
    new Date(
      Date.UTC(
        tahun,
        bulan - 1,
        hari,
      ),
    ),
  );
}

function amanNamaFile(
  value: string,
) {
  return value
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    )
    .replace(
      /^-|-$|_/g,
      "",
    )
    .slice(
      0,
      50,
    ) ||
    "posyandu";
}

function nilaiHasil(
  row: {
    tipeInput: string;
    nilaiNumber:
      | number
      | null;
    nilaiText:
      | string
      | null;
    nilaiBoolean:
      | boolean
      | null;
    nilaiDate?:
      | string
      | null;
    opsiLabel?:
      | string
      | null;
  },
) {
  switch (
    row.tipeInput
  ) {
    case "number":
      return row.nilaiNumber ??
        "";

    case "text":
      return row.nilaiText ??
        "";

    case "boolean":
      return nilaiBoolean(
        row.nilaiBoolean,
      );

    case "date":
      return tanggalIndonesia(
        row.nilaiDate ??
          null,
      );

    case "select":
      return row.opsiLabel ??
        "";

    default:
      return row.opsiLabel ??
        row.nilaiText ??
        row.nilaiNumber ??
        "";
  }
}

function periodeLabel(
  query: ExportPosgaQuery,
) {
  if (
    query.tanggalMulai &&
    query.tanggalSelesai
  ) {
    return `${tanggalIndonesia(query.tanggalMulai)} s.d. ${tanggalIndonesia(query.tanggalSelesai)}`;
  }

  if (
    query.tanggalMulai
  ) {
    return `Mulai ${tanggalIndonesia(query.tanggalMulai)}`;
  }

  if (
    query.tanggalSelesai
  ) {
    return `Sampai ${tanggalIndonesia(query.tanggalSelesai)}`;
  }

  return "Seluruh periode";
}

function autoLebar(
  rows: unknown[][],
) {
  const maxCols =
    Math.max(
      0,
      ...rows.map(
        (row) =>
          row.length,
      ),
    );

  return Array.from(
    {
      length:
        maxCols,
    },
    (
      _,
      col,
    ) => {
      let width =
        10;

      for (
        const row of rows.slice(
          0,
          120,
        )
      ) {
        const value =
          row[col];

        const panjang =
          value ===
            null ||
          value ===
            undefined
            ? 0
            : String(
                value,
              ).length;

        width =
          Math.max(
            width,
            Math.min(
              panjang +
                2,
              col <
                12
                ? 28
                : 24,
            ),
          );
      }

      return {
        wch:
          width,
      };
    },
  );
}

export async function buatExportExcelPosga(
  query: ExportPosgaQuery,
) {
  const posyanduRows =
    await db
      .select({
        id:
          posyandu.id,
        nama:
          posyandu.nama,
        lokasiId:
          lokasi.id,
        lokasiNama:
          lokasi.nama,
      })
      .from(
        posyandu,
      )
      .innerJoin(
        lokasi,
        eq(
          lokasi.id,
          posyandu.lokasiId,
        ),
      )
      .where(
        eq(
          posyandu.id,
          query.posyanduId,
        ),
      )
      .limit(1);

  const tempat =
    posyanduRows[0];

  if (!tempat) {
    throw notFound(
      "Posyandu tidak ditemukan.",
    );
  }

  const kondisiSesi = [
    eq(
      sesiPosga.posyanduId,
      query.posyanduId,
    ),
    ne(
      sesiPosga.status,
      "dibatalkan",
    ),
  ];

  // Jika sesiId diberikan, export hanya mengambil satu sesi
  // yang dipilih dari halaman Rekap. Filter tanggal tetap
  // dipertahankan untuk kompatibilitas endpoint lama.
  if (
    query.sesiId
  ) {
    kondisiSesi.push(
      eq(
        sesiPosga.id,
        query.sesiId,
      ),
    );
  }

  if (
    query.tanggalMulai
  ) {
    kondisiSesi.push(
      gte(
        sesiPosga.tanggalPosga,
        query.tanggalMulai,
      ),
    );
  }

  if (
    query.tanggalSelesai
  ) {
    kondisiSesi.push(
      lte(
        sesiPosga.tanggalPosga,
        query.tanggalSelesai,
      ),
    );
  }

  const sesiRows =
    await db
      .select({
        sesiId:
          sesiPosga.id,
        tanggalPosga:
          sesiPosga.tanggalPosga,
        sesiStatus:
          sesiPosga.status,
        pesertaSesiId:
          pesertaSesiPosga.id,
        pesertaNik:
          peserta.nik,
        nama:
          peserta.nama,
        tanggalLahir:
          peserta.tanggalLahir,
        jenisKelamin:
          peserta.jenisKelamin,
        alamatDomisili:
          peserta.alamatDomisili,
        rtDomisili:
          peserta.rtDomisili,
        rwDomisili:
          peserta.rwDomisili,
        kategori:
          pesertaSesiPosga.kategoriSaatItu,
        statusPemeriksaan:
          pesertaSesiPosga.statusPemeriksaan,
      })
      .from(
        sesiPosga,
      )
      .innerJoin(
        pesertaSesiPosga,
        eq(
          pesertaSesiPosga.sesiPosgaId,
          sesiPosga.id,
        ),
      )
      .innerJoin(
        peserta,
        eq(
          peserta.nik,
          pesertaSesiPosga.pesertaNik,
        ),
      )
      .where(
        and(
          ...kondisiSesi,
        ),
      )
      .orderBy(
        asc(
          sesiPosga.tanggalPosga,
        ),
        asc(
          peserta.nama,
        ),
      );

  const dataDasar =
    query.kategori
      ? sesiRows.filter(
          (row) =>
            row.kategori ===
            query.kategori,
        )
      : sesiRows;

  const pesertaSesiIds =
    dataDasar.map(
      (row) =>
        row.pesertaSesiId,
    );

  const sesiIds = [
    ...new Set(
      dataDasar.map(
        (row) =>
          row.sesiId,
      ),
    ),
  ];

  const pesertaNiks = [
    ...new Set(
      dataDasar.map(
        (row) =>
          row.pesertaNik,
      ),
    ),
  ];

  const [
    pemeriksaanRows,
    skriningRows,
    konselingRows,
    biodataAnakRows,
    biodataDewasaRows,
    hamilRows,
    nifasRows,
  ] =
    await Promise.all([
      pesertaSesiIds.length
        ? db
            .select({
              hasilId:
                hasilPemeriksaan.id,
              pesertaSesiId:
                hasilPemeriksaan.pesertaSesiPosgaId,
              indikatorId:
                indikator.id,
              kode:
                indikator.kode,
              nama:
                indikator.nama,
              kelompok:
                indikator.kelompok,
              tipeInput:
                indikator.tipeInput,
              satuan:
                indikator.satuan,
              nilaiNumber:
                hasilPemeriksaan.nilaiNumber,
              nilaiText:
                hasilPemeriksaan.nilaiText,
              nilaiBoolean:
                hasilPemeriksaan.nilaiBoolean,
              nilaiDate:
                hasilPemeriksaan.nilaiDate,
              opsiLabel:
                opsiIndikator.label,
            })
            .from(
              hasilPemeriksaan,
            )
            .innerJoin(
              indikator,
              eq(
                indikator.id,
                hasilPemeriksaan.indikatorId,
              ),
            )
            .leftJoin(
              opsiIndikator,
              eq(
                opsiIndikator.id,
                hasilPemeriksaan.opsiId,
              ),
            )
            .where(
              inArray(
                hasilPemeriksaan.pesertaSesiPosgaId,
                pesertaSesiIds,
              ),
            )
        : [],

      sesiIds.length &&
      pesertaNiks.length
        ? db
            .select({
              hasilId:
                hasilSkrining.id,
              pesertaNik:
                hasilSkrining.pesertaNik,
              sesiId:
                hasilSkrining.sesiPosgaId,
              indikatorId:
                indikator.id,
              kode:
                indikator.kode,
              nama:
                indikator.nama,
              kelompok:
                indikator.kelompok,
              tipeInput:
                indikator.tipeInput,
              satuan:
                indikator.satuan,
              nilaiNumber:
                hasilSkrining.nilaiNumber,
              nilaiText:
                hasilSkrining.nilaiText,
              nilaiBoolean:
                hasilSkrining.nilaiBoolean,
              opsiLabel:
                opsiIndikator.label,
            })
            .from(
              hasilSkrining,
            )
            .innerJoin(
              indikator,
              eq(
                indikator.id,
                hasilSkrining.indikatorId,
              ),
            )
            .leftJoin(
              opsiIndikator,
              eq(
                opsiIndikator.id,
                hasilSkrining.opsiId,
              ),
            )
            .where(
              and(
                inArray(
                  hasilSkrining.sesiPosgaId,
                  sesiIds,
                ),
                inArray(
                  hasilSkrining.pesertaNik,
                  pesertaNiks,
                ),
                eq(
                  hasilSkrining.sumber,
                  "posga",
                ),
              ),
            )
        : [],

      pesertaSesiIds.length
        ? db
            .select({
              hasilId:
                hasilKonseling.id,
              pesertaSesiId:
                hasilKonseling.pesertaSesiPosgaId,
              indikatorId:
                indikator.id,
              kode:
                indikator.kode,
              nama:
                indikator.nama,
              kelompok:
                indikator.kelompok,
              tipeInput:
                indikator.tipeInput,
              satuan:
                indikator.satuan,
              opsiLabel:
                opsiIndikator.label,
              catatan:
                hasilKonseling.catatan,
            })
            .from(
              hasilKonseling,
            )
            .innerJoin(
              indikator,
              eq(
                indikator.id,
                hasilKonseling.indikatorId,
              ),
            )
            .leftJoin(
              opsiIndikator,
              eq(
                opsiIndikator.id,
                hasilKonseling.opsiId,
              ),
            )
            .where(
              inArray(
                hasilKonseling.pesertaSesiPosgaId,
                pesertaSesiIds,
              ),
            )
        : [],

      pesertaNiks.length
        ? db
            .select()
            .from(
              biodataAnak,
            )
            .where(
              inArray(
                biodataAnak.pesertaNik,
                pesertaNiks,
              ),
            )
        : [],

      pesertaNiks.length
        ? db
            .select()
            .from(
              biodataDewasa,
            )
            .where(
              inArray(
                biodataDewasa.pesertaNik,
                pesertaNiks,
              ),
            )
        : [],

      pesertaNiks.length
        ? db
            .select()
            .from(
              episodeKehamilan,
            )
            .where(
              inArray(
                episodeKehamilan.pesertaNik,
                pesertaNiks,
              ),
            )
        : [],

      pesertaNiks.length
        ? db
            .select()
            .from(
              episodeNifas,
            )
            .where(
              inArray(
                episodeNifas.pesertaNik,
                pesertaNiks,
              ),
            )
        : [],
    ]);

  const pemeriksaanIds =
    pemeriksaanRows.map(
      (row) =>
        row.hasilId,
    );

  const konselingIds =
    konselingRows.map(
      (row) =>
        row.hasilId,
    );

  const [
    pemeriksaanOpsiRows,
    konselingOpsiRows,
    tindakanRows,
    komplikasiRows,
  ] =
    await Promise.all([
      pemeriksaanIds.length
        ? db
            .select({
              hasilId:
                hasilPemeriksaanOpsi.hasilPemeriksaanId,
              label:
                opsiIndikator.label,
            })
            .from(
              hasilPemeriksaanOpsi,
            )
            .innerJoin(
              opsiIndikator,
              eq(
                opsiIndikator.id,
                hasilPemeriksaanOpsi.opsiId,
              ),
            )
            .where(
              inArray(
                hasilPemeriksaanOpsi.hasilPemeriksaanId,
                pemeriksaanIds,
              ),
            )
        : [],

      konselingIds.length
        ? db
            .select({
              hasilId:
                hasilKonselingOpsi.hasilKonselingId,
              label:
                opsiIndikator.label,
            })
            .from(
              hasilKonselingOpsi,
            )
            .innerJoin(
              opsiIndikator,
              eq(
                opsiIndikator.id,
                hasilKonselingOpsi.opsiId,
              ),
            )
            .where(
              inArray(
                hasilKonselingOpsi.hasilKonselingId,
                konselingIds,
              ),
            )
        : [],

      nifasRows.length
        ? db
            .select()
            .from(
              tindakanPersalinan,
            )
            .where(
              inArray(
                tindakanPersalinan.episodeNifasId,
                nifasRows.map(
                  (row) =>
                    row.id,
                ),
              ),
            )
        : [],

      nifasRows.length
        ? db
            .select()
            .from(
              komplikasiPersalinan,
            )
            .where(
              inArray(
                komplikasiPersalinan.episodeNifasId,
                nifasRows.map(
                  (row) =>
                    row.id,
                ),
              ),
            )
        : [],
    ]);

  const opsiPemeriksaanMap =
    new Map<
      number,
      string[]
    >();

  for (
    const row of
    pemeriksaanOpsiRows
  ) {
    const current =
      opsiPemeriksaanMap.get(
        row.hasilId,
      ) ??
      [];

    current.push(
      row.label,
    );

    opsiPemeriksaanMap.set(
      row.hasilId,
      current,
    );
  }

  const opsiKonselingMap =
    new Map<
      number,
      string[]
    >();

  for (
    const row of
    konselingOpsiRows
  ) {
    const current =
      opsiKonselingMap.get(
        row.hasilId,
      ) ??
      [];

    current.push(
      row.label,
    );

    opsiKonselingMap.set(
      row.hasilId,
      current,
    );
  }

  const biodataAnakMap =
    new Map(
      biodataAnakRows.map(
        (row) => [
          row.pesertaNik,
          row,
        ],
      ),
    );

  const biodataDewasaMap =
    new Map(
      biodataDewasaRows.map(
        (row) => [
          row.pesertaNik,
          row,
        ],
      ),
    );

  const tindakanMap =
    new Map<
      number,
      string[]
    >();

  for (
    const row of
    tindakanRows
  ) {
    const current =
      tindakanMap.get(
        row.episodeNifasId,
      ) ??
      [];

    current.push(
      row.label,
    );

    tindakanMap.set(
      row.episodeNifasId,
      current,
    );
  }

  const komplikasiMap =
    new Map<
      number,
      string[]
    >();

  for (
    const row of
    komplikasiRows
  ) {
    const current =
      komplikasiMap.get(
        row.episodeNifasId,
      ) ??
      [];

    current.push(
      row.label,
    );

    komplikasiMap.set(
      row.episodeNifasId,
      current,
    );
  }

  const hasilMap =
    new Map<
      string,
      Map<
        string,
        unknown
      >
    >();

  function bucket(
    key: string,
  ) {
    const existing =
      hasilMap.get(
        key,
      );

    if (existing) {
      return existing;
    }

    const created =
      new Map<
        string,
        unknown
      >();

    hasilMap.set(
      key,
      created,
    );

    return created;
  }

  for (
    const row of
    pemeriksaanRows
  ) {
    const value =
      row.tipeInput ===
        "multiselect"
        ? (
            opsiPemeriksaanMap.get(
              row.hasilId,
            ) ??
            []
          ).join(", ")
        : nilaiHasil(
            row,
          );

    bucket(
      `ps:${row.pesertaSesiId}`,
    ).set(
      row.kode,
      value,
    );
  }

  for (
    const row of
    skriningRows
  ) {
    if (
      row.sesiId ===
      null
    ) {
      continue;
    }

    bucket(
      `sk:${row.sesiId}:${row.pesertaNik}`,
    ).set(
      row.kode,
      nilaiHasil({
        ...row,
        nilaiDate:
          null,
      }),
    );
  }

  for (
    const row of
    konselingRows
  ) {
    const opsi =
      opsiKonselingMap.get(
        row.hasilId,
      ) ??
      [];

    const labels =
      opsi.length
        ? opsi
        : row.opsiLabel
          ? [
              row.opsiLabel,
            ]
          : [];

    const value =
      labels.length
        ? labels.join(
            ", ",
          )
        : row.catatan ??
          "";

    bucket(
      `ps:${row.pesertaSesiId}`,
    ).set(
      row.kode,
      value,
    );
  }

  const rules =
    await db
      .select({
        kategori:
          aturanIndikator.kategori,
        kode:
          indikator.kode,
        nama:
          indikator.nama,
        kelompok:
          indikator.kelompok,
        satuan:
          indikator.satuan,
        urutan:
          indikator.urutanDefault,
      })
      .from(
        aturanIndikator,
      )
      .innerJoin(
        indikator,
        eq(
          indikator.id,
          aturanIndikator.indikatorId,
        ),
      )
      .where(
        and(
          eq(
            aturanIndikator.aktif,
            true,
          ),
          eq(
            indikator.aktif,
            true,
          ),
        ),
      )
      .orderBy(
        asc(
          indikator.kelompok,
        ),
        asc(
          indikator.urutanDefault,
        ),
        asc(
          indikator.nama,
        ),
      );

  const workbook =
    XLSX.utils.book_new();

  const infoRows: unknown[][] =
    [
      [
        "POSGA - EXPORT DATA POSYANDU",
      ],
      [
        "Lokasi",
        tempat.lokasiNama,
      ],
      [
        "Posyandu",
        tempat.nama,
      ],
      [
        "Periode",
        periodeLabel(
          query,
        ),
      ],
      [
        "Dibuat",
        new Date().toLocaleString(
          "id-ID",
          {
            timeZone:
              "Asia/Jakarta",
          },
        ),
      ],
      [],
      [
        "Kategori",
        "Jumlah Baris",
      ],
    ];

  for (
    const definisi of
    KATEGORI
  ) {
    if (
      query.kategori &&
      query.kategori !==
        definisi.kode
    ) {
      continue;
    }

    infoRows.push([
      definisi.label,
      dataDasar.filter(
        (row) =>
          row.kategori ===
          definisi.kode,
      ).length,
    ]);
  }

  const infoSheet =
    XLSX.utils.aoa_to_sheet(
      infoRows,
    );

  infoSheet["!cols"] = [
    {
      wch: 22,
    },
    {
      wch: 36,
    },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    infoSheet,
    "Ringkasan",
  );

  for (
    const definisi of
    KATEGORI
  ) {
    if (
      query.kategori &&
      query.kategori !==
        definisi.kode
    ) {
      continue;
    }

    const pesertaRows =
      dataDasar.filter(
        (row) =>
          row.kategori ===
          definisi.kode,
      );

    const indikatorKategori =
      rules
        .filter(
          (row) =>
            row.kategori ===
            definisi.kode,
        )
        .filter(
          (
            row,
            index,
            self,
          ) =>
            self.findIndex(
              (x) =>
                x.kode ===
                row.kode,
            ) ===
            index,
        );

    const baseHeaders = [
      "Tanggal POSGA",
      "NIK",
      "Nama",
      "Tanggal Lahir",
      "Jenis Kelamin",
      "Alamat Domisili",
      "RT",
      "RW",
      "Status Pemeriksaan",
    ];

    const childHeaders =
      [
        "bayi",
        "balita",
        "prasekolah",
        "sekolah",
      ].includes(
        definisi.kode,
      )
        ? [
            "Nama Ibu Kandung",
            "NIK Ibu Kandung",
            "Anak Ke",
          ]
        : [];

    const adultHeaders =
      [
        "dewasa",
        "lansia",
        "ibu_hamil",
        "ibu_nifas",
      ].includes(
        definisi.kode,
      )
        ? [
            "Nama Pasangan",
            "NIK Pasangan",
            "Jumlah Anak",
            "KB",
          ]
        : [];

    const reproHeaders =
      definisi.kode ===
        "ibu_hamil"
        ? [
            "HPHT",
            "HPL",
            "BB Sebelum Hamil (kg)",
            "TB Awal (cm)",
            "LiLA Awal (cm)",
            "Status Kehamilan",
          ]
        : definisi.kode ===
            "ibu_nifas"
          ? [
              "Tanggal Melahirkan",
              "Jam Bersalin",
              "Cara Persalinan",
              "Vitamin A",
              "ASI Eksklusif",
              "Tindakan Persalinan",
              "Komplikasi Persalinan",
              "Status Nifas",
            ]
          : [];

    const indicatorHeaders =
      indikatorKategori.map(
        (item) => {
          const kelompok =
            item.kelompok ===
              "pemeriksaan"
              ? "Pemeriksaan"
              : item.kelompok ===
                  "skrining"
                ? "Skrining"
                : "Konseling";

          const unit =
            item.satuan
              ? ` (${item.satuan})`
              : "";

          return `${kelompok} | ${item.nama}${unit}`;
        },
      );

    const header = [
      ...baseHeaders,
      ...childHeaders,
      ...adultHeaders,
      ...reproHeaders,
      ...indicatorHeaders,
    ];

    const rows: unknown[][] =
      [
        [
          `POSGA - ${definisi.label.toUpperCase()}`,
        ],
        [
          "Lokasi",
          tempat.lokasiNama,
        ],
        [
          "Posyandu",
          tempat.nama,
        ],
        [
          "Periode",
          periodeLabel(
            query,
          ),
        ],
        [],
        header,
      ];

    for (
      const row of
      pesertaRows
    ) {
      const nilai =
        new Map<
          string,
          unknown
        >();

      const pemeriksaan =
        hasilMap.get(
          `ps:${row.pesertaSesiId}`,
        );

      const skrining =
        hasilMap.get(
          `sk:${row.sesiId}:${row.pesertaNik}`,
        );

      for (
        const [
          key,
          value,
        ] of (
          pemeriksaan ??
          new Map()
        )
      ) {
        nilai.set(
          key,
          value,
        );
      }

      for (
        const [
          key,
          value,
        ] of (
          skrining ??
          new Map()
        )
      ) {
        nilai.set(
          key,
          value,
        );
      }

      const anak =
        biodataAnakMap.get(
          row.pesertaNik,
        );

      const dewasa =
        biodataDewasaMap.get(
          row.pesertaNik,
        );

      const kehamilan =
        hamilRows.find(
          (item) =>
            item.pesertaNik ===
              row.pesertaNik &&
            item.tanggalMulai <=
              row.tanggalPosga &&
            (
              item.tanggalSelesai ===
                null ||
              item.tanggalSelesai >=
                row.tanggalPosga
            ),
        );

      const nifas =
        nifasRows.find(
          (item) =>
            item.pesertaNik ===
              row.pesertaNik &&
            item.tanggalMulai <=
              row.tanggalPosga &&
            (
              item.tanggalSelesai ===
                null ||
              item.tanggalSelesai >=
                row.tanggalPosga
            ),
        );

      const baseValues = [
        tanggalIndonesia(
          row.tanggalPosga,
        ),
        row.pesertaNik,
        row.nama,
        tanggalIndonesia(
          row.tanggalLahir,
        ),
        row.jenisKelamin ===
          "L"
          ? "Laki-laki"
          : "Perempuan",
        row.alamatDomisili ??
          "",
        row.rtDomisili ??
          "",
        row.rwDomisili ??
          "",
        row.statusPemeriksaan,
      ];

      const childValues =
        childHeaders.length
          ? [
              anak?.namaIbuKandung ??
                "",
              anak?.nikIbuKandung ??
                "",
              anak?.anakKe ??
                "",
            ]
          : [];

      const adultValues =
        adultHeaders.length
          ? [
              dewasa?.namaPasangan ??
                "",
              dewasa?.nikPasangan ??
                "",
              dewasa?.jumlahAnak ??
                "",
              dewasa?.kbYangDiikuti ??
                "",
            ]
          : [];

      const reproValues =
        definisi.kode ===
          "ibu_hamil"
          ? [
              tanggalIndonesia(
                kehamilan?.hpht,
              ),
              tanggalIndonesia(
                kehamilan?.hpl,
              ),
              kehamilan?.bbSebelumHamilKg ??
                "",
              kehamilan?.tbCm ??
                "",
              kehamilan?.lilaAwalCm ??
                "",
              kehamilan?.status ??
                "",
            ]
          : definisi.kode ===
              "ibu_nifas"
            ? [
                tanggalIndonesia(
                  nifas?.tanggalMelahirkan,
                ),
                nifas?.jamBersalin ??
                  "",
                nifas?.caraPersalinan ??
                  "",
                nilaiBoolean(
                  nifas?.vitaminA,
                ),
                nilaiBoolean(
                  nifas?.asiEksklusif,
                ),
                nifas
                  ? (
                      tindakanMap.get(
                        nifas.id,
                      ) ??
                      []
                    ).join(", ")
                  : "",
                nifas
                  ? (
                      komplikasiMap.get(
                        nifas.id,
                      ) ??
                      []
                    ).join(", ")
                  : "",
                nifas?.status ??
                  "",
              ]
            : [];

      rows.push([
        ...baseValues,
        ...childValues,
        ...adultValues,
        ...reproValues,
        ...indikatorKategori.map(
          (item) =>
            nilai.get(
              item.kode,
            ) ??
            "",
        ),
      ]);
    }

    const sheet =
      XLSX.utils.aoa_to_sheet(
        rows,
      );

    const lastColumn =
      Math.max(
        0,
        header.length -
          1,
      );

    sheet["!merges"] = [
      {
        s: {
          r: 0,
          c: 0,
        },
        e: {
          r: 0,
          c:
            lastColumn,
        },
      },
    ];

    sheet["!autofilter"] = {
      ref:
        XLSX.utils.encode_range({
          s: {
            r: 5,
            c: 0,
          },
          e: {
            r: Math.max(
              5,
              rows.length -
                1,
            ),
            c:
              lastColumn,
          },
        }),
    };

    sheet["!cols"] =
      autoLebar(
        rows,
      );

    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      definisi.sheet,
    );
  }

  const buffer =
    XLSX.write(
      workbook,
      {
        type: "buffer",
        bookType: "xlsx",
        compression: true,
      },
    ) as Buffer;

  const sesiTerpilih =
    query.sesiId &&
    dataDasar.length > 0
      ? dataDasar[0]
      : null;

  const periode =
    sesiTerpilih
      ? `-${sesiTerpilih.tanggalPosga}-sesi-${sesiTerpilih.sesiId}`
      : query.tanggalMulai ||
          query.tanggalSelesai
        ? `-${query.tanggalMulai ?? "awal"}-${query.tanggalSelesai ?? "akhir"}`
        : "";

  return {
    buffer,
    filename:
      `POSGA-${amanNamaFile(tempat.nama)}${periode}.xlsx`,
    jumlahBaris:
      dataDasar.length,
  };
}
