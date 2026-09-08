import { tentukanKategoriUsia } from "../lib/kategori.js";

const contoh = [
  ["2025-09-03", "2026-09-02"],
  ["2025-09-02", "2026-09-02"],
  ["2021-09-02", "2026-09-02"],
  ["2019-09-02", "2026-09-02"],
  ["2008-09-02", "2026-09-02"],
  ["1966-09-02", "2026-09-02"],
];

for (const [tanggalLahir, tanggalPemeriksaan] of contoh) {
  if (!tanggalLahir || !tanggalPemeriksaan) {
    continue;
  }

  const hasil = tentukanKategoriUsia(
    tanggalLahir,
    tanggalPemeriksaan
  );

  console.log(
    `${tanggalLahir} â†’ ` +
      `${hasil.umur.tahun} tahun ` +
      `${hasil.umur.bulan} bulan ` +
      `${hasil.umur.hari} hari â†’ ` +
      `${hasil.kategori}`
  );
}