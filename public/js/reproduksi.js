document.addEventListener("alpine:init", () => {
  Alpine.data("reproduksiPage", () => ({
    peserta: [],
    pesertaAktif: null,
    reproduksi: null,
    detailNifas: null,

    pencarian: "",
    tabAktif: "kehamilan",

    loadingPeserta: false,
    loadingData: false,
    saving: false,
    error: "",
    success: "",

    modalKehamilan: false,
    modeKehamilan: "tambah",
    kehamilanDipilih: null,

    modalNifas: false,
    modeNifas: "tambah",
    nifasDipilih: null,

    modalDetailNifas: false,

    formKehamilan: {
      tanggalMulai: "",
      tanggalSelesai: "",
      bbSebelumHamilKg: "",
      tbCm: "",
      hpht: "",
      hpl: "",
      lilaAwalCm: "",
      catatan: "",
    },

    formNifas: {
      episodeKehamilanId: "",
      tanggalMulai: "",
      tanggalSelesai: "",
      tanggalMelahirkan: "",
      jamBersalin: "",
      caraPersalinan: "",
      vitaminA: "",
      asiEksklusif: "",
      catatan: "",
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
        const item =
          this.peserta.find(
            (x) => x.nik === nik,
          );

        if (item) {
          await this.pilihPeserta(item);
        }
      }
    },

    async muatPeserta() {
      this.loadingPeserta = true;
      this.error = "";

      try {
        const params =
          new URLSearchParams({
            jenisKelamin: "P",
            aktif: "true",
            page: "1",
            limit: "10",
          });

        if (this.pencarian.trim()) {
          params.set(
            "q",
            this.pencarian.trim(),
          );
        }

        const payload =
          await window.PosgaApi.request(
            `/api/peserta?${params.toString()}`,
          );

        this.peserta =
          payload?.data?.items ??
          [];

        if (
          this.pesertaAktif &&
          !this.peserta.some(
            (x) =>
              x.nik ===
              this.pesertaAktif.nik,
          )
        ) {
          this.pesertaAktif = null;
          this.reproduksi = null;
        }
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
      this.pesertaAktif = item;
      this.success = "";
      this.detailNifas = null;

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

      await this.muatReproduksi();
    },

    async muatReproduksi() {
      if (!this.pesertaAktif) {
        return;
      }

      this.loadingData = true;
      this.error = "";

      try {
        const payload =
          await window.PosgaApi.request(
            `/api/peserta/${encodeURIComponent(this.pesertaAktif.nik)}/reproduksi`,
          );

        this.reproduksi =
          payload?.data ??
          null;
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Data reproduksi gagal dimuat.";
      } finally {
        this.loadingData = false;
      }
    },

    get riwayatKehamilanTerbalik() {
      return [
        ...(this.reproduksi?.kehamilan ?? []),
      ].reverse();
    },

    get riwayatNifasTerbalik() {
      return [
        ...(this.reproduksi?.nifas ?? []),
      ].reverse();
    },

    get kehamilanUntukNifas() {
      return (
        this.reproduksi?.kehamilan ??
        []
      ).filter(
        (item) =>
          item.status !==
          "dibatalkan",
      );
    },

    hariIni() {
      return new Date()
        .toISOString()
        .slice(0, 10);
    },

    nullableNumber(value) {
      if (
        value === "" ||
        value === null ||
        value === undefined
      ) {
        return null;
      }

      return Number(value);
    },

    nullableText(value) {
      const hasil =
        String(value ?? "")
          .trim();

      return hasil || null;
    },

    nullableBoolean(value) {
      if (value === "true") return true;
      if (value === "false") return false;
      return null;
    },

    bukaKehamilanBaru() {
      this.modeKehamilan = "tambah";
      this.kehamilanDipilih = null;
      this.formKehamilan = {
        tanggalMulai: this.hariIni(),
        tanggalSelesai: "",
        bbSebelumHamilKg: "",
        tbCm: "",
        hpht: "",
        hpl: "",
        lilaAwalCm: "",
        catatan: "",
      };
      this.modalKehamilan = true;
    },

    bukaEditKehamilan(item) {
      this.modeKehamilan = "edit";
      this.kehamilanDipilih = item;
      this.formKehamilan = {
        tanggalMulai: item.tanggalMulai ?? "",
        tanggalSelesai: item.tanggalSelesai ?? "",
        bbSebelumHamilKg: item.bbSebelumHamilKg ?? "",
        tbCm: item.tbCm ?? "",
        hpht: item.hpht ?? "",
        hpl: item.hpl ?? "",
        lilaAwalCm: item.lilaAwalCm ?? "",
        catatan: item.catatan ?? "",
      };
      this.modalKehamilan = true;
    },

    async simpanKehamilan() {
      if (
        !this.pesertaAktif ||
        this.saving
      ) {
        return;
      }

      this.saving = true;
      this.error = "";
      this.success = "";

      const body = {
        tanggalMulai:
          this.formKehamilan
            .tanggalMulai,
        ...(this.modeKehamilan === "edit"
          ? {
              tanggalSelesai:
                this.nullableText(
                  this.formKehamilan
                    .tanggalSelesai,
                ),
            }
          : {}),
        bbSebelumHamilKg:
          this.nullableNumber(
            this.formKehamilan
              .bbSebelumHamilKg,
          ),
        tbCm:
          this.nullableNumber(
            this.formKehamilan
              .tbCm,
          ),
        hpht:
          this.nullableText(
            this.formKehamilan.hpht,
          ),
        hpl:
          this.nullableText(
            this.formKehamilan.hpl,
          ),
        lilaAwalCm:
          this.nullableNumber(
            this.formKehamilan
              .lilaAwalCm,
          ),
        catatan:
          this.nullableText(
            this.formKehamilan.catatan,
          ),
      };

      try {
        if (
          this.modeKehamilan ===
          "edit"
        ) {
          await window.PosgaApi.request(
            `/api/kehamilan/${this.kehamilanDipilih.id}`,
            {
              method: "PUT",
              body,
            },
          );

          this.success =
            "Kehamilan berhasil diperbarui.";
        } else {
          await window.PosgaApi.request(
            `/api/peserta/${encodeURIComponent(this.pesertaAktif.nik)}/kehamilan`,
            {
              method: "POST",
              body,
            },
          );

          this.success =
            "Kehamilan berhasil dibuat.";
        }

        this.modalKehamilan = false;
        await this.muatReproduksi();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Kehamilan gagal disimpan.";
      } finally {
        this.saving = false;
      }
    },

    async selesaikanKehamilan(item) {
      const tanggal =
        window.prompt(
          "Tanggal selesai kehamilan (YYYY-MM-DD):",
          this.hariIni(),
        );

      if (!tanggal) return;

      try {
        await window.PosgaApi.request(
          `/api/kehamilan/${item.id}/selesai`,
          {
            method: "POST",
            body: {
              tanggalSelesai:
                tanggal,
            },
          },
        );

        this.success =
          "Kehamilan ditandai selesai.";
        await this.muatReproduksi();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Kehamilan gagal diselesaikan.";
      }
    },

    async batalkanKehamilan(item) {
      if (
        !window.confirm(
          "Batalkan episode kehamilan ini?",
        )
      ) {
        return;
      }

      try {
        await window.PosgaApi.request(
          `/api/kehamilan/${item.id}/batal`,
          {
            method: "POST",
            body: {
              tanggalSelesai:
                this.hariIni(),
            },
          },
        );

        this.success =
          "Kehamilan dibatalkan.";
        await this.muatReproduksi();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Kehamilan gagal dibatalkan.";
      }
    },

    bukaNifasBaru() {
      this.modeNifas = "tambah";
      this.nifasDipilih = null;

      const hamilAktif =
        this.reproduksi
          ?.kehamilanAktif;

      this.formNifas = {
        episodeKehamilanId:
          hamilAktif
            ? String(
                hamilAktif.id,
              )
            : "",
        tanggalMulai: this.hariIni(),
        tanggalSelesai: "",
        tanggalMelahirkan: this.hariIni(),
        jamBersalin: "",
        caraPersalinan: "",
        vitaminA: "",
        asiEksklusif: "",
        catatan: "",
      };

      this.modalNifas = true;
    },

    bukaEditNifas(item) {
      this.modeNifas = "edit";
      this.nifasDipilih = item;

      this.formNifas = {
        episodeKehamilanId:
          item.episodeKehamilanId
            ? String(
                item.episodeKehamilanId,
              )
            : "",
        tanggalMulai: item.tanggalMulai ?? "",
        tanggalSelesai: item.tanggalSelesai ?? "",
        tanggalMelahirkan: item.tanggalMelahirkan ?? "",
        jamBersalin: item.jamBersalin ?? "",
        caraPersalinan: item.caraPersalinan ?? "",
        vitaminA:
          item.vitaminA === true
            ? "true"
            : item.vitaminA === false
              ? "false"
              : "",
        asiEksklusif:
          item.asiEksklusif === true
            ? "true"
            : item.asiEksklusif === false
              ? "false"
              : "",
        catatan: item.catatan ?? "",
      };

      this.modalNifas = true;
    },

    payloadNifas() {
      return {
        episodeKehamilanId:
          this.formNifas
            .episodeKehamilanId
            ? Number(
                this.formNifas
                  .episodeKehamilanId,
              )
            : null,
        tanggalMulai:
          this.formNifas
            .tanggalMulai,
        ...(this.modeNifas === "edit"
          ? {
              tanggalSelesai:
                this.nullableText(
                  this.formNifas
                    .tanggalSelesai,
                ),
            }
          : {}),
        tanggalMelahirkan:
          this.nullableText(
            this.formNifas
              .tanggalMelahirkan,
          ),
        jamBersalin:
          this.nullableText(
            this.formNifas
              .jamBersalin,
          ),
        caraPersalinan:
          this.nullableText(
            this.formNifas
              .caraPersalinan,
          ),
        vitaminA:
          this.nullableBoolean(
            this.formNifas
              .vitaminA,
          ),
        asiEksklusif:
          this.nullableBoolean(
            this.formNifas
              .asiEksklusif,
          ),
        catatan:
          this.nullableText(
            this.formNifas
              .catatan,
          ),
      };
    },

    async simpanNifas() {
      if (
        !this.pesertaAktif ||
        this.saving
      ) {
        return;
      }

      this.saving = true;
      this.error = "";
      this.success = "";

      try {
        const body =
          this.payloadNifas();

        if (
          this.modeNifas ===
          "edit"
        ) {
          await window.PosgaApi.request(
            `/api/nifas/${this.nifasDipilih.id}`,
            {
              method: "PUT",
              body,
            },
          );

          this.success =
            "Nifas berhasil diperbarui.";
        } else {
          await window.PosgaApi.request(
            `/api/peserta/${encodeURIComponent(this.pesertaAktif.nik)}/nifas`,
            {
              method: "POST",
              body,
            },
          );

          this.success =
            "Nifas berhasil dibuat.";
        }

        this.modalNifas = false;
        await this.muatReproduksi();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Nifas gagal disimpan.";
      } finally {
        this.saving = false;
      }
    },

    async selesaikanNifas(item) {
      const tanggal =
        window.prompt(
          "Tanggal selesai nifas (YYYY-MM-DD):",
          this.hariIni(),
        );

      if (!tanggal) return;

      try {
        await window.PosgaApi.request(
          `/api/nifas/${item.id}/selesai`,
          {
            method: "POST",
            body: {
              tanggalSelesai:
                tanggal,
            },
          },
        );

        this.success =
          "Nifas ditandai selesai.";
        await this.muatReproduksi();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Nifas gagal diselesaikan.";
      }
    },

    async batalkanNifas(item) {
      if (
        !window.confirm(
          "Batalkan episode nifas ini?",
        )
      ) {
        return;
      }

      try {
        await window.PosgaApi.request(
          `/api/nifas/${item.id}/batal`,
          {
            method: "POST",
            body: {
              tanggalSelesai:
                this.hariIni(),
            },
          },
        );

        this.success =
          "Nifas dibatalkan.";
        await this.muatReproduksi();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Nifas gagal dibatalkan.";
      }
    },

    async bukaDetailNifas(item) {
      this.error = "";

      try {
        const payload =
          await window.PosgaApi.request(
            `/api/nifas/${item.id}`,
          );

        this.detailNifas =
          payload?.data ??
          null;

        this.modalDetailNifas =
          true;
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Detail nifas gagal dimuat.";
      }
    },

    kodeItem(label) {
      return String(label)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 50) ||
        `ITEM_${Date.now()}`;
    },

    async tambahItemPersalinan(jenis) {
      if (!this.detailNifas) {
        return;
      }

      const label =
        window.prompt(
          jenis === "tindakan"
            ? "Nama tindakan persalinan:"
            : "Nama komplikasi persalinan:",
        );

      if (!label?.trim()) return;

      const catatan =
        window.prompt(
          "Catatan (opsional):",
          "",
        );

      const endpoint =
        jenis === "tindakan"
          ? "tindakan"
          : "komplikasi";

      try {
        await window.PosgaApi.request(
          `/api/nifas/${this.detailNifas.id}/${endpoint}`,
          {
            method: "POST",
            body: {
              kode:
                this.kodeItem(label),
              label:
                label.trim(),
              catatan:
                this.nullableText(
                  catatan,
                ),
            },
          },
        );

        await this.bukaDetailNifas(
          this.detailNifas,
        );
        await this.muatReproduksi();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Item persalinan gagal ditambah.";
      }
    },

    async hapusItemPersalinan(
      jenis,
      item,
    ) {
      if (
        !window.confirm(
          `Hapus ${item.label}?`,
        )
      ) {
        return;
      }

      const endpoint =
        jenis === "tindakan"
          ? "tindakan-persalinan"
          : "komplikasi-persalinan";

      try {
        await window.PosgaApi.request(
          `/api/${endpoint}/${item.id}`,
          {
            method: "DELETE",
          },
        );

        await this.bukaDetailNifas(
          this.detailNifas,
        );
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Item persalinan gagal dihapus.";
      }
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

    labelStatusEpisode(value) {
      const map = {
        aktif: "Aktif",
        selesai: "Selesai",
        dibatalkan: "Dibatalkan",
      };

      return map[value] ?? value ?? "-";
    },

    statusEpisodeClass(value) {
      if (value === "aktif") {
        return "bg-blue-100 text-blue-700";
      }

      if (value === "selesai") {
        return "bg-emerald-100 text-emerald-700";
      }

      return "bg-slate-100 text-slate-600";
    },

    labelCaraPersalinan(value) {
      if (value === "pervaginam") {
        return "Pervaginam";
      }

      if (value === "sesar") {
        return "Sesar";
      }

      return "-";
    },

    labelBoolean(value) {
      if (value === true) return "Ya";
      if (value === false) return "Tidak";
      return "-";
    },
  }));
});

