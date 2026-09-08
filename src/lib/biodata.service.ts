import {
  eq,
  sql,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  biodataAnak,
  biodataDewasa,
  peserta,
} from "../db/schema.js";

// ============================================================
// TYPE BIODATA ANAK
// ============================================================

export interface SimpanBiodataAnakInput {
  namaIbuKandung?:
    string | null;

  nikIbuKandung?:
    string | null;

  anakKe?:
    number | null;

  imd?:
    boolean | null;

  bblGram?:
    number | null;

  pblCm?:
    number | null;
}

// ============================================================
// TYPE BIODATA DEWASA
// ============================================================

export interface SimpanBiodataDewasaInput {
  namaPasangan?:
    string | null;

  nikPasangan?:
    string | null;

  jumlahAnak?:
    number | null;

  kbYangDiikuti?:
    string | null;

  alasanTidakBerKb?:
    string | null;

  rpdHt?:
    boolean | null;

  rpdDm?:
    boolean | null;
}

// ============================================================
// NORMALISASI TEXT
// ============================================================

function normalisasiText(
  value:
    string | null | undefined,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const hasil =
    value.trim();

  return hasil.length > 0
    ? hasil
    : null;
}

// ============================================================
// VALIDASI NIK
// ============================================================

function validasiNik(
  nik: string,
  label = "NIK",
) {
  if (
    !/^\d{16}$/.test(
      nik,
    )
  ) {
    throw new Error(
      `${label} harus terdiri dari 16 digit.`,
    );
  }
}

// ============================================================
// PASTIKAN PESERTA ADA
// ============================================================

async function pastikanPesertaAda(
  nik: string,
) {
  validasiNik(
    nik,
  );

  const rows =
    await db
      .select({
        nik:
          peserta.nik,

        nama:
          peserta.nama,

        tanggalLahir:
          peserta.tanggalLahir,

        jenisKelamin:
          peserta.jenisKelamin,

        aktif:
          peserta.aktif,
      })
      .from(
        peserta,
      )
      .where(
        eq(
          peserta.nik,
          nik,
        ),
      )
      .limit(1);

  const data =
    rows[0];

  if (!data) {
    throw new Error(
      "Peserta tidak ditemukan.",
    );
  }

  return data;
}

// ============================================================
// VALIDASI BIODATA ANAK
// ============================================================

function validasiBiodataAnak(
  input:
    SimpanBiodataAnakInput,
) {
  if (
    input.nikIbuKandung !==
      undefined &&
    input.nikIbuKandung !==
      null
  ) {
    const nikIbu =
      input.nikIbuKandung.trim();

    if (
      nikIbu !== ""
    ) {
      validasiNik(
        nikIbu,
        "NIK ibu kandung",
      );
    }
  }

  if (
    input.anakKe !==
      undefined &&
    input.anakKe !==
      null &&
    (
      !Number.isInteger(
        input.anakKe,
      ) ||
      input.anakKe <=
        0
    )
  ) {
    throw new Error(
      "Anak ke harus berupa bilangan bulat lebih dari 0.",
    );
  }

  if (
    input.imd !==
      undefined &&
    input.imd !==
      null &&
    typeof input.imd !==
      "boolean"
  ) {
    throw new Error(
      "IMD harus berupa boolean.",
    );
  }

  if (
    input.bblGram !==
      undefined &&
    input.bblGram !==
      null &&
    (
      !Number.isFinite(
        input.bblGram,
      ) ||
      input.bblGram <=
        0
    )
  ) {
    throw new Error(
      "Berat badan lahir harus lebih dari 0 gram.",
    );
  }

  if (
    input.pblCm !==
      undefined &&
    input.pblCm !==
      null &&
    (
      !Number.isFinite(
        input.pblCm,
      ) ||
      input.pblCm <=
        0
    )
  ) {
    throw new Error(
      "Panjang badan lahir harus lebih dari 0 cm.",
    );
  }
}

// ============================================================
// VALIDASI BIODATA DEWASA
// ============================================================

function validasiBiodataDewasa(
  input:
    SimpanBiodataDewasaInput,
) {
  if (
    input.nikPasangan !==
      undefined &&
    input.nikPasangan !==
      null
  ) {
    const nikPasangan =
      input.nikPasangan.trim();

    if (
      nikPasangan !== ""
    ) {
      validasiNik(
        nikPasangan,
        "NIK pasangan",
      );
    }
  }

  if (
    input.jumlahAnak !==
      undefined &&
    input.jumlahAnak !==
      null &&
    (
      !Number.isInteger(
        input.jumlahAnak,
      ) ||
      input.jumlahAnak <
        0
    )
  ) {
    throw new Error(
      "Jumlah anak harus berupa bilangan bulat minimal 0.",
    );
  }

  if (
    input.rpdHt !==
      undefined &&
    input.rpdHt !==
      null &&
    typeof input.rpdHt !==
      "boolean"
  ) {
    throw new Error(
      "RPD hipertensi harus berupa boolean.",
    );
  }

  if (
    input.rpdDm !==
      undefined &&
    input.rpdDm !==
      null &&
    typeof input.rpdDm !==
      "boolean"
  ) {
    throw new Error(
      "RPD diabetes melitus harus berupa boolean.",
    );
  }
}

// ============================================================
// GET BIODATA ANAK
// ============================================================

export async function ambilBiodataAnak(
  pesertaNik: string,
) {
  await pastikanPesertaAda(
    pesertaNik,
  );

  const rows =
    await db
      .select()
      .from(
        biodataAnak,
      )
      .where(
        eq(
          biodataAnak.pesertaNik,
          pesertaNik,
        ),
      )
      .limit(1);

  return (
    rows[0] ??
    null
  );
}

// ============================================================
// GET BIODATA DEWASA
// ============================================================

export async function ambilBiodataDewasa(
  pesertaNik: string,
) {
  await pastikanPesertaAda(
    pesertaNik,
  );

  const rows =
    await db
      .select()
      .from(
        biodataDewasa,
      )
      .where(
        eq(
          biodataDewasa.pesertaNik,
          pesertaNik,
        ),
      )
      .limit(1);

  return (
    rows[0] ??
    null
  );
}

// ============================================================
// GET BIODATA PESERTA LENGKAP
// ============================================================

export async function ambilBiodataPeserta(
  pesertaNik: string,
) {
  const dataPeserta =
    await pastikanPesertaAda(
      pesertaNik,
    );

  const anak =
    await ambilBiodataAnak(
      pesertaNik,
    );

  const dewasa =
    await ambilBiodataDewasa(
      pesertaNik,
    );

  return {
    peserta:
      dataPeserta,

    biodataAnak:
      anak,

    biodataDewasa:
      dewasa,
  };
}

// ============================================================
// UPSERT BIODATA ANAK
// ============================================================

export async function simpanBiodataAnak(
  pesertaNik: string,
  input:
    SimpanBiodataAnakInput,
) {
  await pastikanPesertaAda(
    pesertaNik,
  );

  validasiBiodataAnak(
    input,
  );

  const rowsLama =
    await db
      .select({
        pesertaNik:
          biodataAnak.pesertaNik,
      })
      .from(
        biodataAnak,
      )
      .where(
        eq(
          biodataAnak.pesertaNik,
          pesertaNik,
        ),
      )
      .limit(1);

  const sudahAda =
    rowsLama.length >
    0;

  // ==========================================================
  // INSERT
  // ==========================================================

  if (!sudahAda) {
    await db
      .insert(
        biodataAnak,
      )
      .values({
        pesertaNik,

        namaIbuKandung:
          normalisasiText(
            input.namaIbuKandung,
          ),

        nikIbuKandung:
          normalisasiText(
            input.nikIbuKandung,
          ),

        anakKe:
          input.anakKe ??
          null,

        imd:
          input.imd ??
          null,

        bblGram:
          input.bblGram ??
          null,

        pblCm:
          input.pblCm ??
          null,
      });
  } else {
    // ========================================================
    // UPDATE
    // ========================================================

    await db
      .update(
        biodataAnak,
      )
      .set({
        ...(input.namaIbuKandung !==
        undefined
          ? {
              namaIbuKandung:
                normalisasiText(
                  input.namaIbuKandung,
                ),
            }
          : {}),

        ...(input.nikIbuKandung !==
        undefined
          ? {
              nikIbuKandung:
                normalisasiText(
                  input.nikIbuKandung,
                ),
            }
          : {}),

        ...(input.anakKe !==
        undefined
          ? {
              anakKe:
                input.anakKe,
            }
          : {}),

        ...(input.imd !==
        undefined
          ? {
              imd:
                input.imd,
            }
          : {}),

        ...(input.bblGram !==
        undefined
          ? {
              bblGram:
                input.bblGram,
            }
          : {}),

        ...(input.pblCm !==
        undefined
          ? {
              pblCm:
                input.pblCm,
            }
          : {}),

        updatedAt:
          sql`CURRENT_TIMESTAMP`,
      })
      .where(
        eq(
          biodataAnak.pesertaNik,
          pesertaNik,
        ),
      );
  }

  const hasil =
    await ambilBiodataAnak(
      pesertaNik,
    );

  if (!hasil) {
    throw new Error(
      "Biodata anak gagal disimpan.",
    );
  }

  return hasil;
}

// ============================================================
// UPSERT BIODATA DEWASA
// ============================================================

export async function simpanBiodataDewasa(
  pesertaNik: string,
  input:
    SimpanBiodataDewasaInput,
) {
  await pastikanPesertaAda(
    pesertaNik,
  );

  validasiBiodataDewasa(
    input,
  );

  const rowsLama =
    await db
      .select({
        pesertaNik:
          biodataDewasa.pesertaNik,
      })
      .from(
        biodataDewasa,
      )
      .where(
        eq(
          biodataDewasa.pesertaNik,
          pesertaNik,
        ),
      )
      .limit(1);

  const sudahAda =
    rowsLama.length >
    0;

  // ==========================================================
  // INSERT
  // ==========================================================

  if (!sudahAda) {
    await db
      .insert(
        biodataDewasa,
      )
      .values({
        pesertaNik,

        namaPasangan:
          normalisasiText(
            input.namaPasangan,
          ),

        nikPasangan:
          normalisasiText(
            input.nikPasangan,
          ),

        jumlahAnak:
          input.jumlahAnak ??
          null,

        kbYangDiikuti:
          normalisasiText(
            input.kbYangDiikuti,
          ),

        alasanTidakBerKb:
          normalisasiText(
            input.alasanTidakBerKb,
          ),

        rpdHt:
          input.rpdHt ??
          null,

        rpdDm:
          input.rpdDm ??
          null,
      });
  } else {
    // ========================================================
    // UPDATE
    // ========================================================

    await db
      .update(
        biodataDewasa,
      )
      .set({
        ...(input.namaPasangan !==
        undefined
          ? {
              namaPasangan:
                normalisasiText(
                  input.namaPasangan,
                ),
            }
          : {}),

        ...(input.nikPasangan !==
        undefined
          ? {
              nikPasangan:
                normalisasiText(
                  input.nikPasangan,
                ),
            }
          : {}),

        ...(input.jumlahAnak !==
        undefined
          ? {
              jumlahAnak:
                input.jumlahAnak,
            }
          : {}),

        ...(input.kbYangDiikuti !==
        undefined
          ? {
              kbYangDiikuti:
                normalisasiText(
                  input.kbYangDiikuti,
                ),
            }
          : {}),

        ...(input.alasanTidakBerKb !==
        undefined
          ? {
              alasanTidakBerKb:
                normalisasiText(
                  input.alasanTidakBerKb,
                ),
            }
          : {}),

        ...(input.rpdHt !==
        undefined
          ? {
              rpdHt:
                input.rpdHt,
            }
          : {}),

        ...(input.rpdDm !==
        undefined
          ? {
              rpdDm:
                input.rpdDm,
            }
          : {}),

        updatedAt:
          sql`CURRENT_TIMESTAMP`,
      })
      .where(
        eq(
          biodataDewasa.pesertaNik,
          pesertaNik,
        ),
      );
  }

  const hasil =
    await ambilBiodataDewasa(
      pesertaNik,
    );

  if (!hasil) {
    throw new Error(
      "Biodata dewasa gagal disimpan.",
    );
  }

  return hasil;
}

// ============================================================
// DELETE BIODATA ANAK
// ============================================================

export async function hapusBiodataAnak(
  pesertaNik: string,
) {
  await pastikanPesertaAda(
    pesertaNik,
  );

  const lama =
    await ambilBiodataAnak(
      pesertaNik,
    );

  if (!lama) {
    throw new Error(
      "Biodata anak tidak ditemukan.",
    );
  }

  await db
    .delete(
      biodataAnak,
    )
    .where(
      eq(
        biodataAnak.pesertaNik,
        pesertaNik,
      ),
    );

  return {
    pesertaNik,
    berhasil: true,
  };
}

// ============================================================
// DELETE BIODATA DEWASA
// ============================================================

export async function hapusBiodataDewasa(
  pesertaNik: string,
) {
  await pastikanPesertaAda(
    pesertaNik,
  );

  const lama =
    await ambilBiodataDewasa(
      pesertaNik,
    );

  if (!lama) {
    throw new Error(
      "Biodata dewasa tidak ditemukan.",
    );
  }

  await db
    .delete(
      biodataDewasa,
    )
    .where(
      eq(
        biodataDewasa.pesertaNik,
        pesertaNik,
      ),
    );

  return {
    pesertaNik,
    berhasil: true,
  };
}