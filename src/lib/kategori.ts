export type KategoriUsia =
  | "bayi"
  | "balita"
  | "prasekolah"
  | "sekolah"
  | "dewasa"
  | "lansia";

export interface HasilKlasifikasiUsia {
  kategori: KategoriUsia;

  umur: {
    tahun: number;
    bulan: number;
    hari: number;
  };

  totalBulan: number;
}

function parseTanggal(tanggal: string): Date {
  const [tahunString, bulanString, hariString] = tanggal.split("-");

  const tahun = Number(tahunString);
  const bulan = Number(bulanString);
  const hari = Number(hariString);

  if (
    !Number.isInteger(tahun) ||
    !Number.isInteger(bulan) ||
    !Number.isInteger(hari)
  ) {
    throw new Error(`Format tanggal tidak valid: ${tanggal}`);
  }

  const date = new Date(tahun, bulan - 1, hari);

  if (
    date.getFullYear() !== tahun ||
    date.getMonth() !== bulan - 1 ||
    date.getDate() !== hari
  ) {
    throw new Error(`Tanggal tidak valid: ${tanggal}`);
  }

  return date;
}

function jumlahHariDalamBulan(
  tahun: number,
  bulan: number,
): number {
  return new Date(tahun, bulan + 1, 0).getDate();
}

function tambahBulanTerbatas(
  tanggal: Date,
  jumlahBulan: number,
): Date {
  const tahunAwal = tanggal.getFullYear();
  const bulanAwal = tanggal.getMonth();
  const hariAwal = tanggal.getDate();

  const indeksBulan = bulanAwal + jumlahBulan;

  const tahunTarget =
    tahunAwal + Math.floor(indeksBulan / 12);

  const bulanTarget =
    ((indeksBulan % 12) + 12) % 12;

  const hariTarget = Math.min(
    hariAwal,
    jumlahHariDalamBulan(
      tahunTarget,
      bulanTarget,
    ),
  );

  return new Date(
    tahunTarget,
    bulanTarget,
    hariTarget,
  );
}

function selisihHariKalender(
  tanggalAwal: Date,
  tanggalAkhir: Date,
): number {
  const awalUtc = Date.UTC(
    tanggalAwal.getFullYear(),
    tanggalAwal.getMonth(),
    tanggalAwal.getDate(),
  );

  const akhirUtc = Date.UTC(
    tanggalAkhir.getFullYear(),
    tanggalAkhir.getMonth(),
    tanggalAkhir.getDate(),
  );

  const milidetikPerHari =
    24 * 60 * 60 * 1000;

  return Math.floor(
    (akhirUtc - awalUtc) /
      milidetikPerHari,
  );
}

export function hitungUmurLengkap(
  tanggalLahir: Date,
  tanggalPemeriksaan: Date,
): {
  tahun: number;
  bulan: number;
  hari: number;
  totalBulan: number;
} {
  if (tanggalPemeriksaan < tanggalLahir) {
    throw new Error(
      "Tanggal pemeriksaan tidak boleh lebih awal dari tanggal lahir.",
    );
  }

  let totalBulan =
    (tanggalPemeriksaan.getFullYear() -
      tanggalLahir.getFullYear()) *
      12 +
    (tanggalPemeriksaan.getMonth() -
      tanggalLahir.getMonth());

  let tanggalPatokan =
    tambahBulanTerbatas(
      tanggalLahir,
      totalBulan,
    );

  if (tanggalPatokan > tanggalPemeriksaan) {
    totalBulan -= 1;

    tanggalPatokan =
      tambahBulanTerbatas(
        tanggalLahir,
        totalBulan,
      );
  }

  const tahun = Math.floor(
    totalBulan / 12,
  );

  const bulan =
    totalBulan % 12;

  const hari =
    selisihHariKalender(
      tanggalPatokan,
      tanggalPemeriksaan,
    );

  return {
    tahun,
    bulan,
    hari,
    totalBulan,
  };
}

export function tentukanKategoriUsia(
  tanggalLahir: string,
  tanggalPemeriksaan: string,
): HasilKlasifikasiUsia {
  const lahir = parseTanggal(tanggalLahir);
  const pemeriksaan = parseTanggal(
    tanggalPemeriksaan,
  );

  if (pemeriksaan < lahir) {
    throw new Error(
      "Tanggal pemeriksaan tidak boleh lebih awal dari tanggal lahir.",
    );
  }

  const umur = hitungUmurLengkap(
    lahir,
    pemeriksaan,
  );

  let kategori: KategoriUsia;

  if (umur.totalBulan < 12) {
    kategori = "bayi";
  } else if (umur.totalBulan < 60) {
    kategori = "balita";
  } else if (umur.totalBulan < 84) {
    kategori = "prasekolah";
  } else if (umur.totalBulan < 216) {
    kategori = "sekolah";
  } else if (umur.totalBulan < 720) {
    kategori = "dewasa";
  } else {
    kategori = "lansia";
  }

  return {
    kategori,

    umur: {
      tahun: umur.tahun,
      bulan: umur.bulan,
      hari: umur.hari,
    },

    totalBulan: umur.totalBulan,
  };
}