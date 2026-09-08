document.addEventListener("alpine:init", () => {
  Alpine.data("rekapPage", () => ({
    lokasi: [],
    posyandu: [],
    sesi: [],
    sesiAktif: null,
    rekap: null,

    loadingSesi: false,
    loadingRekap: false,
    exporting: false,
    error: "",

    filter: {
      lokasiId: "",
      posyanduId: "",
      status: "",
      tanggalMulai: "",
      tanggalSelesai: "",
    },

    filterKategoriPeserta: "",
    filterStatusPeserta: "",

    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    },

    async init() {
      await this.muatLokasi();
    },

    async muatLokasi() {
      this.error = "";

      try {
        const payload =
          await window.PosgaApi.request(
            "/api/lokasi",
          );

        this.lokasi =
          payload?.data ??
          [];
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Lokasi gagal dimuat.";
      }
    },

    async ubahLokasi() {
      this.filter.posyanduId = "";
      this.posyandu = [];
      this.sesi = [];
      this.sesiAktif = null;
      this.rekap = null;

      if (!this.filter.lokasiId) {
        return;
      }

      try {
        const payload =
          await window.PosgaApi.request(
            `/api/lokasi/${this.filter.lokasiId}/posyandu`,
          );

        this.posyandu =
          payload?.data ??
          [];
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Posyandu gagal dimuat.";
      }
    },

    async muatSesi(page = 1) {
      this.sesiAktif = null;
      this.rekap = null;
      this.sesi = [];

      if (!this.filter.posyanduId) {
        return;
      }

      this.loadingSesi = true;
      this.error = "";

      try {
        const params =
          new URLSearchParams({
            page: String(page),
            limit: String(
              this.pagination.limit,
            ),
          });

        if (this.filter.status) {
          params.set(
            "status",
            this.filter.status,
          );
        }

        if (this.filter.tanggalMulai) {
          params.set(
            "tanggalMulai",
            this.filter.tanggalMulai,
          );
        }

        if (this.filter.tanggalSelesai) {
          params.set(
            "tanggalSelesai",
            this.filter.tanggalSelesai,
          );
        }

        const payload =
          await window.PosgaApi.request(
            `/api/posyandu/${this.filter.posyanduId}/sesi/search?${params.toString()}`,
          );

        this.sesi =
          payload?.data?.items ??
          [];

        this.pagination = {
          ...this.pagination,
          ...(
            payload?.data?.pagination ??
            {}
          ),
        };
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Sesi gagal dimuat.";
      } finally {
        this.loadingSesi = false;
      }
    },

    async downloadExport(
      params,
    ) {
      if (
        this.exporting
      ) {
        return;
      }

      this.exporting = true;
      this.error = "";

      try {
        const {
          response,
          blob,
        } =
          await window.PosgaApi.requestBlob(
            `/api/export/posga.xlsx?${params.toString()}`,
          );

        const disposition =
          response.headers.get(
            "content-disposition",
          ) ??
          "";

        const match =
          /filename="([^"]+)"/i.exec(
            disposition,
          );

        const filename =
          match?.[1] ??
          "POSGA-export.xlsx";

        const url =
          URL.createObjectURL(
            blob,
          );

        const link =
          document.createElement(
            "a",
          );

        link.href =
          url;
        link.download =
          filename;

        document.body.appendChild(
          link,
        );

        link.click();
        link.remove();

        URL.revokeObjectURL(
          url,
        );
      } catch (
        error
      ) {
        this.error =
          error instanceof Error
            ? error.message
            : "Export Excel gagal.";
      } finally {
        this.exporting = false;
      }
    },

    async exportRentang() {
      if (
        !this.filter.posyanduId ||
        this.exporting
      ) {
        return;
      }

      const params =
        new URLSearchParams({
          posyanduId:
            String(
              this.filter.posyanduId,
            ),
        });

      if (
        this.filter.tanggalMulai
      ) {
        params.set(
          "tanggalMulai",
          this.filter.tanggalMulai,
        );
      }

      if (
        this.filter.tanggalSelesai
      ) {
        params.set(
          "tanggalSelesai",
          this.filter.tanggalSelesai,
        );
      }

      await this.downloadExport(
        params,
      );
    },

    async exportSesiTerpilih() {
      if (
        !this.filter.posyanduId ||
        !this.sesiAktif?.id ||
        this.exporting
      ) {
        return;
      }

      const params =
        new URLSearchParams({
          posyanduId:
            String(
              this.filter.posyanduId,
            ),
          sesiId:
            String(
              this.sesiAktif.id,
            ),
        });

      await this.downloadExport(
        params,
      );
    },

    async pilihSesi(item) {
      this.sesiAktif = item;
      this.filterKategoriPeserta = "";
      this.filterStatusPeserta = "";
      await this.muatRekap();
    },

    async muatRekap() {
      if (!this.sesiAktif?.id) {
        return;
      }

      this.loadingRekap = true;
      this.error = "";

      try {
        const payload =
          await window.PosgaApi.request(
            `/api/sesi/${this.sesiAktif.id}/rekap`,
          );

        this.rekap =
          payload?.data ??
          null;
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Rekap sesi gagal dimuat.";
      } finally {
        this.loadingRekap = false;
      }
    },

    get pesertaTersaring() {
      return (
        this.rekap?.peserta ??
        []
      ).filter((item) => {
        if (
          this.filterKategoriPeserta &&
          item.kategori !==
            this.filterKategoriPeserta
        ) {
          return false;
        }

        if (
          this.filterStatusPeserta &&
          item.statusPemeriksaan !==
            this.filterStatusPeserta
        ) {
          return false;
        }

        return true;
      });
    },

    get statusCards() {
      const x =
        this.rekap?.ringkasan
          ?.statusPemeriksaan ??
        {};

      return [
        {
          label: "Belum",
          value: x.belumDiperiksa ?? 0,
        },
        {
          label: "Proses",
          value: x.sedangDiperiksa ?? 0,
        },
        {
          label: "Selesai",
          value: x.selesai ?? 0,
        },
        {
          label: "Tidak hadir",
          value: x.tidakHadir ?? 0,
        },
        {
          label: "Batal",
          value: x.batal ?? 0,
        },
      ];
    },

    get kategoriCards() {
      const x =
        this.rekap?.ringkasan
          ?.kategori ??
        {};

      return [
        ["Bayi", x.bayi],
        ["Balita", x.balita],
        ["Prasekolah", x.prasekolah],
        ["Sekolah", x.sekolah],
        ["Dewasa", x.dewasa],
        ["Lansia", x.lansia],
        ["Ibu Hamil", x.ibuHamil],
        ["Ibu Nifas", x.ibuNifas],
      ].map(([label, value]) => ({
        label,
        value: value ?? 0,
      }));
    },

    get klinisCards() {
      const x =
        this.rekap?.ringkasan
          ?.klinis ??
        {};

      return [
        ["Pemeriksaan", x.jumlahPemeriksaan],
        ["Skrining", x.jumlahSkrining],
        ["Konseling", x.jumlahKonseling],
        ["Total", x.total],
      ].map(([label, value]) => ({
        label,
        value: value ?? 0,
      }));
    },

    formatTanggal(value) {
      if (!value) return "-";

      const [y, m, d] =
        String(value)
          .split("-")
          .map(Number);

      if (!y || !m || !d) {
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
            y,
            m - 1,
            d,
          ),
        ),
      );
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

      return map[value] ?? value ?? "-";
    },

    labelStatusSesi(value) {
      const map = {
        aktif: "Aktif",
        selesai: "Selesai",
        dibatalkan: "Dibatalkan",
      };

      return map[value] ?? value ?? "-";
    },

    statusSesiClass(value) {
      if (value === "aktif") {
        return "bg-blue-100 text-blue-700";
      }

      if (value === "selesai") {
        return "bg-emerald-100 text-emerald-700";
      }

      return "bg-slate-100 text-slate-600";
    },

    labelStatusPeserta(value) {
      const map = {
        belum_diperiksa: "Belum",
        sedang_diperiksa: "Proses",
        selesai: "Selesai",
        tidak_hadir: "Tidak hadir",
        batal: "Batal",
      };

      return map[value] ?? value ?? "-";
    },

    statusPesertaClass(value) {
      if (value === "selesai") {
        return "bg-emerald-100 text-emerald-700";
      }

      if (value === "sedang_diperiksa") {
        return "bg-blue-100 text-blue-700";
      }

      if (
        value === "tidak_hadir" ||
        value === "batal"
      ) {
        return "bg-red-50 text-red-600";
      }

      return "bg-slate-100 text-slate-600";
    },
  }));
});
