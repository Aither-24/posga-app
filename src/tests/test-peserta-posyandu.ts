import {
  tempatkanPesertaKePosyandu,
  ambilKeanggotaanAktif,
  ambilPesertaAktifByPosyandu,
} from "../lib/peserta-posyandu.service.js";

import {
  tambahPeserta,
} from "../lib/peserta.service.js";

async function main() {
  const nik =
    "3578000000000100";

  try {
    await tambahPeserta({
      nik,
      nama: "Peserta Posyandu Uji",
      tanggalLahir:
        "2022-03-10",
      jenisKelamin: "P",
    });

    console.log(
      "Peserta berhasil dibuat."
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

  try {
    const keanggotaan =
      await tempatkanPesertaKePosyandu({
        pesertaNik: nik,
        posyanduId: 1,
        tanggalMulai:
          "2026-09-03",
      });

    console.log(
      "\n=== KEANGGOTAAN BARU ==="
    );

    console.log(
      keanggotaan
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(
        "sudah aktif"
      )
    ) {
      console.log(
        "Peserta sudah aktif di Posyandu."
      );
    } else {
      throw error;
    }
  }

  console.log(
    "\n=== KEANGGOTAAN AKTIF ==="
  );

  const aktif =
    await ambilKeanggotaanAktif(
      nik
    );

  console.log(aktif);

  console.log(
    "\n=== PESERTA AKTIF POSYANDU 1 ==="
  );

  const daftar =
    await ambilPesertaAktifByPosyandu(
      1
    );

  console.log(daftar);
}

main().catch(console.error);