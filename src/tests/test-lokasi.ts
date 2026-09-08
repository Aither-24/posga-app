import {
  tambahLokasi,
  ambilSemuaLokasi,
} from "../lib/lokasi.service.js";

async function main() {
  console.log(
    "=== TAMBAH LOKASI ==="
  );

  const baru = await tambahLokasi({
    nama: "Puskesmas Krembangan Selatan",
    alamat: "Surabaya",
  });

  console.log(baru);

  console.log(
    "\n=== SEMUA LOKASI ==="
  );

  const semua =
    await ambilSemuaLokasi();

  console.log(semua);
}

main().catch(console.error);