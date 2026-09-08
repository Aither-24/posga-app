import {
  tambahPeserta,
  ambilPesertaByNik,
  ambilSemuaPeserta,
} from "../lib/peserta.service.js";

async function main() {
  const nik =
    "3578000000000001";

  console.log(
    "=== TAMBAH PESERTA ==="
  );

  try {
    const pesertaBaru =
      await tambahPeserta({
        nik,

        nama: "Peserta Uji",

        noRm: "RM-001",

        noTelp:
          "081234567890",

        tanggalLahir:
          "2021-09-02",

        jenisKelamin: "L",

        alamatKtp:
          "Surabaya",

        rtKtp: "001",

        rwKtp: "002",

        alamatDomisili:
          "Surabaya",

        rtDomisili: "001",

        rwDomisili: "002",
      });

    console.log(
      pesertaBaru
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        "sudah terdaftar"
      )
    ) {
      console.log(
        "Peserta sudah ada."
      );
    } else {
      throw error;
    }
  }

  console.log(
    "\n=== CARI BERDASARKAN NIK ==="
  );

  const detail =
    await ambilPesertaByNik(
      nik
    );

  console.log(detail);

  console.log(
    "\n=== SEMUA PESERTA ==="
  );

  const semua =
    await ambilSemuaPeserta();

  console.log(semua);
}

main().catch(console.error);