import ExcelJS from "@ayocore/exceljs";

import type {
  Cell,
  Worksheet,
} from "@ayocore/exceljs";

import {
  and,
  asc,
  eq,
  gte,
  inArray,
  lte,
  ne,
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

const WARNA = {
  hijauTua: "FF2F6B3B",
  hijau: "FF70AD47",
  hijauMuda: "FFE2F0D9",
  hijauSangatMuda: "FFF3F8EF",
  biru: "FF5B9BD5",
  biruMuda: "FFDDEBF7",
  kuningMuda: "FFFFF2CC",
  abu: "FFE7E6E6",
  abuGelap: "FF7F7F7F",
  putih: "FFFFFFFF",
  hitam: "FF000000",
  garis: "FFB7B7B7",
} as const;

function tanggalIndonesiaPanjang(
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
  ] = value
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
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  )
    .format(
      new Date(
        Date.UTC(
          tahun,
          bulan - 1,
          hari,
        ),
      ),
    )
    .toUpperCase();
}

function isiSolid(
  cell: Cell,
  argb: string,
) {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb,
    },
  };
}

function beriBorder(
  cell: Cell,
) {
  cell.border = {
    top: {
      style: "thin",
      color: {
        argb: WARNA.garis,
      },
    },
    left: {
      style: "thin",
      color: {
        argb: WARNA.garis,
      },
    },
    bottom: {
      style: "thin",
      color: {
        argb: WARNA.garis,
      },
    },
    right: {
      style: "thin",
      color: {
        argb: WARNA.garis,
      },
    },
  };
}

function warnaKelompok(
  kelompok: string,
) {
  if (
    kelompok ===
    "skrining"
  ) {
    return WARNA.biruMuda;
  }

  if (
    kelompok ===
    "konseling"
  ) {
    return WARNA.kuningMuda;
  }

  return WARNA.hijauMuda;
}

function lebarIndikator(
  nama: string,
  satuan:
    | string
    | null,
) {
  const panjang =
    `${nama}${satuan ?? ""}`
      .length;

  return Math.max(
    12,
    Math.min(
      22,
      Math.ceil(
        panjang *
          0.72,
      ),
    ),
  );
}

function formatWorksheetUmum(
  worksheet: Worksheet,
) {
  worksheet.properties.defaultRowHeight =
    18;

  worksheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: false,
    verticalCentered: false,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };

  worksheet.headerFooter.oddFooter =
    "&LExport POSGA&CPage &P dari &N&R&D &T";
}

function setNilaiCell(
  cell: Cell,
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    cell.value = "";
    return;
  }

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    cell.value = value;
    return;
  }

  cell.value = String(
    value,
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
        noRm:
          peserta.noRm,
        noTelp:
          peserta.noTelp,
        tanggalLahir:
          peserta.tanggalLahir,
        alamatKtp:
          peserta.alamatKtp,
        rtKtp:
          peserta.rtKtp,
        rwKtp:
          peserta.rwKtp,
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
    new ExcelJS.Workbook();

  workbook.creator =
    "POSGA";
  workbook.lastModifiedBy =
    "POSGA";
  workbook.created =
    new Date();
  workbook.modified =
    new Date();
  workbook.calcProperties.fullCalcOnLoad =
    true;

  const infoSheet =
    workbook.addWorksheet(
      "Ringkasan",
      {
        views: [
          {
            state:
              "frozen",
            ySplit: 7,
          },
        ],
      },
    );

  formatWorksheetUmum(
    infoSheet,
  );

  infoSheet.pageSetup.orientation =
    "portrait";

  infoSheet.mergeCells(
    "A1:D1",
  );

  const infoTitle =
    infoSheet.getCell(
      "A1",
    );

  infoTitle.value =
    "POSGA - EXPORT DATA POSYANDU";
  infoTitle.font = {
    bold: true,
    color: {
      argb:
        WARNA.putih,
    },
    size: 16,
  };
  infoTitle.alignment = {
    horizontal:
      "center",
    vertical:
      "middle",
  };
  isiSolid(
    infoTitle,
    WARNA.hijauTua,
  );
  infoSheet.getRow(1).height =
    28;

  const ringkasanMeta: Array<[
    string,
    string,
  ]> = [
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
  ];

  ringkasanMeta.forEach(
    (
      [
        label,
        value,
      ],
      index,
    ) => {
      const row =
        index +
        2;

      infoSheet.getCell(
        row,
        1,
      ).value =
        label;
      infoSheet.getCell(
        row,
        2,
      ).value =
        value;
      infoSheet.mergeCells(
        row,
        2,
        row,
        4,
      );

      const labelCell =
        infoSheet.getCell(
          row,
          1,
        );

      labelCell.font = {
        bold: true,
      };
      isiSolid(
        labelCell,
        WARNA.hijauMuda,
      );

      for (
        let col = 1;
        col <= 4;
        col += 1
      ) {
        const cell =
          infoSheet.getCell(
            row,
            col,
          );

        beriBorder(
          cell,
        );
        cell.alignment = {
          vertical:
            "middle",
          wrapText: true,
        };
      }
    },
  );

  const ringkasanHeaderRow =
    7;

  [
    "Kategori",
    "Peserta Unik",
    "Kunjungan",
    "Tanggal Sesi",
  ].forEach(
    (
      value,
      index,
    ) => {
      const cell =
        infoSheet.getCell(
          ringkasanHeaderRow,
          index +
            1,
        );

      cell.value =
        value;
      cell.font = {
        bold: true,
        color: {
          argb:
            WARNA.putih,
        },
      };
      cell.alignment = {
        horizontal:
          "center",
        vertical:
          "middle",
        wrapText: true,
      };
      isiSolid(
        cell,
        WARNA.hijauTua,
      );
      beriBorder(
        cell,
      );
    },
  );

  let ringkasanRow =
    ringkasanHeaderRow +
    1;

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

    const kategoriRows =
      dataDasar.filter(
        (row) =>
          row.kategori ===
          definisi.kode,
      );

    const pesertaUnik =
      new Set(
        kategoriRows.map(
          (row) =>
            row.pesertaNik,
        ),
      ).size;

    const tanggalUnik =
      new Set(
        kategoriRows.map(
          (row) =>
            row.tanggalPosga,
        ),
      ).size;

    const values: unknown[] = [
      definisi.label,
      pesertaUnik,
      kategoriRows.length,
      tanggalUnik,
    ];

    values.forEach(
      (
        value,
        index,
      ) => {
        const cell =
          infoSheet.getCell(
            ringkasanRow,
            index +
              1,
          );

        setNilaiCell(
          cell,
          value,
        );
        beriBorder(
          cell,
        );
        cell.alignment = {
          vertical:
            "middle",
          horizontal:
            index ===
              0
              ? "left"
              : "center",
        };
      },
    );

    ringkasanRow +=
      1;
  }

  infoSheet.getColumn(1).width =
    24;
  infoSheet.getColumn(2).width =
    24;
  infoSheet.getColumn(3).width =
    18;
  infoSheet.getColumn(4).width =
    18;
  infoSheet.autoFilter = {
    from: {
      row:
        ringkasanHeaderRow,
      column: 1,
    },
    to: {
      row:
        Math.max(
          ringkasanHeaderRow,
          ringkasanRow -
            1,
        ),
      column: 4,
    },
  };

  const GROUP_HEADER_ROW =
    6;
  const SUBHEADER_ROW =
    7;
  const DATA_START_ROW =
    8;

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

    const baseHeaders: Array<{
      key: string;
      label: string;
      width: number;
    }> = [
      {
        key: "no",
        label: "NO",
        width: 6,
      },
      {
        key: "nik",
        label: "NIK",
        width: 20,
      },
      {
        key: "nama",
        label: "NAMA",
        width: 28,
      },
      {
        key: "noRm",
        label: "NO. RM",
        width: 14,
      },
      {
        key: "noTelp",
        label: "NO. TELP",
        width: 16,
      },
      {
        key: "tanggalLahir",
        label: "TANGGAL LAHIR",
        width: 16,
      },
      {
        key: "jenisKelamin",
        label: "JENIS KELAMIN",
        width: 16,
      },
      {
        key: "alamatKtp",
        label: "ALAMAT KTP",
        width: 30,
      },
      {
        key: "rtKtp",
        label: "RT KTP",
        width: 9,
      },
      {
        key: "rwKtp",
        label: "RW KTP",
        width: 9,
      },
      {
        key: "alamatDomisili",
        label: "ALAMAT DOMISILI",
        width: 30,
      },
      {
        key: "rtDomisili",
        label: "RT DOM.",
        width: 9,
      },
      {
        key: "rwDomisili",
        label: "RW DOM.",
        width: 9,
      },
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
            {
              key:
                "namaIbuKandung",
              label:
                "NAMA IBU KANDUNG",
              width: 26,
            },
            {
              key:
                "nikIbuKandung",
              label:
                "NIK IBU KANDUNG",
              width: 20,
            },
            {
              key:
                "anakKe",
              label:
                "ANAK KE",
              width: 10,
            },
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
            {
              key:
                "namaPasangan",
              label:
                "NAMA PASANGAN",
              width: 26,
            },
            {
              key:
                "nikPasangan",
              label:
                "NIK PASANGAN",
              width: 20,
            },
            {
              key:
                "jumlahAnak",
              label:
                "JUMLAH ANAK",
              width: 13,
            },
            {
              key:
                "kbYangDiikuti",
              label:
                "KB YANG DIIKUTI",
              width: 20,
            },
          ]
        : [];

    const reproHeaders =
      definisi.kode ===
        "ibu_hamil"
        ? [
            {
              key:
                "hpht",
              label:
                "HPHT",
              width: 15,
            },
            {
              key:
                "hpl",
              label:
                "HPL",
              width: 15,
            },
            {
              key:
                "bbSebelumHamil",
              label:
                "BB SEBELUM HAMIL (KG)",
              width: 20,
            },
            {
              key:
                "tbAwal",
              label:
                "TB AWAL (CM)",
              width: 16,
            },
            {
              key:
                "lilaAwal",
              label:
                "LILA AWAL (CM)",
              width: 16,
            },
            {
              key:
                "statusKehamilan",
              label:
                "STATUS KEHAMILAN",
              width: 18,
            },
          ]
        : definisi.kode ===
            "ibu_nifas"
          ? [
              {
                key:
                  "tanggalMelahirkan",
                label:
                  "TANGGAL MELAHIRKAN",
                width: 18,
              },
              {
                key:
                  "jamBersalin",
                label:
                  "JAM BERSALIN",
                width: 14,
              },
              {
                key:
                  "caraPersalinan",
                label:
                  "CARA PERSALINAN",
                width: 20,
              },
              {
                key:
                  "vitaminA",
                label:
                  "VITAMIN A",
                width: 12,
              },
              {
                key:
                  "asiEksklusif",
                label:
                  "ASI EKSKLUSIF",
                width: 15,
              },
              {
                key:
                  "tindakanPersalinan",
                label:
                  "TINDAKAN PERSALINAN",
                width: 26,
              },
              {
                key:
                  "komplikasiPersalinan",
                label:
                  "KOMPLIKASI PERSALINAN",
                width: 26,
              },
              {
                key:
                  "statusNifas",
                label:
                  "STATUS NIFAS",
                width: 16,
              },
            ]
          : [];

    const staticHeaders = [
      ...baseHeaders,
      ...childHeaders,
      ...adultHeaders,
      ...reproHeaders,
    ];

    const tanggalSesi = [
      ...new Set(
        pesertaRows.map(
          (row) =>
            row.tanggalPosga,
        ),
      ),
    ].sort();

    const pesertaMap =
      new Map<
        string,
        {
          utama:
            (typeof pesertaRows)[number];
          sesi:
            Map<
              string,
              (typeof pesertaRows)[number]
            >;
        }
      >();

    for (
      const row of
      pesertaRows
    ) {
      const current =
        pesertaMap.get(
          row.pesertaNik,
        );

      if (current) {
        current.sesi.set(
          row.tanggalPosga,
          row,
        );
        continue;
      }

      pesertaMap.set(
        row.pesertaNik,
        {
          utama:
            row,
          sesi:
            new Map([
              [
                row.tanggalPosga,
                row,
              ],
            ]),
        },
      );
    }

    const pesertaUnik = [
      ...pesertaMap.values(),
    ].sort(
      (
        a,
        b,
      ) =>
        a.utama.nama.localeCompare(
          b.utama.nama,
          "id-ID",
        ),
    );

    const indicatorBlock = [
      {
        kode:
          "__STATUS_PEMERIKSAAN__",
        nama:
          "STATUS PEMERIKSAAN",
        kelompok:
          "status",
        satuan:
          null,
      },
      ...indikatorKategori,
    ];

    const worksheet =
      workbook.addWorksheet(
        definisi.sheet,
      );

    formatWorksheetUmum(
      worksheet,
    );

    worksheet.pageSetup.printTitlesRow =
      "1:7";

    const totalColumns =
      Math.max(
        staticHeaders.length,
        staticHeaders.length +
          tanggalSesi.length *
            indicatorBlock.length,
      );

    worksheet.mergeCells(
      1,
      1,
      1,
      totalColumns,
    );

    const titleCell =
      worksheet.getCell(
        1,
        1,
      );

    titleCell.value =
      `POSGA - ${definisi.label.toUpperCase()}`;
    titleCell.font = {
      bold: true,
      color: {
        argb:
          WARNA.putih,
      },
      size: 16,
    };
    titleCell.alignment = {
      horizontal:
        "center",
      vertical:
        "middle",
    };
    isiSolid(
      titleCell,
      WARNA.hijauTua,
    );
    worksheet.getRow(1).height =
      28;

    const meta: Array<[
      string,
      string,
    ]> = [
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
        "Peserta",
        `${pesertaUnik.length} peserta unik / ${pesertaRows.length} kunjungan`,
      ],
    ];

    meta.forEach(
      (
        [
          label,
          value,
        ],
        index,
      ) => {
        const rowNumber =
          index +
          2;

        worksheet.getCell(
          rowNumber,
          1,
        ).value =
          label;
        worksheet.getCell(
          rowNumber,
          1,
        ).font = {
          bold: true,
        };
        isiSolid(
          worksheet.getCell(
            rowNumber,
            1,
          ),
          WARNA.hijauMuda,
        );

        const mergeEnd =
          Math.min(
            totalColumns,
            Math.max(
              4,
              staticHeaders.length,
            ),
          );

        worksheet.mergeCells(
          rowNumber,
          2,
          rowNumber,
          mergeEnd,
        );
        worksheet.getCell(
          rowNumber,
          2,
        ).value =
          value;

        for (
          let col = 1;
          col <= mergeEnd;
          col += 1
        ) {
          const cell =
            worksheet.getCell(
              rowNumber,
              col,
            );

          beriBorder(
            cell,
          );
          cell.alignment = {
            vertical:
              "middle",
            wrapText: true,
          };
        }
      },
    );

    if (
      staticHeaders.length >
      0
    ) {
      worksheet.mergeCells(
        GROUP_HEADER_ROW,
        1,
        GROUP_HEADER_ROW,
        staticHeaders.length,
      );

      const biodataGroupCell =
        worksheet.getCell(
          GROUP_HEADER_ROW,
          1,
        );

      biodataGroupCell.value =
        "IDENTITAS / BIODATA PESERTA";
      biodataGroupCell.font = {
        bold: true,
        color: {
          argb:
            WARNA.putih,
        },
      };
      biodataGroupCell.alignment = {
        horizontal:
          "center",
        vertical:
          "middle",
      };
      isiSolid(
        biodataGroupCell,
        WARNA.abuGelap,
      );
    }

    staticHeaders.forEach(
      (
        header,
        index,
      ) => {
        const col =
          index +
          1;
        const cell =
          worksheet.getCell(
            SUBHEADER_ROW,
            col,
          );

        cell.value =
          header.label;
        cell.font = {
          bold: true,
        };
        cell.alignment = {
          horizontal:
            "center",
          vertical:
            "middle",
          wrapText: true,
        };
        isiSolid(
          cell,
          WARNA.abu,
        );
        beriBorder(
          cell,
        );
        worksheet.getColumn(
          col,
        ).width =
          header.width;
      },
    );

    let currentColumn =
      staticHeaders.length +
      1;

    for (
      const tanggal of
      tanggalSesi
    ) {
      const startColumn =
        currentColumn;
      const endColumn =
        startColumn +
        indicatorBlock.length -
        1;

      worksheet.mergeCells(
        GROUP_HEADER_ROW,
        startColumn,
        GROUP_HEADER_ROW,
        endColumn,
      );

      const dateCell =
        worksheet.getCell(
          GROUP_HEADER_ROW,
          startColumn,
        );

      dateCell.value =
        `POSGA TANGGAL ${tanggalIndonesiaPanjang(tanggal)}`;
      dateCell.font = {
        bold: true,
        color: {
          argb:
            WARNA.putih,
        },
      };
      dateCell.alignment = {
        horizontal:
          "center",
        vertical:
          "middle",
        wrapText: true,
      };
      isiSolid(
        dateCell,
        WARNA.hijauTua,
      );

      indicatorBlock.forEach(
        (
          item,
          indicatorIndex,
        ) => {
          const col =
            startColumn +
            indicatorIndex;
          const cell =
            worksheet.getCell(
              SUBHEADER_ROW,
              col,
            );

          const unit =
            item.satuan
              ? ` (${item.satuan})`
              : "";

          cell.value =
            item.kode ===
              "__STATUS_PEMERIKSAAN__"
              ? item.nama
              : `${item.nama}${unit}`;
          cell.font = {
            bold: true,
            size: 10,
          };
          cell.alignment = {
            horizontal:
              "center",
            vertical:
              "middle",
            wrapText: true,
          };
          isiSolid(
            cell,
            item.kelompok ===
              "status"
              ? WARNA.abu
              : warnaKelompok(
                  item.kelompok,
                ),
          );
          beriBorder(
            cell,
          );
          worksheet.getColumn(
            col,
          ).width =
            item.kode ===
              "__STATUS_PEMERIKSAAN__"
              ? 16
              : lebarIndikator(
                  item.nama,
                  item.satuan,
                );
        },
      );

      currentColumn =
        endColumn +
        1;
    }

    worksheet.getRow(
      GROUP_HEADER_ROW,
    ).height =
      24;
    worksheet.getRow(
      SUBHEADER_ROW,
    ).height =
      42;

    for (
      let col = 1;
      col <= totalColumns;
      col += 1
    ) {
      beriBorder(
        worksheet.getCell(
          GROUP_HEADER_ROW,
          col,
        ),
      );
      beriBorder(
        worksheet.getCell(
          SUBHEADER_ROW,
          col,
        ),
      );
    }

    pesertaUnik.forEach(
      (
        participant,
        participantIndex,
      ) => {
        const rowNumber =
          DATA_START_ROW +
          participantIndex;
        const row =
          participant.utama;
        const anak =
          biodataAnakMap.get(
            row.pesertaNik,
          );
        const dewasa =
          biodataDewasaMap.get(
            row.pesertaNik,
          );

        const sesiPertama = [
          ...participant.sesi.values(),
        ].sort(
          (
            a,
            b,
          ) =>
            a.tanggalPosga.localeCompare(
              b.tanggalPosga,
            ),
        )[0] ??
          row;

        const kehamilan =
          hamilRows.find(
            (item) =>
              item.pesertaNik ===
                row.pesertaNik &&
              item.tanggalMulai <=
                sesiPertama.tanggalPosga &&
              (
                item.tanggalSelesai ===
                  null ||
                item.tanggalSelesai >=
                  sesiPertama.tanggalPosga
              ),
          );

        const nifas =
          nifasRows.find(
            (item) =>
              item.pesertaNik ===
                row.pesertaNik &&
              item.tanggalMulai <=
                sesiPertama.tanggalPosga &&
              (
                item.tanggalSelesai ===
                  null ||
                item.tanggalSelesai >=
                  sesiPertama.tanggalPosga
              ),
          );

        const staticValues =
          new Map<
            string,
            unknown
          >([
            [
              "no",
              participantIndex +
                1,
            ],
            [
              "nik",
              row.pesertaNik,
            ],
            [
              "nama",
              row.nama,
            ],
            [
              "noRm",
              row.noRm ??
                "",
            ],
            [
              "noTelp",
              row.noTelp ??
                "",
            ],
            [
              "tanggalLahir",
              tanggalIndonesia(
                row.tanggalLahir,
              ),
            ],
            [
              "jenisKelamin",
              row.jenisKelamin ===
                "L"
                ? "Laki-laki"
                : "Perempuan",
            ],
            [
              "alamatKtp",
              row.alamatKtp ??
                "",
            ],
            [
              "rtKtp",
              row.rtKtp ??
                "",
            ],
            [
              "rwKtp",
              row.rwKtp ??
                "",
            ],
            [
              "alamatDomisili",
              row.alamatDomisili ??
                "",
            ],
            [
              "rtDomisili",
              row.rtDomisili ??
                "",
            ],
            [
              "rwDomisili",
              row.rwDomisili ??
                "",
            ],
            [
              "namaIbuKandung",
              anak?.namaIbuKandung ??
                "",
            ],
            [
              "nikIbuKandung",
              anak?.nikIbuKandung ??
                "",
            ],
            [
              "anakKe",
              anak?.anakKe ??
                "",
            ],
            [
              "namaPasangan",
              dewasa?.namaPasangan ??
                "",
            ],
            [
              "nikPasangan",
              dewasa?.nikPasangan ??
                "",
            ],
            [
              "jumlahAnak",
              dewasa?.jumlahAnak ??
                "",
            ],
            [
              "kbYangDiikuti",
              dewasa?.kbYangDiikuti ??
                "",
            ],
            [
              "hpht",
              tanggalIndonesia(
                kehamilan?.hpht,
              ),
            ],
            [
              "hpl",
              tanggalIndonesia(
                kehamilan?.hpl,
              ),
            ],
            [
              "bbSebelumHamil",
              kehamilan?.bbSebelumHamilKg ??
                "",
            ],
            [
              "tbAwal",
              kehamilan?.tbCm ??
                "",
            ],
            [
              "lilaAwal",
              kehamilan?.lilaAwalCm ??
                "",
            ],
            [
              "statusKehamilan",
              kehamilan?.status ??
                "",
            ],
            [
              "tanggalMelahirkan",
              tanggalIndonesia(
                nifas?.tanggalMelahirkan,
              ),
            ],
            [
              "jamBersalin",
              nifas?.jamBersalin ??
                "",
            ],
            [
              "caraPersalinan",
              nifas?.caraPersalinan ??
                "",
            ],
            [
              "vitaminA",
              nilaiBoolean(
                nifas?.vitaminA,
              ),
            ],
            [
              "asiEksklusif",
              nilaiBoolean(
                nifas?.asiEksklusif,
              ),
            ],
            [
              "tindakanPersalinan",
              nifas
                ? (
                    tindakanMap.get(
                      nifas.id,
                    ) ??
                    []
                  ).join(
                    ", ",
                  )
                : "",
            ],
            [
              "komplikasiPersalinan",
              nifas
                ? (
                    komplikasiMap.get(
                      nifas.id,
                    ) ??
                    []
                  ).join(
                    ", ",
                  )
                : "",
            ],
            [
              "statusNifas",
              nifas?.status ??
                "",
            ],
          ]);

        staticHeaders.forEach(
          (
            header,
            index,
          ) => {
            const cell =
              worksheet.getCell(
                rowNumber,
                index +
                  1,
              );

            setNilaiCell(
              cell,
              staticValues.get(
                header.key,
              ) ??
                "",
            );
            beriBorder(
              cell,
            );
            cell.alignment = {
              vertical:
                "top",
              horizontal:
                header.key ===
                  "no"
                  ? "center"
                  : "left",
              wrapText: true,
            };
          },
        );

        let dataColumn =
          staticHeaders.length +
          1;

        for (
          const tanggal of
          tanggalSesi
        ) {
          const sesi =
            participant.sesi.get(
              tanggal,
            );

          let nilai =
            new Map<
              string,
              unknown
            >();

          if (sesi) {
            nilai =
              new Map();

            const pemeriksaan =
              hasilMap.get(
                `ps:${sesi.pesertaSesiId}`,
              );
            const skrining =
              hasilMap.get(
                `sk:${sesi.sesiId}:${sesi.pesertaNik}`,
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
          }

          indicatorBlock.forEach(
            (
              item,
              indicatorIndex,
            ) => {
              const cell =
                worksheet.getCell(
                  rowNumber,
                  dataColumn +
                    indicatorIndex,
                );

              const value =
                item.kode ===
                  "__STATUS_PEMERIKSAAN__"
                  ? sesi?.statusPemeriksaan ??
                    ""
                  : nilai.get(
                      item.kode,
                    ) ??
                    "";

              setNilaiCell(
                cell,
                value,
              );
              beriBorder(
                cell,
              );
              cell.alignment = {
                vertical:
                  "top",
                horizontal:
                  typeof value ===
                    "number"
                    ? "center"
                    : "left",
                wrapText: true,
              };

              if (
                participantIndex %
                  2 ===
                1
              ) {
                isiSolid(
                  cell,
                  WARNA.hijauSangatMuda,
                );
              }
            },
          );

          dataColumn +=
            indicatorBlock.length;
        }

        if (
          participantIndex %
            2 ===
          1
        ) {
          staticHeaders.forEach(
            (
              _,
              index,
            ) => {
              isiSolid(
                worksheet.getCell(
                  rowNumber,
                  index +
                    1,
                ),
                WARNA.hijauSangatMuda,
              );
            },
          );
        }
      },
    );

    const lastDataRow =
      Math.max(
        SUBHEADER_ROW,
        DATA_START_ROW +
          pesertaUnik.length -
          1,
      );

    worksheet.autoFilter = {
      from: {
        row:
          SUBHEADER_ROW,
        column: 1,
      },
      to: {
        row:
          lastDataRow,
        column:
          totalColumns,
      },
    };

    worksheet.views = [
      {
        state:
          "frozen",
        // Hanya NO, NIK, dan NAMA (kolom A-C) yang tetap terlihat.
        xSplit: 3,
        ySplit:
          SUBHEADER_ROW,
        topLeftCell:
          worksheet.getCell(
            DATA_START_ROW,
            4,
          ).address,
      },
    ];
  }

  const excelBuffer =
    await workbook.xlsx.writeBuffer();

  const buffer =
    Buffer.from(
      excelBuffer,
    );

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
