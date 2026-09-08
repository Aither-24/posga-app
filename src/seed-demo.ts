import {
  and,
  eq,
  inArray,
  like,
} from "drizzle-orm";

import {
  db,
} from "./db/index.js";

import {
  biodataAnak,
  biodataDewasa,
  episodeKehamilan,
  episodeNifas,
  lokasi,
  peserta,
  pesertaPosyandu,
  pesertaSesiPosga,
  posyandu,
  sesiPosga,
} from "./db/schema.js";

import {
  tambahEpisodeKehamilan,
  tambahEpisodeNifas,
} from "./lib/reproduksi.service.js";

import {
  buatSesiPosga,
} from "./lib/sesi-posga.service.js";

// ============================================================
// SEED DEMO POSGA
//
// Tujuan:
// - Banyak data untuk menguji frontend.
// - Semua kategori pemeriksaan tersedia.
// - Ada beberapa lokasi dan Posyandu.
// - Ada sesi aktif, selesai, dan dibatalkan.
// - Ada peserta aktif dan nonaktif.
// - Data seed tidak mencampur dengan data asli.
//
// Jalankan:
//   npx tsx src/seed-demo.ts
//
// Reset + seed ulang:
//   npx tsx src/seed-demo.ts --reset
// ============================================================

const PREFIX_LOKASI =
  "DATA UJI -";

const PREFIX_NAMA =
  "";

const PREFIX_RM =
  "RM";

const TANGGAL_REFERENSI =
  "2026-09-05";

type JenisKelamin =
  | "L"
  | "P";

type KategoriSeed =
  | "bayi"
  | "balita"
  | "prasekolah"
  | "sekolah"
  | "dewasa"
  | "lansia"
  | "ibu_hamil"
  | "ibu_nifas"
  | "nonaktif";

interface TemplatePeserta {
  kategori: KategoriSeed;
  nama: string;
  tanggalLahir: string;
  jenisKelamin: JenisKelamin;
}

const templates: TemplatePeserta[] = [
  { kategori: "bayi", nama: "Alya Putri", tanggalLahir: "2026-02-15", jenisKelamin: "P" },
  { kategori: "bayi", nama: "Raka Pratama", tanggalLahir: "2025-11-20", jenisKelamin: "L" },
  { kategori: "balita", nama: "Naira Azzahra", tanggalLahir: "2023-04-10", jenisKelamin: "P" },
  { kategori: "balita", nama: "Fathan Akbar", tanggalLahir: "2022-08-14", jenisKelamin: "L" },
  { kategori: "prasekolah", nama: "Keisya Maharani", tanggalLahir: "2020-06-12", jenisKelamin: "P" },
  { kategori: "prasekolah", nama: "Arkan Maulana", tanggalLahir: "2019-11-01", jenisKelamin: "L" },
  { kategori: "sekolah", nama: "Nadira Rahma", tanggalLahir: "2013-05-15", jenisKelamin: "P" },
  { kategori: "sekolah", nama: "Rizky Ramadhan", tanggalLahir: "2010-09-22", jenisKelamin: "L" },
  { kategori: "dewasa", nama: "Dewi Lestari", tanggalLahir: "1994-03-12", jenisKelamin: "P" },
  { kategori: "dewasa", nama: "Andi Saputra", tanggalLahir: "1986-07-24", jenisKelamin: "L" },
  { kategori: "lansia", nama: "Sri Wahyuni", tanggalLahir: "1960-05-17", jenisKelamin: "P" },
  { kategori: "lansia", nama: "Sutrisno Hadi", tanggalLahir: "1950-10-03", jenisKelamin: "L" },
  { kategori: "ibu_hamil", nama: "Fitri Handayani", tanggalLahir: "1996-04-08", jenisKelamin: "P" },
  { kategori: "ibu_hamil", nama: "Nur Aini", tanggalLahir: "1998-12-19", jenisKelamin: "P" },
  { kategori: "ibu_nifas", nama: "Rina Kurniawati", tanggalLahir: "1992-06-13", jenisKelamin: "P" },
  { kategori: "ibu_nifas", nama: "Siti Mardiyah", tanggalLahir: "1995-01-28", jenisKelamin: "P" },
  { kategori: "nonaktif", nama: "Maya Permatasari", tanggalLahir: "1988-02-11", jenisKelamin: "P" },
  { kategori: "nonaktif", nama: "Bambang Setiawan", tanggalLahir: "1978-08-29", jenisKelamin: "L" },
];

const struktur = [
  {
    lokasi: "DATA UJI - Kelurahan Krembangan Selatan",
    alamat: "Krembangan Selatan, Surabaya",
    posyandu: ["Posyandu Melati", "Posyandu Mawar"],
  },
  {
    lokasi: "DATA UJI - Kelurahan Dupak",
    alamat: "Dupak, Surabaya",
    posyandu: ["Posyandu Anggrek", "Posyandu Kenanga"],
  },
  {
    lokasi: "DATA UJI - Kelurahan Perak Barat",
    alamat: "Perak Barat, Surabaya",
    posyandu: ["Posyandu Flamboyan", "Posyandu Dahlia"],
  },
];

const tambahanNama = [
  "Santoso",
  "Wijaya",
  "Prasetyo",
  "Kusuma",
  "Nugroho",
  "Utami",
];

function namaRealistis(
  namaDasar: string,
  posyanduUrut: number,
) {
  const tambahan =
    tambahanNama[
      (posyanduUrut - 1) %
      tambahanNama.length
    ] ?? "Surabaya";

  return `${namaDasar} ${tambahan}`;
}

function namaIbuRealistis(
  posyanduUrut: number,
  pesertaUrut: number,
) {
  const nama = [
    "Yuni Astuti",
    "Rahayu Wulandari",
    "Erna Susanti",
    "Lilis Setyaningsih",
    "Ratna Sari",
    "Indah Puspitasari",
  ];

  return `${nama[(pesertaUrut - 1) % nama.length] ?? "Ibu Peserta"} ${tambahanNama[(posyanduUrut - 1) % tambahanNama.length] ?? ""}`.trim();
}

function namaPasanganRealistis(
  posyanduUrut: number,
  pesertaUrut: number,
) {
  const nama = [
    "Agus Setiawan",
    "Dimas Prakoso",
    "Eko Hermawan",
    "Fajar Hidayat",
    "Hendra Gunawan",
    "Joko Susilo",
  ];

  return `${nama[(pesertaUrut - 1) % nama.length] ?? "Pasangan"} ${tambahanNama[(posyanduUrut - 1) % tambahanNama.length] ?? ""}`.trim();
}

const tanggalSesi = [
  {
    tanggal:
      "2026-08-23",
    status:
      "selesai" as const,
    catatan:
      "Pelayanan rutin akhir Agustus",
  },
  {
    tanggal:
      "2026-08-30",
    status:
      "selesai" as const,
    catatan:
      "Pelayanan rutin mingguan",
  },
  {
    tanggal:
      "2026-09-01",
    status:
      "dibatalkan" as const,
    catatan:
      "Sesi dibatalkan",
  },
  {
    tanggal:
      "2026-09-05",
    status:
      "aktif" as const,
    catatan:
      "Pelayanan POSGA",
  },
  {
    tanggal:
      "2026-09-12",
    status:
      "aktif" as const,
    catatan:
      "Jadwal pelayanan berikutnya",
  },
];

function assertData<T>(
  value: T | undefined | null,
  message: string,
): T {
  if (
    value === undefined ||
    value === null
  ) {
    throw new Error(message);
  }

  return value;
}

function nikDemo(
  posyanduUrut: number,
  pesertaUrut: number,
) {
  // Tepat 16 digit, sengaja memakai prefix 999999 agar
  // tidak disalahartikan sebagai NIK penduduk sebenarnya.
  return `999999${String(
    posyanduUrut,
  ).padStart(
    2,
    "0",
  )}${String(
    pesertaUrut,
  ).padStart(
    8,
    "0",
  )}`;
}

function noRmDemo(
  posyanduUrut: number,
  pesertaUrut: number,
) {
  return `${PREFIX_RM}-${String(
    posyanduUrut,
  ).padStart(
    2,
    "0",
  )}-${String(
    pesertaUrut,
  ).padStart(
    3,
    "0",
  )}`;
}

function noTelpDemo(
  posyanduUrut: number,
  pesertaUrut: number,
) {
  return `0812${String(
    posyanduUrut,
  ).padStart(
    2,
    "0",
  )}${String(
    pesertaUrut,
  ).padStart(
    6,
    "0",
  )}`;
}

async function hapusSeed() {
  console.log(
    "\nMenghapus seed demo lama...",
  );

  const lokasiRows =
    await db
      .select({
        id: lokasi.id,
      })
      .from(lokasi)
      .where(
        like(
          lokasi.nama,
          `${PREFIX_LOKASI}%`,
        ),
      );

  const lokasiIds =
    lokasiRows.map(
      (row) =>
        row.id,
    );

  const posyanduRows =
    lokasiIds.length > 0
      ? await db
          .select({
            id:
              posyandu.id,
          })
          .from(
            posyandu,
          )
          .where(
            inArray(
              posyandu.lokasiId,
              lokasiIds,
            ),
          )
      : [];

  const posyanduIds =
    posyanduRows.map(
      (row) =>
        row.id,
    );

  if (
    posyanduIds.length > 0
  ) {
    // peserta_sesi ikut cascade ketika sesi dihapus.
    await db
      .delete(sesiPosga)
      .where(
        inArray(
          sesiPosga.posyanduId,
          posyanduIds,
        ),
      );
  }

  const pesertaRows =
    await db
      .select({
        nik: peserta.nik,
      })
      .from(peserta)
      .where(
        like(
          peserta.nama,
          `${PREFIX_NAMA}%`,
        ),
      );

  const niks =
    pesertaRows.map(
      (row) =>
        row.nik,
    );

  if (
    niks.length > 0
  ) {
    // Hapus episode reproduksi dahulu karena FK peserta = RESTRICT.
    await db
      .delete(episodeNifas)
      .where(
        inArray(
          episodeNifas.pesertaNik,
          niks,
        ),
      );

    await db
      .delete(
        episodeKehamilan,
      )
      .where(
        inArray(
          episodeKehamilan.pesertaNik,
          niks,
        ),
      );

    await db
      .delete(
        pesertaPosyandu,
      )
      .where(
        inArray(
          pesertaPosyandu.pesertaNik,
          niks,
        ),
      );

    // biodata anak/dewasa cascade ketika peserta dihapus.
    await db
      .delete(peserta)
      .where(
        inArray(
          peserta.nik,
          niks,
        ),
      );
  }

  if (
    posyanduIds.length > 0
  ) {
    await db
      .delete(posyandu)
      .where(
        inArray(
          posyandu.id,
          posyanduIds,
        ),
      );
  }

  if (
    lokasiIds.length > 0
  ) {
    await db
      .delete(lokasi)
      .where(
        inArray(
          lokasi.id,
          lokasiIds,
        ),
      );
  }

  console.log(
    "Seed demo lama berhasil dibersihkan.",
  );
}

async function seedLokasiDanPosyandu() {
  const hasil:
    Array<{
      lokasiId: number;
      lokasiNama: string;
      posyanduId: number;
      posyanduNama: string;
      urut: number;
    }> = [];

  let urut =
    1;

  for (
    const item of struktur
  ) {
    const lokasiRows =
      await db
        .insert(lokasi)
        .values({
          nama:
            item.lokasi,
          alamat:
            item.alamat,
          aktif: true,
        })
        .returning({
          id: lokasi.id,
        });

    const lokasiId =
      assertData(
        lokasiRows[0]?.id,
        "Lokasi seed gagal dibuat.",
      );

    for (
      const namaPosyandu of
        item.posyandu
    ) {
      const rows =
        await db
          .insert(
            posyandu,
          )
          .values({
            lokasiId,
            nama:
              namaPosyandu,
            alamat:
              `Alamat ${namaPosyandu}`,
            aktif:
              true,
          })
          .returning({
            id:
              posyandu.id,
          });

      const posyanduId =
        assertData(
          rows[0]?.id,
          "Posyandu seed gagal dibuat.",
        );

      hasil.push({
        lokasiId,
        lokasiNama:
          item.lokasi,
        posyanduId,
        posyanduNama:
          namaPosyandu,
        urut,
      });

      urut++;
    }
  }

  return hasil;
}

async function seedPeserta(
  daftarPosyandu:
    Awaited<
      ReturnType<
        typeof seedLokasiDanPosyandu
      >
    >,
) {
  const daftar:
    Array<{
      nik: string;
      kategori:
        KategoriSeed;
      posyanduId:
        number;
      posyanduUrut:
        number;
      pesertaUrut:
        number;
    }> = [];

  for (
    const pos of daftarPosyandu
  ) {
    let pesertaUrut =
      1;

    for (
      const template of
        templates
    ) {
      const nik =
        nikDemo(
          pos.urut,
          pesertaUrut,
        );

      const aktif =
        template.kategori !==
        "nonaktif";

      await db
        .insert(peserta)
        .values({
          nik,
          nama:
            `${PREFIX_NAMA}${namaRealistis(template.nama, pos.urut)}`,
          noRm:
            noRmDemo(
              pos.urut,
              pesertaUrut,
            ),
          noTelp:
            noTelpDemo(
              pos.urut,
              pesertaUrut,
            ),
          tanggalLahir:
            template.tanggalLahir,
          jenisKelamin:
            template.jenisKelamin,
          alamatKtp:
            `Jl. Krembangan ${pos.urut} No. ${pesertaUrut}, Surabaya`,
          rtKtp: "001",
          rwKtp: "002",
          alamatDomisili:
            `${pos.lokasiNama}, Surabaya`,
          rtDomisili:
            "003",
          rwDomisili:
            "004",
          aktif,
        });

      await db
        .insert(
          pesertaPosyandu,
        )
        .values({
          pesertaNik:
            nik,
          posyanduId:
            pos.posyanduId,
          tanggalMulai:
            "2026-01-01",
          tanggalSelesai:
            aktif
              ? null
              : "2026-08-31",
          aktif,
        });

      if (
        [
          "bayi",
          "balita",
          "prasekolah",
          "sekolah",
        ].includes(
          template.kategori,
        )
      ) {
        await db
          .insert(
            biodataAnak,
          )
          .values({
            pesertaNik:
              nik,
            namaIbuKandung:
              namaIbuRealistis(
                pos.urut,
                pesertaUrut,
              ),
            anakKe:
              (pesertaUrut %
                3) +
              1,
            imd:
              pesertaUrut %
                2 ===
              0,
            bblGram:
              2800 +
              pesertaUrut *
                35,
            pblCm:
              47 +
              (pesertaUrut %
                5),
          });
      } else {
        await db
          .insert(
            biodataDewasa,
          )
          .values({
            pesertaNik:
              nik,
            namaPasangan:
              template.jenisKelamin ===
              "P"
                ? namaPasanganRealistis(
                    pos.urut,
                    pesertaUrut,
                  )
                : null,
            jumlahAnak:
              pesertaUrut %
              4,
            kbYangDiikuti:
              pesertaUrut %
                2 ===
              0
                ? "Suntik"
                : null,
            alasanTidakBerKb:
              pesertaUrut %
                2 ===
              0
                ? null
                : "Belum memilih metode KB",
            rpdHt:
              template.kategori ===
              "lansia",
            rpdDm:
              template.kategori ===
                "lansia" &&
              pesertaUrut %
                2 ===
                0,
          });
      }

      daftar.push({
        nik,
        kategori:
          template.kategori,
        posyanduId:
          pos.posyanduId,
        posyanduUrut:
          pos.urut,
        pesertaUrut,
      });

      pesertaUrut++;
    }
  }

  return daftar;
}

async function seedReproduksi(
  daftarPeserta:
    Awaited<
      ReturnType<
        typeof seedPeserta
      >
    >,
) {
  const hamil =
    daftarPeserta.filter(
      (item) =>
        item.kategori ===
        "ibu_hamil",
    );

  const nifas =
    daftarPeserta.filter(
      (item) =>
        item.kategori ===
        "ibu_nifas",
    );

  for (
    const [
      index,
      item,
    ] of hamil.entries()
  ) {
    await tambahEpisodeKehamilan(
      item.nik,
      {
        tanggalMulai:
          index %
            2 ===
          0
            ? "2026-05-01"
            : "2026-06-15",

        bbSebelumHamilKg:
          50 +
          (index % 8),

        tbCm:
          150 +
          (index % 10),

        hpht:
          index %
            2 ===
          0
            ? "2026-04-15"
            : "2026-05-20",

        hpl:
          index %
            2 ===
          0
            ? "2027-01-20"
            : "2027-02-25",

        lilaAwalCm:
          24 +
          (index % 5),

        catatan:
          "Pemantauan kehamilan rutin.",
      },
    );
  }

  for (
    const [
      index,
      item,
    ] of nifas.entries()
  ) {
    const kehamilan =
      await tambahEpisodeKehamilan(
        item.nik,
        {
          tanggalMulai:
            "2026-01-15",
          bbSebelumHamilKg:
            52 +
            (index % 5),
          tbCm:
            152 +
            (index % 7),
          hpht:
            "2025-12-20",
          hpl:
            "2026-09-26",
          lilaAwalCm:
            25 +
            (index % 4),
          catatan:
            "Riwayat kehamilan sebelum masa nifas.",
        },
      );

    const tanggalNifas =
      index %
        2 ===
      0
        ? "2026-08-20"
        : "2026-08-25";

    await tambahEpisodeNifas(
      item.nik,
      {
        episodeKehamilanId:
          kehamilan.id,
        tanggalMulai:
          tanggalNifas,
        tanggalMelahirkan:
          tanggalNifas,
        jamBersalin:
          index %
            2 ===
          0
            ? "08:30"
            : "14:15",
        caraPersalinan:
          index %
            3 ===
          0
            ? "sesar"
            : "pervaginam",
        vitaminA: true,
        asiEksklusif:
          index %
            4 !==
          0,
        catatan:
          "Pemantauan masa nifas.",
      },
    );
  }
}

async function seedSesi(
  daftarPosyandu:
    Awaited<
      ReturnType<
        typeof seedLokasiDanPosyandu
      >
    >,
) {
  let jumlahSesi =
    0;

  for (
    const pos of daftarPosyandu
  ) {
    for (
      const item of
        tanggalSesi
    ) {
      const hasil =
        await buatSesiPosga({
          posyanduId:
            pos.posyanduId,
          tanggalPosga:
            item.tanggal,
          catatan:
            `${item.catatan} - ${pos.posyanduNama}`,
        });

      jumlahSesi++;

      if (
        item.status !==
        "aktif"
      ) {
        await db
          .update(sesiPosga)
          .set({
            status:
              item.status,
          })
          .where(
            eq(
              sesiPosga.id,
              hasil.sesi.id,
            ),
          );
      }

      // Supaya status roster tidak semuanya sama.
      if (
        item.status ===
          "selesai" &&
        hasil.peserta.length >
          0
      ) {
        const ids =
          hasil.peserta
            .slice(
              0,
              Math.min(
                6,
                hasil.peserta
                  .length,
              ),
            )
            .map(
              (p) =>
                p.pesertaSesiId,
            );

        if (
          ids.length > 0
        ) {
          await db
            .update(
              pesertaSesiPosga,
            )
            .set({
              statusPemeriksaan:
                "selesai",
            })
            .where(
              inArray(
                pesertaSesiPosga.id,
                ids,
              ),
            );
        }
      }
    }
  }

  return jumlahSesi;
}

async function tampilkanRingkasan() {
  const lokasiRows =
    await db
      .select({
        id: lokasi.id,
      })
      .from(lokasi)
      .where(
        like(
          lokasi.nama,
          `${PREFIX_LOKASI}%`,
        ),
      );

  const lokasiIds =
    lokasiRows.map(
      (x) =>
        x.id,
    );

  const posRows =
    lokasiIds.length
      ? await db
          .select({
            id:
              posyandu.id,
          })
          .from(
            posyandu,
          )
          .where(
            inArray(
              posyandu.lokasiId,
              lokasiIds,
            ),
          )
      : [];

  const pesertaRows =
    await db
      .select({
        nik: peserta.nik,
      })
      .from(peserta)
      .where(
        like(
          peserta.nama,
          `${PREFIX_NAMA}%`,
        ),
      );

  const sesiRows =
    posRows.length
      ? await db
          .select({
            id:
              sesiPosga.id,
          })
          .from(
            sesiPosga,
          )
          .where(
            inArray(
              sesiPosga.posyanduId,
              posRows.map(
                (x) =>
                  x.id,
              ),
            ),
          )
      : [];

  console.log(
    "\n========================================",
  );
  console.log(
    "SEED DEMO POSGA BERHASIL",
  );
  console.log(
    "========================================",
  );
  console.log(
    `Lokasi      : ${lokasiRows.length}`,
  );
  console.log(
    `Posyandu    : ${posRows.length}`,
  );
  console.log(
    `Peserta     : ${pesertaRows.length}`,
  );
  console.log(
    `Sesi        : ${sesiRows.length}`,
  );
  console.log(
    "Kategori    : bayi, balita, prasekolah, sekolah, dewasa, lansia, ibu_hamil, ibu_nifas",
  );
  console.log(
    "Peserta nonaktif juga tersedia untuk pengujian filter.",
  );
  console.log(
    `Tanggal referensi pengujian: ${TANGGAL_REFERENSI}`,
  );
}

async function main() {
  const reset =
    process.argv.includes(
      "--reset",
    );

  const existing =
    await db
      .select({
        id: lokasi.id,
      })
      .from(lokasi)
      .where(
        like(
          lokasi.nama,
          `${PREFIX_LOKASI}%`,
        ),
      )
      .limit(1);

  if (
    existing.length > 0
  ) {
    if (!reset) {
      console.log(
        "Seed demo sudah ada.",
      );
      console.log(
        "Gunakan: npx tsx src/seed-demo.ts --reset",
      );
      return;
    }

    await hapusSeed();
  }

  console.log(
    "\nMembuat lokasi dan Posyandu demo...",
  );

  const daftarPosyandu =
    await seedLokasiDanPosyandu();

  console.log(
    `OK: ${daftarPosyandu.length} Posyandu.`,
  );

  console.log(
    "Membuat peserta dan keanggotaan...",
  );

  const daftarPeserta =
    await seedPeserta(
      daftarPosyandu,
    );

  console.log(
    `OK: ${daftarPeserta.length} peserta.`,
  );

  console.log(
    "Membuat episode ibu hamil dan nifas...",
  );

  await seedReproduksi(
    daftarPeserta,
  );

  console.log(
    "OK: reproduksi.",
  );

  console.log(
    "Membuat sesi dan roster...",
  );

  const jumlahSesi =
    await seedSesi(
      daftarPosyandu,
    );

  console.log(
    `OK: ${jumlahSesi} sesi.`,
  );

  await tampilkanRingkasan();
}

main().catch(
  (error) => {
    console.error(
      "\nSEED DEMO GAGAL",
    );

    console.error(
      error,
    );

    process.exitCode =
      1;
  },
);
