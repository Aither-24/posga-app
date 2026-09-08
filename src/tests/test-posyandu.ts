import {
  tambahPosyandu,
  ambilPosyanduByLokasi,
} from "../lib/posyandu.service.js";

async function main() {
  console.log(
    "=== TAMBAH POSYANDU ==="
  );

  const baru = await tambahPosyandu({
    lokasiId: 1,
    nama: "Posyandu Uji",
    alamat: "Surabaya",
  });

  console.log(baru);

  console.log(
    "\n=== POSYANDU DI LOKASI 1 ==="
  );

  const semua =
    await ambilPosyanduByLokasi(1);

  console.log(semua);
}

main().catch(console.error);