import {
  and,
  asc,
  eq,
  inArray,
  ne,
} from "drizzle-orm";

import { db } from "./db/index.js";

import {
  peserta,
  pesertaSesiPosga,
  sesiPosga,
} from "./db/schema.js";

import {
  ambilFormPesertaTerpadu,
  sinkronkanStatusPemeriksaanPeserta,
} from "./lib/form-peserta.service.js";

import {
  tambahHasilPemeriksaan,
} from "./lib/pemeriksaan.service.js";

import {
  tambahHasilSkrining,
} from "./lib/skrining.service.js";

import {
  tambahHasilKonseling,
} from "./lib/konseling.service.js";

// ============================================================
// POSGA - SEED HEALTH VARIANTS
//
// Tujuan:
// - Mengisi data kesehatan untuk seluruh kategori.
// - Membuat kombinasi normal / borderline / abnormal.
// - Mengisi pemeriksaan, skrining, dan konseling sesuai Rule Engine.
// - Derived TIDAK diinput manual; kalkulator POSGA tetap menghitung.
// - Aman dijalankan ulang: item yang sudah terisi dilewati.
//
// Jalankan setelah:
//   1. migration
//   2. seed-indikator-posga
//   3. seed-demo
//
// Command:
//   npx tsx src/seed-health-variants.ts
// ============================================================

type ItemInputUntukSeed = {
  kode: string;
  tipeInput: string;
  opsi: Array<{
    id: number;
  }>;
};

function angka(
  nilai: number,
  variasi: number,
  step = 1,
) {
  return nilai + ((variasi % 3) - 1) * step;
}

function nilaiKlinis(
  kode: string,
  kategori: string,
  variasi: number,
): number | null {
  const mode = variasi % 4;

  switch (kode) {
    case "BB":
      if (kategori === "bayi") return angka(8.2, variasi, 0.7);
      if (kategori === "balita") return angka(15.5, variasi, 1.2);
      if (kategori === "prasekolah") return angka(21, variasi, 2);
      if (kategori === "sekolah") return angka(42, variasi, 4);
      if (kategori === "dewasa") return [52, 62, 74, 88][mode] ?? 62;
      if (kategori === "lansia") return [48, 58, 70, 82][mode] ?? 58;
      if (kategori === "ibu_hamil") return [54, 60, 68, 78][mode] ?? 60;
      if (kategori === "ibu_nifas") return [53, 59, 67, 76][mode] ?? 59;
      return 60;

    case "PB":
      if (kategori === "bayi") return angka(68, variasi, 3);
      if (kategori === "balita") return angka(84, variasi, 4);
      return 80;

    case "TB":
      if (kategori === "balita") return angka(94, variasi, 4);
      if (kategori === "prasekolah") return angka(116, variasi, 5);
      if (kategori === "sekolah") return angka(150, variasi, 8);
      if (kategori === "dewasa") return [150, 158, 165, 172][mode] ?? 160;
      if (kategori === "lansia") return [148, 155, 162, 168][mode] ?? 158;
      if (kategori === "ibu_hamil") return [150, 156, 162, 168][mode] ?? 158;
      if (kategori === "ibu_nifas") return [150, 157, 164, 169][mode] ?? 158;
      return 160;

    case "LIKA":
      if (kategori === "bayi") return angka(43, variasi, 1.2);
      if (kategori === "balita") return angka(48, variasi, 1.4);
      return angka(50, variasi, 1);

    case "LILA":
      if (kategori === "bayi") return [10.8, 11.8, 12.8, 13.5][mode] ?? 12.8;
      if (kategori === "balita") return [11.2, 12.0, 13.1, 14.2][mode] ?? 13.1;
      if (kategori === "ibu_hamil") return [21.5, 22.8, 24.5, 27][mode] ?? 24.5;
      return [22, 24, 27, 31][mode] ?? 27;

    case "LIPE":
      if (kategori === "dewasa" || kategori === "lansia") {
        return [72, 82, 94, 108][mode] ?? 82;
      }
      return [55, 65, 75, 85][mode] ?? 65;

    case "TD_SISTOLIK":
      return [110, 135, 150, 182][mode] ?? 110;

    case "TD_DIASTOLIK":
      return [70, 88, 96, 112][mode] ?? 70;

    case "GDA":
      return [110, 155, 205, 280][mode] ?? 110;

    case "HB":
      if (kategori === "ibu_hamil") return [12.2, 10.7, 9.2, 6.8][mode] ?? 12.2;
      return [13.2, 11.7, 9.6, 7.2][mode] ?? 13.2;

    default:
      return null;
  }
}

function payloadUntukItem(
  item: ItemInputUntukSeed,
  kategori: string,
  tanggalPosga: string,
  variasi: number,
) {
  const khusus = nilaiKlinis(
    item.kode,
    kategori,
    variasi,
  );

  if (khusus !== null && item.tipeInput === "number") {
    return {
      nilaiNumber: khusus,
    };
  }

  if (item.tipeInput === "number") {
    return {
      nilaiNumber: 1 + (variasi % 5),
    };
  }

  if (item.tipeInput === "boolean") {
    return {
      nilaiBoolean:
        variasi % 3 !== 0,
    };
  }

  if (item.tipeInput === "date") {
    return {
      nilaiDate: tanggalPosga,
    };
  }

  if (item.tipeInput === "text") {
    return {
      nilaiText:
        `Data variasi ${variasi + 1}`,
    };
  }

  if (item.tipeInput === "select") {
    const opsi = item.opsi[
      variasi % Math.max(item.opsi.length, 1)
    ];

    if (!opsi) return null;

    return {
      opsiId: opsi.id,
    };
  }

  if (item.tipeInput === "multiselect") {
    if (item.opsi.length === 0) {
      return null;
    }

    const pertama =
      item.opsi[variasi % item.opsi.length];

    const kedua =
      item.opsi[
        (variasi + 1) % item.opsi.length
      ];

    const ids = [
      pertama?.id,
      kedua?.id,
    ].filter(
      (id): id is number =>
        typeof id === "number",
    );

    return {
      opsiIds:
        Array.from(new Set(ids)),
    };
  }

  return null;
}

async function isiPemeriksaan(
  form: Awaited<
    ReturnType<typeof ambilFormPesertaTerpadu>
  >,
  variasi: number,
) {
  for (const item of form.pemeriksaan) {
    if (
      item.statusKelayakan !== "tampil" ||
      item.derived ||
      item.hasilSaatIni
    ) {
      continue;
    }

    const payload =
      payloadUntukItem(
        item,
        form.kategori,
        form.tanggalPosga,
        variasi,
      );

    if (!payload) continue;

    try {
      await tambahHasilPemeriksaan({
        pesertaSesiPosgaId:
          form.pesertaSesiId,
        indikatorId:
          item.indikatorId,
        ...payload,
        catatan:
          `Seed kesehatan varian ${variasi + 1}`,
      });
    } catch (error) {
      console.warn(
        `[pemeriksaan] ${form.nama} / ${item.kode}:`,
        error instanceof Error
          ? error.message
          : error,
      );
    }
  }
}

async function isiSkrining(
  form: Awaited<
    ReturnType<typeof ambilFormPesertaTerpadu>
  >,
  variasi: number,
  sesiPosgaId: number,
) {
  for (const item of form.skrining) {
    if (
      item.statusKelayakan !== "tampil" ||
      item.hasilSaatIni
    ) {
      continue;
    }

    const payload =
      payloadUntukItem(
        item,
        form.kategori,
        form.tanggalPosga,
        variasi + 1,
      );

    if (!payload) continue;

    try {
      await tambahHasilSkrining({
        pesertaNik:
          form.pesertaNik,
        indikatorId:
          item.indikatorId,
        sesiPosgaId,
        tanggalSkrining:
          form.tanggalPosga,
        sumber: "posga",
        namaFasilitas:
          "Puskesmas Demo POSGA",
        ...payload,
        catatan:
          `Seed skrining varian ${variasi + 1}`,
      });
    } catch (error) {
      console.warn(
        `[skrining] ${form.nama} / ${item.kode}:`,
        error instanceof Error
          ? error.message
          : error,
      );
    }
  }
}

async function isiKonseling(
  form: Awaited<
    ReturnType<typeof ambilFormPesertaTerpadu>
  >,
  variasi: number,
) {
  for (const item of form.konseling) {
    if (
      item.statusKelayakan !== "tampil" ||
      item.hasilSaatIni
    ) {
      continue;
    }

    if (
      item.tipeInput !== "select" &&
      item.tipeInput !== "multiselect"
    ) {
      continue;
    }

    const payload =
      payloadUntukItem(
        item,
        form.kategori,
        form.tanggalPosga,
        variasi + 2,
      );

    if (!payload) continue;

    try {
      await tambahHasilKonseling({
        pesertaSesiPosgaId:
          form.pesertaSesiId,
        indikatorId:
          item.indikatorId,
        ...payload,
        catatan:
          `Seed konseling varian ${variasi + 1}`,
      });
    } catch (error) {
      console.warn(
        `[konseling] ${form.nama} / ${item.kode}:`,
        error instanceof Error
          ? error.message
          : error,
      );
    }
  }
}

async function main() {
  const roster =
    await db
      .select({
        pesertaSesiId:
          pesertaSesiPosga.id,
        pesertaNik:
          pesertaSesiPosga.pesertaNik,
        sesiPosgaId:
          pesertaSesiPosga.sesiPosgaId,
        kategori:
          pesertaSesiPosga.kategoriSaatItu,
        tanggalPosga:
          sesiPosga.tanggalPosga,
        statusSesi:
          sesiPosga.status,
        nama:
          peserta.nama,
      })
      .from(pesertaSesiPosga)
      .innerJoin(
        sesiPosga,
        eq(
          sesiPosga.id,
          pesertaSesiPosga.sesiPosgaId,
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
        ne(
          sesiPosga.status,
          "dibatalkan",
        ),
      )
      .orderBy(
        asc(sesiPosga.tanggalPosga),
        asc(pesertaSesiPosga.id),
      );

  let berhasil = 0;
  let gagal = 0;

  for (const [index, row] of roster.entries()) {
    // Sebagian peserta pada sesi aktif sengaja dibiarkan belum lengkap
    // supaya empty/progress state tetap dapat diuji.
    const skipSebagian =
      row.statusSesi === "aktif" &&
      index % 7 === 0;

    if (skipSebagian) {
      continue;
    }

    try {
      let form =
        await ambilFormPesertaTerpadu(
          row.pesertaSesiId,
        );

      await isiPemeriksaan(
        form,
        index,
      );

      form =
        await ambilFormPesertaTerpadu(
          row.pesertaSesiId,
        );

      // Kombinasi varian:
      // - 1 dari 5 hanya pemeriksaan
      // - lainnya mendapat skrining
      if (index % 5 !== 0) {
        await isiSkrining(
          form,
          index,
          row.sesiPosgaId,
        );
      }

      form =
        await ambilFormPesertaTerpadu(
          row.pesertaSesiId,
        );

      // 1 dari 4 sengaja tanpa konseling.
      if (index % 4 !== 0) {
        await isiKonseling(
          form,
          index,
        );
      }

      await sinkronkanStatusPemeriksaanPeserta(
        row.pesertaSesiId,
      );

      berhasil++;
    } catch (error) {
      gagal++;
      console.warn(
        `[peserta-sesi ${row.pesertaSesiId}]`,
        error instanceof Error
          ? error.message
          : error,
      );
    }
  }

  console.log("");
  console.log("========================================");
  console.log("SEED HEALTH VARIANTS SELESAI");
  console.log("========================================");
  console.log(`Roster diproses : ${roster.length}`);
  console.log(`Berhasil        : ${berhasil}`);
  console.log(`Gagal           : ${gagal}`);
  console.log("");
  console.log("Varian tersedia:");
  console.log("- antropometri normal / borderline / ekstrem");
  console.log("- TD normal / prehipertensi / HT 1 / HT 3");
  console.log("- GDS normal / prediabetes / DM");
  console.log("- Hb normal / anemia ringan / sedang / berat");
  console.log("- skrining positif/negatif bervariasi");
  console.log("- konseling bervariasi");
  console.log("- sebagian roster aktif sengaja belum lengkap");
}

main().catch((error) => {
  console.error("SEED HEALTH VARIANTS GAGAL");
  console.error(error);
  process.exitCode = 1;
});

