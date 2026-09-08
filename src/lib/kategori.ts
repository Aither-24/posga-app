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

export function hitungUmurLengkap(
  tanggalLahir: Date,
  tanggalPemeriksaan: Date,
): {
  tahun: number;
  bulan: number;
  hari: number;
  totalBulan: number;
} {
  let tahun = tanggalPemeriksaan.getFullYear() - tanggalLahir.getFullYear();

  let bulan = tanggalPemeriksaan.getMonth() - tanggalLahir.getMonth();

  let hari = tanggalPemeriksaan.getDate() - tanggalLahir.getDate();

  if (hari < 0) {
    bulan -= 1;

    const bulanSebelumnya = new Date(
      tanggalPemeriksaan.getFullYear(),
      tanggalPemeriksaan.getMonth(),
      0,
    );

    hari += bulanSebelumnya.getDate();
  }

  if (bulan < 0) {
    tahun -= 1;
    bulan += 12;
  }

  const totalBulan = tahun * 12 + bulan;

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
  const pemeriksaan = parseTanggal(tanggalPemeriksaan);

  if (pemeriksaan < lahir) {
    throw new Error(
      "Tanggal pemeriksaan tidak boleh lebih awal dari tanggal lahir.",
    );
  }

  const umur = hitungUmurLengkap(lahir, pemeriksaan);

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
