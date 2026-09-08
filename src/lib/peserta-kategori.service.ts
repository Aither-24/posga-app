import { ambilPesertaByNik } from "./peserta.service.js";
import { tentukanKategoriUsia } from "./kategori.js";

export async function ambilPesertaDenganKategori(
  nik: string,
  tanggalPemeriksaan: string,
) {
  const dataPeserta = await ambilPesertaByNik(nik);

  if (!dataPeserta) {
    throw new Error("Peserta tidak ditemukan.");
  }

  const klasifikasi = tentukanKategoriUsia(
    dataPeserta.tanggalLahir,
    tanggalPemeriksaan,
  );

  return {
    peserta: dataPeserta,

    pemeriksaan: {
      tanggal: tanggalPemeriksaan,

      umur: klasifikasi.umur,

      umurTeks:
        `${klasifikasi.umur.tahun} tahun ` +
        `${klasifikasi.umur.bulan} bulan ` +
        `${klasifikasi.umur.hari} hari`,

      kategori: klasifikasi.kategori,
    },
  };
}
