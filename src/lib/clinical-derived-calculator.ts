// ============================================================
// POSGA - KALKULATOR DERIVED KLINIS
// ============================================================
//
// Referensi yang dipakai:
// - Obesitas dewasa: klasifikasi IMT Asia Pasifik Kemenkes.
// - Hipertensi dewasa/lansia: klasifikasi skrining PTM SATUSEHAT.
// - Gula Darah Sewaktu: interpretasi skrining PTM SATUSEHAT.
// - Anemia: WHO 2024 haemoglobin cut-offs.
//
// Modul ini murni (tanpa DB) supaya mudah diregression-test.
// ============================================================

export type StatusObesitas =
  | "KURANG"
  | "NORMAL"
  | "OVERWEIGHT"
  | "OBESITAS_1"
  | "OBESITAS_2";

export type StatusDiabetes =
  | "NORMAL"
  | "PREDIABETES"
  | "DM";

export type StatusHipertensi =
  | "NORMAL"
  | "PREHIPERTENSI"
  | "HIPERTENSI_1"
  | "HIPERTENSI_2"
  | "HIPERTENSI_3"
  | "HT_SISTOLIK_TERISOLASI";

export type StatusAnemia =
  | "NORMAL"
  | "RINGAN"
  | "SEDANG"
  | "BERAT";

export function hitungImt(
  beratKg: number,
  tinggiCm: number,
): number | null {
  if (
    !Number.isFinite(beratKg) ||
    !Number.isFinite(tinggiCm) ||
    beratKg <= 0 ||
    tinggiCm <= 0
  ) {
    return null;
  }

  return beratKg / ((tinggiCm / 100) ** 2);
}

export function klasifikasiObesitasAsiaPasifik(
  imt: number,
): StatusObesitas | null {
  if (!Number.isFinite(imt) || imt <= 0) return null;

  if (imt < 18.5) return "KURANG";
  if (imt < 23) return "NORMAL";
  if (imt < 25) return "OVERWEIGHT";
  if (imt < 30) return "OBESITAS_1";
  return "OBESITAS_2";
}

export function klasifikasiGds(
  nilaiMgDl: number,
): StatusDiabetes | null {
  if (!Number.isFinite(nilaiMgDl) || nilaiMgDl <= 0) {
    return null;
  }

  // Terminologi skrining PTM SATUSEHAT:
  // <140 normal, 140-199.9 prediabetes, >=200 DM.
  if (nilaiMgDl < 140) return "NORMAL";
  if (nilaiMgDl < 200) return "PREDIABETES";
  return "DM";
}

export function klasifikasiTekananDarahDewasa(
  sistolik: number,
  diastolik: number,
): StatusHipertensi | null {
  if (
    !Number.isFinite(sistolik) ||
    !Number.isFinite(diastolik) ||
    sistolik <= 0 ||
    diastolik <= 0
  ) {
    return null;
  }

  // Sistolik terisolasi adalah pola khusus: sistolik >=140,
  // diastolik <90.
  if (sistolik >= 140 && diastolik < 90) {
    return "HT_SISTOLIK_TERISOLASI";
  }

  // Gunakan derajat tertinggi bila sistolik/diastolik berbeda kelas.
  if (sistolik >= 180 || diastolik >= 110) {
    return "HIPERTENSI_3";
  }

  if (sistolik >= 160 || diastolik >= 100) {
    return "HIPERTENSI_2";
  }

  if (sistolik >= 140 || diastolik >= 90) {
    return "HIPERTENSI_1";
  }

  // Master POSGA hanya memiliki NORMAL + PREHIPERTENSI,
  // sehingga Optimal ( <120/<80 ) dan Normal (120-129/80-84)
  // digabung sebagai NORMAL; Normal Tinggi menjadi PREHIPERTENSI.
  if (sistolik >= 130 || diastolik >= 85) {
    return "PREHIPERTENSI";
  }

  return "NORMAL";
}

export interface KonteksAnemia {
  umurTahun: number;
  jenisKelamin: "L" | "P";
  kategori:
    | "bayi"
    | "balita"
    | "prasekolah"
    | "sekolah"
    | "dewasa"
    | "lansia"
    | "ibu_hamil"
    | "ibu_nifas";
  trimesterKehamilan?: 1 | 2 | 3 | null;
}

export function klasifikasiAnemia(
  hbGdl: number,
  context: KonteksAnemia,
): StatusAnemia | null {
  if (!Number.isFinite(hbGdl) || hbGdl <= 0) {
    return null;
  }

  let normalMin: number;
  let ringanMin: number;
  let sedangMin: number;

  if (context.kategori === "ibu_hamil") {
    if (!context.trimesterKehamilan) {
      // Trimester diperlukan karena WHO 2024 membedakan trimester 2.
      return null;
    }

    normalMin =
      context.trimesterKehamilan === 2
        ? 10.5
        : 11.0;

    ringanMin =
      context.trimesterKehamilan === 2
        ? 9.5
        : 10.0;

    sedangMin = 7.0;
  } else if (
    context.kategori === "ibu_nifas" ||
    (
      context.jenisKelamin === "P" &&
      context.umurTahun >= 15
    )
  ) {
    normalMin = 12.0;
    ringanMin = 11.0;
    sedangMin = 8.0;
  } else if (context.umurTahun >= 12) {
    normalMin = 12.0;
    ringanMin = 11.0;
    sedangMin = 8.0;
  } else if (context.umurTahun >= 5) {
    normalMin = 11.5;
    ringanMin = 11.0;
    sedangMin = 8.0;
  } else {
    return null;
  }

  if (hbGdl >= normalMin) return "NORMAL";
  if (hbGdl >= ringanMin) return "RINGAN";
  if (hbGdl >= sedangMin) return "SEDANG";
  return "BERAT";
}

export function zScoreMasukRentangWho(
  jenis: "WAZ" | "HAZ" | "WHZ" | "BAZ" | "HCZ",
  z: number | null,
): number | null {
  if (z === null || !Number.isFinite(z)) return null;

  const rentang = {
    WAZ: [-6, 5],
    HAZ: [-6, 6],
    WHZ: [-5, 5],
    BAZ: [-5, 5],
    HCZ: [-5, 5],
  } as const;

  const [min, max] = rentang[jenis];

  if (z < min || z > max) {
    return null;
  }

  return z;
}


export type StatusLingkarPerut =
  | "TIDAK_VALID"
  | "NORMAL"
  | "OBESITAS_SENTRAL";

export type JenisKunjunganNifas =
  | "KF1"
  | "KF2"
  | "KF3"
  | "KF4";

export function hitungMap(
  sistolik: number,
  diastolik: number,
): number | null {
  if (
    !Number.isFinite(sistolik) ||
    !Number.isFinite(diastolik) ||
    sistolik <= 0 ||
    diastolik <= 0
  ) {
    return null;
  }

  return (
    sistolik +
    (2 * diastolik)
  ) / 3;
}

export function klasifikasiLingkarPerutAsia(
  lingkarPerutCm: number,
  jenisKelamin: "L" | "P",
): StatusLingkarPerut | null {
  if (
    !Number.isFinite(lingkarPerutCm)
  ) {
    return null;
  }

  // Plausibility guard untuk pengukuran lingkar perut dewasa/lansia.
  // Nilai sangat kecil seperti 5 cm bukan ukuran anatomi yang masuk akal
  // dan tidak boleh diterjemahkan sebagai "Normal".
  if (
    lingkarPerutCm < 40 ||
    lingkarPerutCm > 200
  ) {
    return "TIDAK_VALID";
  }

  // Batas yang digunakan POSGA mengikuti kriteria obesitas sentral
  // populasi Asia/Indonesia: laki-laki >90 cm, perempuan >80 cm.
  const batas =
    jenisKelamin === "L"
      ? 90
      : 80;

  return lingkarPerutCm > batas
    ? "OBESITAS_SENTRAL"
    : "NORMAL";
}

function tanggalUtcLokal(value: string) {
  const [tahun, bulan, hari] =
    value.split("-").map(Number);

  if (!tahun || !bulan || !hari) {
    return null;
  }

  return new Date(
    Date.UTC(
      tahun,
      bulan - 1,
      hari,
    ),
  );
}

export function klasifikasiKunjunganNifas(
  tanggalMelahirkan: string,
  tanggalKunjungan: string,
): JenisKunjunganNifas | null {
  const melahirkan =
    tanggalUtcLokal(tanggalMelahirkan);
  const kunjungan =
    tanggalUtcLokal(tanggalKunjungan);

  if (!melahirkan || !kunjungan) {
    return null;
  }

  const hari =
    Math.floor(
      (
        kunjungan.getTime() -
        melahirkan.getTime()
      ) /
      86_400_000,
    );

  if (hari < 0 || hari > 42) {
    return null;
  }

  if (hari <= 2) return "KF1";
  if (hari <= 7) return "KF2";
  if (hari <= 28) return "KF3";
  return "KF4";
}
