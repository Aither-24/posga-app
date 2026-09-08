import { ambilPesertaDenganKategori } from "../lib/peserta-kategori.service.js";

async function main() {
  const hasil = await ambilPesertaDenganKategori(
    "3578000000000001",
    "2026-09-02"
  );

  console.log("=== PESERTA ===");
  console.log("NIK:", hasil.peserta.nik);
  console.log("Nama:", hasil.peserta.nama);
  console.log(
    "Tanggal lahir:",
    hasil.peserta.tanggalLahir
  );

  console.log("\n=== KLASIFIKASI ===");
  console.log(
    "Tanggal pemeriksaan:",
    hasil.pemeriksaan.tanggal
  );
  console.log(
    "Umur:",
    hasil.pemeriksaan.umurTeks
  );
  console.log(
    "Kategori:",
    hasil.pemeriksaan.kategori
  );
}

main().catch(console.error);