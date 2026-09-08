import {
  ambilPesertaSesi,
  buatSesiPosga,
} from "../lib/sesi-posga.service.js";

async function main() {
  console.log(
    "=== BUAT SESI POSGA ==="
  );

  const hasil =
    await buatSesiPosga({
      posyanduId: 1,

      tanggalPosga:
        "2026-09-03",

      catatan:
        "Sesi uji otomatis",
    });

  console.log(
    "\n=== DATA SESI ==="
  );

  console.log(
    hasil.sesi
  );

  console.log(
    "\nJumlah peserta:",
    hasil.jumlahPeserta
  );

  console.log(
    "\n=== HASIL KLASIFIKASI ==="
  );

  for (
    const peserta
    of hasil.peserta
  ) {
    console.log({
      nik:
        peserta.pesertaNik,

      nama:
        peserta.nama,

      umur:
        `${peserta.umur.tahun} tahun ` +
        `${peserta.umur.bulan} bulan ` +
        `${peserta.umur.hari} hari`,

      kategori:
        peserta.kategori,

      sumber:
        peserta.sumberKategori,

      status:
        peserta.statusPemeriksaan,
    });
  }

  console.log(
    "\n=== BACA ULANG PESERTA SESI ==="
  );

  const daftar =
    await ambilPesertaSesi(
      hasil.sesi.id
    );

  console.log(
    daftar
  );
}

main().catch(
  console.error
);