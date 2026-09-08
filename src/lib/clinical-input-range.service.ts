export interface RentangAngkaKlinis {
  min: number;
  max: number;
  integer?: boolean;
  label: string;
  satuan?: string;
}

/*
 * Plausibility guard, bukan batas diagnosis.
 * Rentang dibuat lebar untuk menolak typo/angka anatomis yang jelas tidak masuk akal
 * tanpa menggantikan interpretasi klinis pada derived indicator.
 */
const RENTANG: Record<string, RentangAngkaKlinis> = {
  BB: { min: 0.3, max: 350, label: "Berat badan", satuan: "kg" },
  PB: { min: 25, max: 130, label: "Panjang badan", satuan: "cm" },
  TB: { min: 40, max: 250, label: "Tinggi badan", satuan: "cm" },
  LIKA: { min: 20, max: 80, label: "Lingkar kepala", satuan: "cm" },
  LILA: { min: 5, max: 80, label: "Lingkar lengan atas", satuan: "cm" },
  LIPE: { min: 40, max: 200, label: "Lingkar perut", satuan: "cm" },
  TD_SISTOLIK: { min: 40, max: 300, label: "Tekanan darah sistolik", satuan: "mmHg" },
  TD_DIASTOLIK: { min: 20, max: 200, label: "Tekanan darah diastolik", satuan: "mmHg" },
  ROT: { min: 0, max: 100, label: "Roll Over Test" },
  GDA_GDP: { min: 20, max: 800, label: "Gula darah", satuan: "mg/dL" },
  GDA: { min: 20, max: 800, label: "Gula darah sewaktu", satuan: "mg/dL" },
  HB: { min: 2, max: 25, label: "Hemoglobin", satuan: "g/dL" },
  JUMLAH_TTD: { min: 0, max: 1000, integer: true, label: "Jumlah tablet tambah darah", satuan: "tablet" },
  KOLESTEROL_1: { min: 50, max: 800, label: "Kolesterol", satuan: "mg/dL" },
  KOLESTEROL_2: { min: 50, max: 800, label: "Kolesterol", satuan: "mg/dL" },
};

export function validasiPlausibilitasAngka(
  indikatorKode: string,
  nilai: number,
) {
  if (!Number.isFinite(nilai)) {
    throw new Error("Nilai angka tidak valid.");
  }

  const rentang = RENTANG[indikatorKode];

  if (!rentang) {
    return;
  }

  if (rentang.integer && !Number.isInteger(nilai)) {
    throw new Error(`${rentang.label} harus berupa bilangan bulat.`);
  }

  if (nilai < rentang.min || nilai > rentang.max) {
    const satuan = rentang.satuan ? ` ${rentang.satuan}` : "";
    throw new Error(
      `${rentang.label} di luar rentang input yang masuk akal (${rentang.min}-${rentang.max}${satuan}). Periksa kembali satuan atau angka yang dimasukkan.`,
    );
  }
}
