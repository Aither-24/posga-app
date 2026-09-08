import {
  generateFormPesertaSesi,
} from "../lib/rule-engine.service.js";

function judul(
  teks: string
) {
  console.log(
    "\n========================================"
  );

  console.log(
    teks
  );

  console.log(
    "========================================"
  );
}

async function main() {
  // Peserta sesi ID 1 berasal dari test awal:
  //
  // Peserta Posyandu Uji
  // lahir 2022-03-10
  // sesi 2026-09-03
  // kategori balita

  const pesertaSesiId =
    1;

  judul(
    "GENERATE FORM PESERTA SESI"
  );

  const form =
    await generateFormPesertaSesi(
      pesertaSesiId
    );

  console.log({
    pesertaSesiId:
      form.pesertaSesiId,

    nik:
      form.pesertaNik,

    nama:
      form.nama,

    tanggalPosga:
      form.tanggalPosga,

    kategori:
      form.kategori,

    umur:
      form.umur,
  });

  // ==========================================================
  // PEMERIKSAAN
  // ==========================================================

  judul(
    "PEMERIKSAAN"
  );

  for (
    const item
    of form.pemeriksaan
  ) {
    console.log({
      kode:
        item.kode,

      nama:
        item.nama,

      frekuensi:
        item.frekuensi,

      status:
        item.statusKelayakan,

      wajib:
        item.wajib,

      derived:
        item.derived,

      opsi:
        item.opsi.map(
          (opsi) =>
            opsi.label
        ),
    });
  }

  // ==========================================================
  // SKRINING
  // ==========================================================

  judul(
    "SKRINING"
  );

  for (
    const item
    of form.skrining
  ) {
    console.log({
      kode:
        item.kode,

      nama:
        item.nama,

      frekuensi:
        item.frekuensi,

      status:
        item.statusKelayakan,

      alasan:
        item.alasan,
    });
  }

  // ==========================================================
  // KONSELING
  // ==========================================================

  judul(
    "KONSELING"
  );

  for (
    const item
    of form.konseling
  ) {
    console.log({
      kode:
        item.kode,

      nama:
        item.nama,

      status:
        item.statusKelayakan,

      opsi:
        item.opsi.map(
          (opsi) =>
            opsi.label
        ),
    });
  }

  // ==========================================================
  // ASSERT DASAR
  // ==========================================================

  judul(
    "VALIDASI RULE ENGINE"
  );

  const adaBB =
    form.pemeriksaan.some(
      (item) =>
        item.kode ===
        "BB"
    );

  if (!adaBB) {
    throw new Error(
      "TEST GAGAL: BB tidak ditemukan."
    );
  }

  const adaLila =
    form.pemeriksaan.some(
      (item) =>
        item.kode ===
        "LILA"
    );

  if (!adaLila) {
    throw new Error(
      "TEST GAGAL: LILA tidak ditemukan."
    );
  }

  const sdidtk =
    form.pemeriksaan.find(
      (item) =>
        item.kode ===
        "SDIDTK"
    );

  if (!sdidtk) {
    throw new Error(
      "TEST GAGAL: SDIDTK tidak ditemukan."
    );
  }

  console.log(
    "Status SDIDTK:",
    sdidtk.statusKelayakan
  );

  console.log(
    "\n========================================"
  );

  console.log(
    "RULE ENGINE V1 BERHASIL"
  );

  console.log(
    "========================================"
  );
}

main().catch(
  (error) => {
    console.error(
      "\n========================================"
    );

    console.error(
      "TEST RULE ENGINE GAGAL"
    );

    console.error(
      "========================================"
    );

    console.error(
      error
    );

    process.exitCode =
      1;
  }
);