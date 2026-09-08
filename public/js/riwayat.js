document.addEventListener("alpine:init", () => {
  Alpine.data("riwayatPage", () => ({
    peserta: [],
    pesertaAktif: null,
    pencarian: "",

    riwayat: [],
    detailTerbukaId: null,
    detailForm: null,

    loadingPeserta: false,
    loadingRiwayat: false,
    loadingDetail: false,
    error: "",

    filter: {
      statusPemeriksaan: "",
      tanggalMulai: "",
      tanggalSelesai: "",
    },

    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    },

    async init() {
      await this.muatPeserta();

      const params =
        new URLSearchParams(
          window.location.search,
        );

      const nik =
        params.get("nik");

      if (nik) {
        const ada =
          this.peserta.find(
            (item) =>
              item.nik === nik,
          );

        if (ada) {
          await this.pilihPeserta(
            ada,
          );
        }
      }
    },

    async muatPeserta() {
      this.loadingPeserta = true;
      this.error = "";

      try {
        const params =
          new URLSearchParams({
            page: "1",
            limit: "10",
          });

        const q =
          this.pencarian.trim();

        if (q) {
          params.set("q", q);
        }

        const payload =
          await window.PosgaApi.request(
            `/api/peserta?${params.toString()}`,
          );

        this.peserta =
          payload?.data?.items ??
          [];
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Peserta gagal dimuat.";
      } finally {
        this.loadingPeserta = false;
      }
    },

    async pilihPeserta(item) {
      if (
        this.pesertaAktif?.nik ===
        item.nik
      ) {
        return;
      }

      this.pesertaAktif = item;
      this.detailTerbukaId = null;
      this.detailForm = null;

      const url =
        new URL(
          window.location.href,
        );

      url.searchParams.set(
        "nik",
        item.nik,
      );

      window.history.replaceState(
        {},
        "",
        url,
      );

      await this.muatRiwayat(1);
    },

    async muatRiwayat(page = 1) {
      if (!this.pesertaAktif) {
        return;
      }

      this.loadingRiwayat = true;
      this.error = "";
      this.detailTerbukaId = null;
      this.detailForm = null;

      try {
        const params =
          new URLSearchParams({
            page: String(page),
            limit: String(
              this.pagination.limit,
            ),
          });

        if (
          this.filter
            .statusPemeriksaan
        ) {
          params.set(
            "statusPemeriksaan",
            this.filter
              .statusPemeriksaan,
          );
        }

        if (
          this.filter
            .tanggalMulai
        ) {
          params.set(
            "tanggalMulai",
            this.filter
              .tanggalMulai,
          );
        }

        if (
          this.filter
            .tanggalSelesai
        ) {
          params.set(
            "tanggalSelesai",
            this.filter
              .tanggalSelesai,
          );
        }

        const payload =
          await window.PosgaApi.request(
            `/api/peserta/${encodeURIComponent(this.pesertaAktif.nik)}/riwayat-sesi?${params.toString()}`,
          );

        this.riwayat =
          payload?.data?.items ??
          [];

        this.pagination = {
          ...this.pagination,
          ...(
            payload?.data
              ?.pagination ??
            {}
          ),
        };
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Riwayat gagal dimuat.";
      } finally {
        this.loadingRiwayat = false;
      }
    },

    urlKoreksi(item) {
      const params =
        new URLSearchParams({
          sesi: String(item.sesiId),
          kategori: String(item.kategori),
          pesertaSesi: String(item.pesertaSesiId),
          kembali: "/riwayat/",
        });

      return `/pemeriksaan/?${params.toString()}`;
    },

    async toggleDetail(item) {
      if (
        this.detailTerbukaId ===
        item.pesertaSesiId
      ) {
        this.detailTerbukaId =
          null;
        this.detailForm =
          null;
        return;
      }

      this.detailTerbukaId =
        item.pesertaSesiId;
      this.detailForm =
        null;
      this.loadingDetail =
        true;
      this.error =
        "";

      try {
        const payload =
          await window.PosgaApi.request(
            `/api/peserta-sesi/${item.pesertaSesiId}/form`,
          );

        this.detailForm =
          payload?.data ??
          null;
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Detail riwayat gagal dimuat.";
      } finally {
        this.loadingDetail =
          false;
      }
    },

    hasilBagian(bagian) {
      return (
        this.detailForm?.[bagian] ??
        []
      ).filter(
        (item) =>
          item.hasilSaatIni,
      );
    },

    opsiItem(item) {
      return (
        item?.opsi ??
        []
      );
    },

    labelIndikator(item) {
      const map = {
        STATUS_OBESITAS:
          "Status IMT",
        STATUS_DM:
          "Status Gula Darah",
        STATUS_HIPERTENSI:
          "Status Tekanan Darah",
        STATUS_HT_NIFAS:
          "Status Tekanan Darah Nifas",
        STATUS_IMT_U:
          "Status Gizi IMT/U",
        STATUS_LIPE:
          "Status Lingkar Perut",
      };

      return (
        map[item?.kode] ??
        item?.nama ??
        item?.kode ??
        "-"
      );
    },

    nilaiItem(item) {
      const hasil =
        item?.hasilSaatIni;

      if (!hasil) {
        return "-";
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
        "date"
      ) {
        return this.formatTanggal(
          hasil.nilaiDate,
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
        const selected =
          this.opsiItem(
            item,
          ).find(
            (opsi) =>
              Number(opsi.id) ===
              Number(
                hasil.opsiId,
              ),
          );

        return (
          selected?.label ??
          hasil.opsiLabel ??
          "-"
        );
      }

      if (
        item.tipeInput ===
        "multiselect"
      ) {
        const selected =
          hasil.opsiTerpilih ??
          [];

        return selected.length
          ? selected
              .map(
                (opsi) =>
                  opsi.label,
              )
              .join(", ")
          : "-";
      }

      return "-";
    },

    formatTanggal(value) {
      if (!value) {
        return "-";
      }

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

    labelJK(value) {
      if (value === "L") {
        return "Laki-laki";
      }

      if (value === "P") {
        return "Perempuan";
      }

      return "-";
    },

    labelKategori(value) {
      const map = {
        bayi: "Bayi",
        balita: "Balita",
        prasekolah: "Prasekolah",
        sekolah: "Sekolah",
        dewasa: "Dewasa",
        lansia: "Lansia",
        ibu_hamil: "Ibu Hamil",
        ibu_nifas: "Ibu Nifas",
      };

      return (
        map[value] ??
        value ??
        "-"
      );
    },

    labelStatus(value) {
      const map = {
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
      };

      return (
        map[value] ??
        value ??
        "-"
      );
    },

    statusClass(value) {
      if (
        value === "selesai"
      ) {
        return "bg-emerald-100 text-emerald-700";
      }

      if (
        value ===
        "sedang_diperiksa"
      ) {
        return "bg-blue-100 text-blue-700";
      }

      if (
        value ===
        "tidak_hadir" ||
        value === "batal"
      ) {
        return "bg-red-50 text-red-600";
      }

      return "bg-slate-100 text-slate-600";
    },
  }));
});

