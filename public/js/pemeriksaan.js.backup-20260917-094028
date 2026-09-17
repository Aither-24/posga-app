document.addEventListener("alpine:init", () => {
  Alpine.data("pemeriksaanPage", () => ({
    loading: true,
    loadingForm: false,
    saving: false,
    error: "",
    success: "",

    sesiId: null,
    kategori: "",
    targetPesertaSesiId: null,
    kembaliUrl: "",
    sesi: null,
    posyandu: null,
    roster: [],
    pesertaAktif: null,
    formData: null,

    tabAktif: "pemeriksaan",
    modeEdit: false,

    nilai: {},
    nilaiAwal: {},

    nilaiSkrining: {},
    nilaiSkriningAwal: {},

    nilaiKonseling: {},
    nilaiKonselingAwal: {},

    progresPemeriksaanPeserta: {},
    progresSkriningPeserta: {},
    progresKonselingPeserta: {},

    riwayatSkriningTerbuka: false,
    loadingRiwayatSkrining: false,
    riwayatSkrining: [],
    errorRiwayatSkrining: "",

    kategoriLabel: {
      bayi: "Bayi",
      balita: "Balita",
      prasekolah: "Prasekolah",
      sekolah: "Sekolah",
      dewasa: "Dewasa",
      lansia: "Lansia",
      ibu_hamil: "Ibu Hamil",
      ibu_nifas: "Ibu Nifas",
    },

    async init() {
      const params =
        new URLSearchParams(
          window.location.search,
        );

      const sesiId =
        Number(
          params.get("sesi"),
        );

      const kategori =
        params.get("kategori") ??
        "";

      const pesertaSesiId =
        Number(
          params.get("pesertaSesi"),
        );

      const kembali =
        params.get("kembali") ??
        "";

      this.kembaliUrl =
        kembali.startsWith("/sesi/")
          ? kembali
          : "";

      if (
        !Number.isInteger(sesiId) ||
        sesiId <= 0 ||
        !this.kategoriLabel[
          kategori
        ]
      ) {
        this.error =
          "Sesi atau kategori pemeriksaan tidak valid.";

        this.loading =
          false;

        return;
      }

      this.sesiId =
        sesiId;

      this.kategori =
        kategori;

      this.targetPesertaSesiId =
        Number.isInteger(pesertaSesiId) &&
        pesertaSesiId > 0
          ? pesertaSesiId
          : null;

      await this.muatHalaman();
    },

    get daftarPeserta() {
      return this.roster.filter(
        (item) =>
          item.kategori ===
          this.kategori,
      );
    },

    get dapatEdit() {
      return (
        this.sesi?.status !==
          "dibatalkan" &&
        this.pesertaAktif &&
        ![
          "tidak_hadir",
          "batal",
        ].includes(
          this.pesertaAktif
            .statusPemeriksaan,
        )
      );
    },

    get judulKategori() {
      return (
        this.kategoriLabel[
          this.kategori
        ] ??
        this.kategori
      );
    },

    pesertaSesiId(item) {
      return Number(
        item?.pesertaSesiId ??
        item?.pesertaSesiPosgaId,
      );
    },

    progresPeserta(item) {
      const sumber =
        this.tabAktif === "skrining"
          ? this.progresSkriningPeserta
          : this.tabAktif === "konseling"
            ? this.progresKonselingPeserta
            : this.progresPemeriksaanPeserta;

      return (
        sumber[
          this.pesertaSesiId(
            item,
          )
        ] ??
        null
      );
    },

    statusPemeriksaanLabel(item) {
      const progres =
        this.progresPeserta(
          item,
        );

      if (progres) {
        if (
          progres.wajib ===
            0 ||
          progres.terisi >=
            progres.wajib
        ) {
          return "Selesai";
        }

        if (
          progres.terisi >
          0
        ) {
          return `${progres.terisi}/${progres.wajib}`;
        }

        return "Belum";
      }

      if (
        item?.statusPemeriksaan ===
        "belum_diperiksa"
      ) {
        return "Belum";
      }

      if (
        item?.statusPemeriksaan ===
          "tidak_hadir"
      ) {
        return "Tidak hadir";
      }

      if (
        item?.statusPemeriksaan ===
          "batal"
      ) {
        return "Batal";
      }

      return "Ada data";
    },

    statusPemeriksaanClass(item) {
      const progres =
        this.progresPeserta(
          item,
        );

      if (
        progres &&
        (
          progres.wajib ===
            0 ||
          progres.terisi >=
            progres.wajib
        )
      ) {
        return "bg-emerald-100 text-emerald-700";
      }

      if (
        progres &&
        progres.terisi >
          0
      ) {
        return "bg-amber-100 text-amber-700";
      }

      if (
        item?.statusPemeriksaan ===
          "tidak_hadir" ||
        item?.statusPemeriksaan ===
          "batal"
      ) {
        return "bg-red-100 text-red-700";
      }

      if (
        item?.statusPemeriksaan !==
          "belum_diperiksa"
      ) {
        return "bg-blue-100 text-blue-700";
      }

      return "bg-slate-100 text-slate-600";
    },

    umurBulanAktif() {
      const umur =
        this.formData?.umur;

      if (!umur) return null;

      const tahun =
        Number(umur.tahun ?? 0);
      const bulan =
        Number(umur.bulan ?? 0);

      if (
        !Number.isFinite(tahun) ||
        !Number.isFinite(bulan)
      ) {
        return null;
      }

      return (tahun * 12) + bulan;
    },

    labelSingkat(item) {
      const umurBulan =
        this.umurBulanAktif();

      if (item?.kode === "TB_U") {
        return (
          umurBulan !== null &&
          umurBulan < 24
        )
          ? "PB/U"
          : "TB/U";
      }

      if (item?.kode === "BB_TB") {
        return (
          umurBulan !== null &&
          umurBulan < 24
        )
          ? "BB/PB"
          : "BB/TB";
      }

      if (item?.kode === "STATUS_TB_U") {
        return (
          umurBulan !== null &&
          umurBulan < 24
        )
          ? "Status Gizi PB/U"
          : "Status Gizi TB/U";
      }

      if (item?.kode === "STATUS_BB_TB") {
        return (
          umurBulan !== null &&
          umurBulan < 24
        )
          ? "Status Gizi BB/PB"
          : "Status Gizi BB/TB";
      }

      const map = {
        STATUS_LILA:
          "Status Gizi LILA",
        KESIMPULAN_ANAK:
          "Kesimpulan",
        LAYANAN_MEDIS:
          "Layanan Medis",
        ALASAN_RUJUK:
          "Alasan Rujuk / KR",
        STATUS_BB_U:
          "Status Gizi BB/U",
        STATUS_TB_U:
          "Status Gizi TB/U",
        STATUS_BB_TB:
          "Status Gizi BB/TB",
        STATUS_LIKA:
          "Status Lingkar Kepala",
        STATUS_IMT_BALITA:
          "Status Gizi IMT",
        JUMLAH_TTD:
          "Tablet Tambah Darah",
        STATUS_HIPERTENSI:
          "Status Tekanan Darah",
        STATUS_HT_NIFAS:
          "Status Tekanan Darah Nifas",
        STATUS_OBESITAS:
          "Status IMT",
        STATUS_DM:
          "Status Gula Darah",
        STATUS_IMT_U:
          "Status Gizi IMT/U",
        STATUS_LIPE:
          "Status Lingkar Perut",
        MAP:
          "MAP",
        STATUS_PREEKLAMPSIA:
          "Status Preeklampsia",
        JENIS_KUNJUNGAN_HAMIL:
          "Kunjungan Kehamilan",
        JENIS_KUNJUNGAN_NIFAS:
          "Kunjungan Nifas",
      };

      return (
        map[item?.kode] ??
        item?.indikatorNama ??
        item?.nama ??
        "-"
      );
    },

    get perubahanAda() {
      const sekarang =
        this.tabAktif === "skrining"
          ? this.nilaiSkrining
          : this.tabAktif === "konseling"
            ? this.nilaiKonseling
            : this.nilai;

      const awal =
        this.tabAktif === "skrining"
          ? this.nilaiSkriningAwal
          : this.tabAktif === "konseling"
            ? this.nilaiKonselingAwal
            : this.nilaiAwal;

      return (
        JSON.stringify(
          sekarang,
        ) !==
        JSON.stringify(
          awal,
        )
      );
    },

    get progresTabAktif() {
      return this.tabAktif === "skrining"
        ? this.formData?.progres?.skrining
        : this.tabAktif === "konseling"
          ? this.formData?.progres?.konseling
          : this.formData?.progres?.pemeriksaan;
    },

    get judulProgres() {
      return this.tabAktif === "skrining"
        ? "Progres skrining"
        : this.tabAktif === "konseling"
          ? "Progres konseling"
          : "Progres pemeriksaan";
    },

    get skriningTersedia() {
      return (
        this.formData?.skrining ?? []
      ).filter(
        (item) =>
          !item.hasilSaatIni &&
          (
            item.statusKelayakan === "tampil" ||
            item.statusKelayakan === "sesuai_indikasi"
          ),
      );
    },

    get jumlahSkriningTersedia() {
      return this.skriningTersedia.length;
    },

    get jumlahSkriningWajibBelumTerisi() {
      return this.skriningTersedia.filter(
        (item) => item.wajib === true,
      ).length;
    },

    get adaNotifikasiSkrining() {
      return this.jumlahSkriningTersedia > 0;
    },

    urlTulis(path) {
      if (
        this.sesi?.status ===
        "selesai"
      ) {
        const pemisah =
          path.includes("?")
            ? "&"
            : "?";

        return `${path}${pemisah}koreksi=1`;
      }

      return path;
    },

    async muatHalaman() {
      this.loading =
        true;

      this.error =
        "";

      try {
        const [
          sesiPayload,
          rosterPayload,
        ] =
          await Promise.all([
            window.PosgaApi.request(
              `/api/sesi/${this.sesiId}`,
            ),

            window.PosgaApi.request(
              `/api/sesi/${this.sesiId}/peserta`,
            ),
          ]);

        this.sesi =
          sesiPayload?.data ??
          null;

        this.roster =
          Array.isArray(
            rosterPayload?.data,
          )
            ? rosterPayload.data
            : [];

        if (
          this.sesi?.posyanduId
        ) {
          try {
            const p =
              await window.PosgaApi.request(
                `/api/posyandu/${this.sesi.posyanduId}`,
              );

            this.posyandu =
              p?.data ?? null;
          } catch {
            this.posyandu =
              null;
          }
        }

        const target =
          this.targetPesertaSesiId
            ? this.daftarPeserta.find(
                (item) =>
                  this.pesertaSesiId(item) ===
                  this.targetPesertaSesiId,
              )
            : null;

        const pertama =
          target ??
          this.daftarPeserta[0];

        if (pertama) {
          await this.pilihPeserta(
            pertama,
            true,
          );
        }
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Halaman pemeriksaan gagal dimuat.";
      } finally {
        this.loading =
          false;
      }
    },

    async pilihPeserta(
      item,
      paksa = false,
    ) {
      if (
        !paksa &&
        this.modeEdit &&
        this.perubahanAda
      ) {
        const lanjut =
          window.confirm(
            "Perubahan belum disimpan. Buang perubahan dan pindah peserta?",
          );

        if (!lanjut) {
          return;
        }
      }

      this.modeEdit =
        false;

      this.success =
        "";

      this.pesertaAktif =
        item;

      await this.muatForm(
        item.pesertaSesiId ??
        item.pesertaSesiPosgaId,
      );
    },

    async muatForm(
      pesertaSesiId,
    ) {
      this.loadingForm =
        true;

      this.error =
        "";

      try {
        const payload =
          await window.PosgaApi.request(
            `/api/peserta-sesi/${pesertaSesiId}/form`,
          );

        this.formData =
          payload?.data ??
          null;

        if (
          this.formData
            ?.pesertaSesiId
        ) {
          if (
            this.formData
              ?.progres
              ?.pemeriksaan
          ) {
            this.progresPemeriksaanPeserta[
              this.formData
                .pesertaSesiId
            ] =
              this.salinDataSederhana(
                this.formData
                  .progres
                  .pemeriksaan,
              );
          }

          if (
            this.formData
              ?.progres
              ?.skrining
          ) {
            this.progresSkriningPeserta[
              this.formData
                .pesertaSesiId
            ] =
              this.salinDataSederhana(
                this.formData
                  .progres
                  .skrining,
              );
          }

          if (
            this.formData
              ?.progres
              ?.konseling
          ) {
            this.progresKonselingPeserta[
              this.formData
                .pesertaSesiId
            ] =
              this.salinDataSederhana(
                this.formData
                  .progres
                  .konseling,
              );
          }
        }

        this.isiNilaiDariForm();
        this.isiNilaiSkriningDariForm();
        this.isiNilaiKonselingDariForm();
      } catch (error) {
        this.formData =
          null;

        this.error =
          error instanceof Error
            ? error.message
            : "Form pemeriksaan gagal dimuat.";
      } finally {
        this.loadingForm =
          false;
      }
    },

    opsiItem(item) {
      const sumber =
        item?.opsi ??
        item?.opsiIndikator ??
        item?.daftarOpsi ??
        [];

      return Array.isArray(
        sumber,
      )
        ? sumber
        : [];
    },

    salinDataSederhana(value) {
      // State Alpine adalah Proxy dan tidak aman diberikan langsung
      // ke this.salinDataSederhana(). Data form di halaman ini hanya berisi
      // object/array/primitive JSON-safe, jadi salinan JSON lebih stabil.
      return JSON.parse(
        JSON.stringify(
          value ?? {},
        ),
      );
    },

    isiNilaiDariForm() {
      const hasil =
        {};

      for (
        const item of
          this.formData
            ?.pemeriksaan ??
          []
      ) {
        const sekarang =
          item.hasilSaatIni;

        if (
          item.tipeInput ===
          "number"
        ) {
          hasil[item.indikatorId] =
            sekarang?.nilaiNumber ??
            "";
        } else if (
          item.tipeInput ===
          "text"
        ) {
          hasil[item.indikatorId] =
            sekarang?.nilaiText ??
            "";
        } else if (
          item.tipeInput ===
          "boolean"
        ) {
          hasil[item.indikatorId] =
            sekarang?.nilaiBoolean ===
            true
              ? "true"
              : sekarang?.nilaiBoolean ===
                  false
                ? "false"
                : "";
        } else if (
          item.tipeInput ===
          "date"
        ) {
          hasil[item.indikatorId] =
            sekarang?.nilaiDate ??
            "";
        } else if (
          item.tipeInput ===
          "select"
        ) {
          hasil[item.indikatorId] =
            sekarang?.opsiId
              ? String(
                  sekarang.opsiId,
                )
              : "";
        } else if (
          item.tipeInput ===
          "multiselect"
        ) {
          hasil[item.indikatorId] =
            Array.isArray(
              sekarang?.opsiTerpilih,
            )
              ? sekarang.opsiTerpilih.map(
                  (opsi) =>
                    String(
                      opsi.id,
                    ),
                )
              : [];
        }
      }

      this.nilai =
        this.salinDataSederhana(
          hasil,
        );

      this.nilaiAwal =
        this.salinDataSederhana(
          hasil,
        );
    },


    isiNilaiSkriningDariForm() {
      const hasil = {};

      for (
        const item of
          this.formData
            ?.skrining ??
          []
      ) {
        const sekarang =
          item.hasilSaatIni;

        if (
          item.tipeInput ===
          "number"
        ) {
          hasil[item.indikatorId] =
            sekarang?.nilaiNumber ??
            "";
        } else if (
          item.tipeInput ===
          "text"
        ) {
          hasil[item.indikatorId] =
            sekarang?.nilaiText ??
            "";
        } else if (
          item.tipeInput ===
          "boolean"
        ) {
          hasil[item.indikatorId] =
            sekarang?.nilaiBoolean ===
            true
              ? "true"
              : sekarang?.nilaiBoolean ===
                  false
                ? "false"
                : "";
        } else if (
          item.tipeInput ===
          "select"
        ) {
          hasil[item.indikatorId] =
            sekarang?.opsiId
              ? String(
                  sekarang.opsiId,
                )
              : "";
        }
      }

      this.nilaiSkrining =
        this.salinDataSederhana(
          hasil,
        );

      this.nilaiSkriningAwal =
        this.salinDataSederhana(
          hasil,
        );
    },

    skriningBisaDiisi(item) {
      return [
        "tampil",
        "sesuai_indikasi",
      ].includes(
        item?.statusKelayakan,
      );
    },

    skriningStatusLabel(item) {
      const map = {
        tampil:
          item?.wajib
            ? "Wajib"
            : "Tersedia",
        belum_jatuh_tempo:
          "Belum waktu skrining",
        sudah_selesai:
          "Terpenuhi",
        sesuai_indikasi:
          "Indikasi",
      };

      return (
        map[
          item?.statusKelayakan
        ] ??
        item?.statusKelayakan ??
        "-"
      );
    },

    skriningStatusClass(item) {
      if (
        item?.hasilSaatIni
      ) {
        return "bg-emerald-100 text-emerald-700";
      }

      if (
        item?.statusKelayakan ===
        "sudah_selesai"
      ) {
        return "bg-blue-100 text-blue-700";
      }

      if (
        item?.statusKelayakan ===
        "belum_jatuh_tempo"
      ) {
        return "bg-slate-100 text-slate-600";
      }

      if (
        item?.statusKelayakan ===
        "sesuai_indikasi"
      ) {
        return "bg-purple-100 text-purple-700";
      }

      return item?.wajib
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";
    },

    frekuensiLabel(item) {
      const map = {
        setiap_sesi:
          "Setiap sesi",
        tahunan:
          "Tahunan",
        dua_kali_tahun:
          "2× setahun",
        sekali_seumur_hidup:
          "Sekali seumur hidup",
        usia_tertentu:
          "Usia tertentu",
        sesuai_indikasi:
          "Sesuai indikasi",
        manual:
          "Manual",
      };

      return (
        map[item?.frekuensi] ??
        item?.frekuensi ??
        "-"
      );
    },

    tanggalRingkas(value) {
      if (!value) return "-";

      const [tahun, bulan, hari] =
        String(value)
          .split("-")
          .map(Number);

      if (
        !tahun ||
        !bulan ||
        !hari
      ) {
        return String(value);
      }

      return new Intl.DateTimeFormat(
        "id-ID",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
      ).format(
        new Date(
          Date.UTC(
            tahun,
            bulan - 1,
            hari,
          ),
        ),
      );
    },

    tampilRiwayatSkrining(item) {
      const riwayat =
        item?.riwayatTerakhir;

      if (!riwayat) {
        return "";
      }

      return `Terakhir ${this.tanggalRingkas(riwayat.tanggalSkrining)}`;
    },

    keteranganSkrining(item) {
      if (
        item?.statusKelayakan ===
        "tampil" &&
        item?.frekuensi ===
        "manual"
      ) {
        return "Skrining tersedia secara manual.";
      }

      if (
        item?.statusKelayakan ===
        "belum_jatuh_tempo" &&
        item?.riwayatTerakhir
      ) {
        return this.tampilRiwayatSkrining(
          item,
        );
      }

      return "";
    },

    tampilNilaiSkrining(item) {
      const hasil =
        item?.hasilSaatIni;

      if (!hasil) {
        if (
          item?.riwayatTerakhir
        ) {
          return this.tampilRiwayatSkrining(
            item,
          );
        }

        return this.skriningStatusLabel(
          item,
        );
      }

      if (
        item.tipeInput ===
        "number"
      ) {
        return `${hasil.nilaiNumber ?? "-"}${item.satuan ? ` ${item.satuan}` : ""}`;
      }

      if (
        item.tipeInput ===
        "text"
      ) {
        return (
          hasil.nilaiText ??
          "-"
        );
      }

      if (
        item.tipeInput ===
        "boolean"
      ) {
        return hasil.nilaiBoolean ===
          true
          ? "Ya"
          : hasil.nilaiBoolean ===
              false
            ? "Tidak"
            : "-";
      }

      if (
        item.tipeInput ===
        "select"
      ) {
        const opsi =
          this.opsiItem(
            item,
          ).find(
            (x) =>
              Number(x.id) ===
              Number(
                hasil.opsiId,
              ),
          );

        return (
          opsi?.label ??
          "-"
        );
      }

      return "-";
    },

    nilaiSkriningKosong(item) {
      const value =
        this.nilaiSkrining[
          item.indikatorId
        ];

      return (
        value === "" ||
        value === null ||
        value === undefined
      );
    },

    payloadNilaiSkrining(item) {
      const value =
        this.nilaiSkrining[
          item.indikatorId
        ];

      if (
        item.tipeInput ===
        "number"
      ) {
        return {
          nilaiNumber:
            Number(value),
        };
      }

      if (
        item.tipeInput ===
        "text"
      ) {
        return {
          nilaiText:
            String(value),
        };
      }

      if (
        item.tipeInput ===
        "boolean"
      ) {
        return {
          nilaiBoolean:
            value === "true",
        };
      }

      if (
        item.tipeInput ===
        "select"
      ) {
        return {
          opsiId:
            Number(value),
        };
      }

      return {};
    },

    async gantiTab(tab) {
      if (
        ![
          "pemeriksaan",
          "skrining",
          "konseling",
        ].includes(tab) ||
        tab === this.tabAktif
      ) {
        return;
      }

      if (
        this.modeEdit &&
        this.perubahanAda
      ) {
        const lanjut =
          window.confirm(
            "Perubahan belum disimpan. Buang perubahan dan pindah tab?",
          );

        if (!lanjut) {
          return;
        }
      }

      this.modeEdit =
        false;
      this.success =
        "";
      this.tabAktif =
        tab;
    },


    isiNilaiKonselingDariForm() {
      const hasil = {};

      for (
        const item of
          this.formData
            ?.konseling ??
          []
      ) {
        const sekarang =
          item.hasilSaatIni;

        if (
          item.tipeInput ===
          "multiselect"
        ) {
          hasil[item.indikatorId] =
            (
              sekarang
                ?.opsiTerpilih ??
              []
            ).map(
              (opsi) =>
                String(opsi.id),
            );
        } else if (
          item.tipeInput ===
          "select"
        ) {
          hasil[item.indikatorId] =
            sekarang?.opsiId
              ? String(
                  sekarang.opsiId,
                )
              : "";
        } else {
          hasil[item.indikatorId] =
            "";
        }
      }

      this.nilaiKonseling =
        this.salinDataSederhana(
          hasil,
        );

      this.nilaiKonselingAwal =
        this.salinDataSederhana(
          hasil,
        );
    },

    konselingBisaDiisi(item) {
      return (
        item?.statusKelayakan ===
        "tampil"
      );
    },

    konselingDipilih(
      item,
      opsi,
    ) {
      return (
        this.nilaiKonseling[
          item.indikatorId
        ] ??
        []
      ).includes(
        String(opsi.id),
      );
    },

    toggleKonseling(
      item,
      opsi,
      checked,
    ) {
      const sekarang =
        [
          ...(
            this.nilaiKonseling[
              item.indikatorId
            ] ??
            []
          ),
        ];

      const id =
        String(opsi.id);

      const next =
        checked
          ? Array.from(
              new Set([
                ...sekarang,
                id,
              ]),
            )
          : sekarang.filter(
              (value) =>
                value !== id,
            );

      this.nilaiKonseling[
        item.indikatorId
      ] = next;
    },

    tampilNilaiKonseling(item) {
      const hasil =
        item?.hasilSaatIni;

      if (!hasil) {
        return "Belum diberikan";
      }

      if (
        item.tipeInput ===
        "select"
      ) {
        return (
          hasil.opsiTerpilih?.[0]
            ?.label ??
          "-"
        );
      }

      if (
        item.tipeInput ===
        "multiselect"
      ) {
        const labels =
          (
            hasil.opsiTerpilih ??
            []
          ).map(
            (opsi) =>
              opsi.label,
          );

        return labels.length
          ? labels.join(", ")
          : "-";
      }

      return "-";
    },

    nilaiKonselingKosong(item) {
      const value =
        this.nilaiKonseling[
          item.indikatorId
        ];

      if (
        item.tipeInput ===
        "multiselect"
      ) {
        return (
          !Array.isArray(value) ||
          value.length === 0
        );
      }

      return (
        value === "" ||
        value === null ||
        value === undefined
      );
    },

    payloadKonseling(item) {
      const value =
        this.nilaiKonseling[
          item.indikatorId
        ];

      if (
        item.tipeInput ===
        "select"
      ) {
        return {
          opsiId:
            Number(value),
        };
      }

      if (
        item.tipeInput ===
        "multiselect"
      ) {
        return {
          opsiIds:
            (
              value ??
              []
            ).map(Number),
        };
      }

      return {};
    },

    async bukaRiwayatSkrining() {
      if (
        !this.formData
          ?.pesertaNik
      ) {
        return;
      }

      this.riwayatSkriningTerbuka =
        true;

      this.loadingRiwayatSkrining =
        true;

      this.errorRiwayatSkrining =
        "";

      try {
        const payload =
          await window.PosgaApi.request(
            `/api/peserta/${encodeURIComponent(this.formData.pesertaNik)}/skrining-riwayat`,
          );

        this.riwayatSkrining =
          payload?.data ??
          [];
      } catch (error) {
        this.errorRiwayatSkrining =
          error instanceof Error
            ? error.message
            : "Riwayat skrining gagal dimuat.";
      } finally {
        this.loadingRiwayatSkrining =
          false;
      }
    },

    tutupRiwayatSkrining() {
      this.riwayatSkriningTerbuka =
        false;
    },

    tampilHasilRiwayatSkrining(item) {
      if (
        item.opsiLabel
      ) {
        return item.opsiLabel;
      }

      if (
        item.nilaiNumber !==
          null &&
        item.nilaiNumber !==
          undefined
      ) {
        return String(
          item.nilaiNumber,
        );
      }

      if (
        item.nilaiText
      ) {
        return item.nilaiText;
      }

      if (
        item.nilaiBoolean ===
        true
      ) {
        return "Ya";
      }

      if (
        item.nilaiBoolean ===
        false
      ) {
        return "Tidak";
      }

      return "-";
    },

    mulaiEdit() {
      if (!this.dapatEdit) {
        return;
      }

      this.modeEdit =
        true;

      this.success =
        "";
    },

    batalEdit() {
      if (
        this.tabAktif ===
        "skrining"
      ) {
        this.nilaiSkrining =
          this.salinDataSederhana(
            this.nilaiSkriningAwal,
          );
      } else if (
        this.tabAktif ===
        "konseling"
      ) {
        this.nilaiKonseling =
          this.salinDataSederhana(
            this.nilaiKonselingAwal,
          );
      } else {
        this.nilai =
          this.salinDataSederhana(
            this.nilaiAwal,
          );
      }

      this.modeEdit =
        false;
    },

    multiselectDipilih(
      indikatorId,
      opsiId,
    ) {
      const nilai =
        this.nilai[
          indikatorId
        ];

      return (
        Array.isArray(nilai) &&
        nilai.includes(
          String(opsiId),
        )
      );
    },

    toggleMultiselect(
      indikatorId,
      opsiId,
    ) {
      const sekarang =
        Array.isArray(
          this.nilai[
            indikatorId
          ],
        )
          ? [
              ...this.nilai[
                indikatorId
              ],
            ]
          : [];

      const id =
        String(opsiId);

      const index =
        sekarang.indexOf(id);

      if (index >= 0) {
        sekarang.splice(
          index,
          1,
        );
      } else {
        sekarang.push(id);
      }

      this.nilai[
        indikatorId
      ] =
        sekarang;
    },

    nilaiKosong(item) {
      const value =
        this.nilai[
          item.indikatorId
        ];

      if (
        item.tipeInput ===
        "multiselect"
      ) {
        return (
          !Array.isArray(value) ||
          value.length === 0
        );
      }

      return (
        value === "" ||
        value === null ||
        value === undefined
      );
    },

    payloadNilai(item) {
      const value =
        this.nilai[
          item.indikatorId
        ];

      if (
        item.tipeInput ===
        "number"
      ) {
        return {
          nilaiNumber:
            Number(value),
        };
      }

      if (
        item.tipeInput ===
        "text"
      ) {
        return {
          nilaiText:
            String(value),
        };
      }

      if (
        item.tipeInput ===
        "boolean"
      ) {
        return {
          nilaiBoolean:
            value === "true",
        };
      }

      if (
        item.tipeInput ===
        "date"
      ) {
        return {
          nilaiDate:
            String(value),
        };
      }

      if (
        item.tipeInput ===
        "select"
      ) {
        return {
          opsiId:
            Number(value),
        };
      }

      if (
        item.tipeInput ===
        "multiselect"
      ) {
        return {
          opsiIds:
            (
              Array.isArray(value)
                ? value
                : []
            ).map(Number),
        };
      }

      return {};
    },


    async simpanAktif() {
      if (
        this.tabAktif ===
        "skrining"
      ) {
        await this.simpanSkrining();
        return;
      }

      if (
        this.tabAktif ===
        "konseling"
      ) {
        await this.simpanKonseling();
        return;
      }

      await this.simpan();
    },

    async simpanSkrining() {
      if (
        !this.modeEdit ||
        this.saving ||
        !this.formData
      ) {
        return;
      }

      this.saving =
        true;

      this.error =
        "";

      this.success =
        "";

      try {
        for (
          const item of
            this.formData
              .skrining
        ) {
          if (
            !this.skriningBisaDiisi(
              item,
            )
          ) {
            continue;
          }

          const existing =
            item.hasilSaatIni;

          const kosong =
            this.nilaiSkriningKosong(
              item,
            );

          if (
            item.wajib &&
            kosong
          ) {
            throw new Error(
              `${item.nama} wajib diisi.`,
            );
          }

          if (
            kosong &&
            !existing
          ) {
            continue;
          }

          if (
            kosong &&
            existing
          ) {
            await window.PosgaApi.request(
              this.urlTulis(`/api/skrining/${existing.id}`),
              {
                method:
                  "DELETE",
              },
            );

            continue;
          }

          const body = {
            ...this.payloadNilaiSkrining(
              item,
            ),
          };

          if (existing) {
            await window.PosgaApi.request(
              this.urlTulis(`/api/skrining/${existing.id}`),
              {
                method:
                  "PUT",
                body: {
                  tanggalSkrining:
                    this.formData
                      .tanggalPosga,

                  sumber:
                    "posga",

                  sesiPosgaId:
                    this.sesiId,

                  namaFasilitas:
                    null,

                  ...body,
                },
              },
            );
          } else {
            await window.PosgaApi.request(
              this.urlTulis("/api/skrining"),
              {
                method:
                  "POST",
                body: {
                  pesertaNik:
                    this.formData
                      .pesertaNik,

                  indikatorId:
                    item.indikatorId,

                  sesiPosgaId:
                    this.sesiId,

                  tanggalSkrining:
                    this.formData
                      .tanggalPosga,

                  sumber:
                    "posga",

                  namaFasilitas:
                    null,

                  ...body,
                },
              },
            );
          }
        }

        await window.PosgaApi.request(
          `/api/peserta-sesi/${this.formData.pesertaSesiId}/sinkron-status`,
          {
            method:
              "POST",
          },
        );

        this.success =
          "Skrining berhasil disimpan.";

        this.modeEdit =
          false;

        await this.refreshSetelahSimpan();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Skrining gagal disimpan.";
      } finally {
        this.saving =
          false;
      }
    },


    async simpanKonseling() {
      if (
        !this.modeEdit ||
        this.saving ||
        !this.formData
      ) {
        return;
      }

      this.saving =
        true;
      this.error =
        "";
      this.success =
        "";

      try {
        for (
          const item of
            this.formData
              .konseling
        ) {
          if (
            !this.konselingBisaDiisi(
              item,
            )
          ) {
            continue;
          }

          const existing =
            item.hasilSaatIni;

          const kosong =
            this.nilaiKonselingKosong(
              item,
            );

          if (
            item.wajib &&
            kosong
          ) {
            throw new Error(
              `${item.nama} wajib diisi.`,
            );
          }

          if (
            kosong &&
            !existing
          ) {
            continue;
          }

          if (
            kosong &&
            existing
          ) {
            await window.PosgaApi.request(
              this.urlTulis(`/api/konseling/${existing.id}`),
              {
                method: "DELETE",
              },
            );

            continue;
          }

          const body =
            this.payloadKonseling(
              item,
            );

          if (existing) {
            await window.PosgaApi.request(
              this.urlTulis(`/api/konseling/${existing.id}`),
              {
                method:
                  "PUT",
                body,
              },
            );
          } else {
            await window.PosgaApi.request(
              this.urlTulis("/api/konseling"),
              {
                method:
                  "POST",
                body: {
                  pesertaSesiPosgaId:
                    this.formData
                      .pesertaSesiId,
                  indikatorId:
                    item.indikatorId,
                  ...body,
                },
              },
            );
          }
        }

        await window.PosgaApi.request(
          `/api/peserta-sesi/${this.formData.pesertaSesiId}/sinkron-status`,
          {
            method:
              "POST",
          },
        );

        this.success =
          "Konseling berhasil disimpan.";

        this.modeEdit =
          false;

        await this.refreshSetelahSimpan();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Konseling gagal disimpan.";
      } finally {
        this.saving =
          false;
      }
    },

    async simpan() {
      if (
        !this.modeEdit ||
        this.saving ||
        !this.formData
      ) {
        return;
      }

      this.saving =
        true;

      this.error =
        "";

      this.success =
        "";

      try {
        for (
          const item of
            this.formData
              .pemeriksaan
        ) {
          if (item.derived) {
            continue;
          }

          const existing =
            item.hasilSaatIni;

          const kosong =
            this.nilaiKosong(
              item,
            );

          if (
            kosong &&
            !existing
          ) {
            continue;
          }

          if (
            kosong &&
            existing
          ) {
            await window.PosgaApi.request(
              this.urlTulis(`/api/pemeriksaan/${existing.id}`),
              {
                method:
                  "DELETE",
              },
            );

            continue;
          }

          const body = {
            ...this.payloadNilai(
              item,
            ),
          };

          if (existing) {
            await window.PosgaApi.request(
              this.urlTulis(`/api/pemeriksaan/${existing.id}`),
              {
                method:
                  "PUT",
                body,
              },
            );
          } else {
            await window.PosgaApi.request(
              this.urlTulis("/api/pemeriksaan"),
              {
                method:
                  "POST",
                body: {
                  pesertaSesiPosgaId:
                    this.formData
                      .pesertaSesiId,

                  indikatorId:
                    item.indikatorId,

                  ...body,
                },
              },
            );
          }
        }

        await window.PosgaApi.request(
          `/api/peserta-sesi/${this.formData.pesertaSesiId}/sinkron-status`,
          {
            method: "POST",
          },
        );

        this.success =
          "Pemeriksaan berhasil disimpan.";

        this.modeEdit =
          false;

        await this.refreshSetelahSimpan();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Pemeriksaan gagal disimpan.";
      } finally {
        this.saving =
          false;
      }
    },

    async refreshSetelahSimpan() {
      const rosterPayload =
        await window.PosgaApi.request(
          `/api/sesi/${this.sesiId}/peserta`,
        );

      this.roster =
        Array.isArray(
          rosterPayload?.data,
        )
          ? rosterPayload.data
          : [];

      const idAktif =
        this.formData
          ?.pesertaSesiId;

      const pesertaBaru =
        this.daftarPeserta.find(
          (x) =>
            Number(
              x.pesertaSesiId ??
              x.pesertaSesiPosgaId,
            ) ===
            Number(idAktif),
        );

      if (pesertaBaru) {
        this.pesertaAktif =
          pesertaBaru;
      }

      await this.muatForm(
        idAktif,
      );
    },

    tampilNilai(item) {
      const hasil =
        item.hasilSaatIni;

      if (!hasil) {
        const umurBulan =
          this.umurBulanAktif();

        if (
          item?.kode === "STATUS_LILA" &&
          umurBulan !== null &&
          (
            umurBulan < 6 ||
            umurBulan >= 60
          )
        ) {
          return "Tidak berlaku";
        }

        if (
          item?.kode === "STATUS_LIKA" &&
          umurBulan !== null &&
          umurBulan >= 60
        ) {
          return "Tidak berlaku";
        }

        return item?.derived
          ? "Belum dapat dihitung"
          : "-";
      }

      if (
        item.tipeInput ===
        "number"
      ) {
        return `${hasil.nilaiNumber ?? "-"}${item.satuan ? ` ${item.satuan}` : ""}`;
      }

      if (
        item.tipeInput ===
        "text"
      ) {
        return (
          hasil.nilaiText ??
          "-"
        );
      }

      if (
        item.tipeInput ===
        "boolean"
      ) {
        return hasil.nilaiBoolean ===
          true
          ? "Ya"
          : hasil.nilaiBoolean ===
              false
            ? "Tidak"
            : "-";
      }

      if (
        item.tipeInput ===
        "date"
      ) {
        return (
          hasil.nilaiDate ??
          "-"
        );
      }

      if (
        item.tipeInput ===
        "select"
      ) {
        const opsi =
          this.opsiItem(
            item,
          ).find(
            (x) =>
              Number(x.id) ===
              Number(
                hasil.opsiId,
              ),
          );

        return (
          opsi?.label ??
          hasil.opsiTerpilih?.[0]
            ?.label ??
          "-"
        );
      }

      if (
        item.tipeInput ===
        "multiselect"
      ) {
        const labels =
          Array.isArray(
            hasil.opsiTerpilih,
          )
            ? hasil.opsiTerpilih.map(
                (x) =>
                  x.label,
              )
            : [];

        return (
          labels.join(", ") ||
          "-"
        );
      }

      return "-";
    },

    statusLabel(status) {
      return (
        {
          belum_diperiksa:
            "Belum",
          sedang_diperiksa:
            "Proses",
          selesai:
            "Selesai",
          tidak_hadir:
            "Tidak hadir",
          batal:
            "Batal",
        }[status] ??
        status ??
        "-"
      );
    },

    statusClass(status) {
      if (
        status ===
        "selesai"
      ) {
        return "bg-emerald-100 text-emerald-700";
      }

      if (
        status ===
        "sedang_diperiksa"
      ) {
        return "bg-amber-100 text-amber-700";
      }

      if (
        status ===
          "tidak_hadir" ||
        status ===
          "batal"
      ) {
        return "bg-red-100 text-red-700";
      }

      return "bg-slate-100 text-slate-600";
    },

    formatUmur(umur) {
      if (!umur) {
        return "";
      }

      const tahun =
        umur.tahun ??
        umur.years ??
        0;

      const bulan =
        umur.bulan ??
        umur.months ??
        0;

      const hari =
        umur.hari ??
        umur.days ??
        0;

      return `${tahun} th ${bulan} bln ${hari} hr`;
    },

    tambahPesertaUrl() {
      const q =
        new URLSearchParams();

      if (
        this.posyandu?.lokasiId
      ) {
        q.set(
          "lokasiId",
          String(
            this.posyandu
              .lokasiId,
          ),
        );
      }

      if (
        this.sesi?.posyanduId
      ) {
        q.set(
          "posyanduId",
          String(
            this.sesi
              .posyanduId,
          ),
        );
      }

      q.set(
        "buat",
        "1",
      );

      q.set(
        "sesi",
        String(
          this.sesiId,
        ),
      );

      q.set(
        "kategori",
        this.kategori,
      );

      if (
        this.sesi
          ?.tanggalPosga
      ) {
        q.set(
          "tanggalMulai",
          this.sesi
            .tanggalPosga,
        );
      }

      const halamanIni =
        `${window.location.pathname}${window.location.search}`;

      q.set(
        "kembali",
        halamanIni,
      );

      return `/peserta/?${q}`;
    },

    kembaliSesi() {
      if (
        this.modeEdit &&
        this.perubahanAda &&
        !window.confirm(
          "Perubahan belum disimpan. Keluar dari pemeriksaan?",
        )
      ) {
        return;
      }

      window.location.href =
        this.kembaliUrl ||
        `/sesi/?id=${this.sesiId}&kategori=${encodeURIComponent(this.kategori)}`;
    },
  }));
});
