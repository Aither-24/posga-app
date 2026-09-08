document.addEventListener("alpine:init", () => {
  Alpine.data("pesertaPage", () => ({
    loading: true,
    saving: false,
    deleting: false,
    moving: false,
    error: "",
    modalError: "",
    pindahError: "",
    success: "",

    alamatKtpSamaDomisili: true,

    konteksSesi: {
      sesiId: "",
      kategori: "",
      kembali: "",
      tanggalMulai: "",
    },
    items: [],
    lokasi: [],
    posyanduFilter: [],
    posyanduForm: [],
    posyanduPindah: [],

    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    },

    filter: {
      q: "",
      lokasiId: "",
      posyanduId: "",
    },

    modalForm: false,
    modalHapus: false,
    modalHapusPermanen: false,
    modalPindah: false,
    modeForm: "tambah",
    pesertaDipilih: null,

    form: {
      nik: "",
      nama: "",
      noRm: "",
      noTelp: "",
      tanggalLahir: "",
      jenisKelamin: "",
      alamatKtp: "",
      rtKtp: "",
      rwKtp: "",
      alamatDomisili: "",
      rtDomisili: "",
      rwDomisili: "",
      aktif: true,
      lokasiId: "",
      posyanduId: "",
      tanggalMulai: "",
    },

    pindah: {
      lokasiId: "",
      posyanduId: "",
      tanggalPindah: "",
    },

    async init() {
      await this.muatLokasi();

      const params =
        new URLSearchParams(
          window.location.search,
        );

      const lokasiId =
        params.get("lokasiId") ??
        "";

      const posyanduId =
        params.get("posyanduId") ??
        "";

      this.konteksSesi = {
        sesiId:
          params.get("sesi") ??
          "",
        kategori:
          params.get("kategori") ??
          "",
        kembali:
          params.get("kembali") ??
          "",
        tanggalMulai:
          params.get("tanggalMulai") ??
          "",
      };

      if (lokasiId) {
        this.filter.lokasiId =
          lokasiId;

        this.posyanduFilter =
          await this.muatPosyandu(
            lokasiId,
          );
      }

      if (
        posyanduId &&
        this.posyanduFilter.some(
          (x) =>
            String(x.id) ===
            String(posyanduId),
        )
      ) {
        this.filter.posyanduId =
          posyanduId;
      }

      await this.muatPeserta();

      if (
        params.get("buat") ===
        "1"
      ) {
        this.bukaTambah();

        if (lokasiId) {
          this.form.lokasiId =
            lokasiId;

          await this.gantiLokasiForm();

          if (
            posyanduId &&
            this.posyanduForm.some(
              (x) =>
                String(x.id) ===
                String(posyanduId),
            )
          ) {
            this.form.posyanduId =
              posyanduId;
          }
        }

        if (
          this.konteksSesi
            .tanggalMulai
        ) {
          this.form.tanggalMulai =
            this.konteksSesi
              .tanggalMulai;
        }
      }
    },

    get isAdmin() {
      return this.$store.auth.user.role === "admin";
    },

    hariIni() {
      return new Date()
        .toISOString()
        .slice(0, 10);
    },

    alamatSama(data) {
      if (
        !data?.alamatDomisili ||
        !data?.rtDomisili ||
        !data?.rwDomisili
      ) {
        return false;
      }

      return (
        (data.alamatKtp ?? "") ===
          data.alamatDomisili &&
        (data.rtKtp ?? "") ===
          data.rtDomisili &&
        (data.rwKtp ?? "") ===
          data.rwDomisili
      );
    },

    sinkronAlamatKtp() {
      if (
        !this.alamatKtpSamaDomisili
      ) {
        return;
      }

      this.form.alamatKtp =
        this.form.alamatDomisili;

      this.form.rtKtp =
        this.form.rtDomisili;

      this.form.rwKtp =
        this.form.rwDomisili;
    },

    toggleAlamatKtpSama() {
      if (
        this.alamatKtpSamaDomisili
      ) {
        this.sinkronAlamatKtp();
      }
    },

    async muatLokasi() {
      const payload =
        await window.PosgaApi.request(
          "/api/lokasi",
        );

      this.lokasi =
        (
          Array.isArray(payload?.data)
            ? payload.data
            : []
        ).filter(
          (x) =>
            x.aktif !== false,
        );
    },

    async muatPosyandu(lokasiId) {
      if (!lokasiId) {
        return [];
      }

      const payload =
        await window.PosgaApi.request(
          `/api/lokasi/${lokasiId}/posyandu`,
        );

      return (
        Array.isArray(payload?.data)
          ? payload.data
          : []
      ).filter(
        (x) =>
          x.aktif !== false,
      );
    },

    async gantiLokasiFilter() {
      this.filter.posyanduId = "";
      this.posyanduFilter =
        await this.muatPosyandu(
          this.filter.lokasiId,
        );
      await this.muatPeserta(1);
    },

    async gantiLokasiForm() {
      this.form.posyanduId = "";
      this.posyanduForm =
        await this.muatPosyandu(
          this.form.lokasiId,
        );
    },

    async gantiLokasiPindah() {
      this.pindah.posyanduId = "";

      const daftar =
        await this.muatPosyandu(
          this.pindah.lokasiId,
        );

      this.posyanduPindah =
        daftar.filter(
          (x) =>
            String(x.id) !==
            String(
              this.pesertaDipilih?.posyanduId ??
              "",
            ),
        );
    },

    async muatPeserta(page = 1) {
      this.loading = true;
      this.error = "";

      try {
        const params =
          new URLSearchParams({
            page:
              String(page),
            limit:
              String(
                this.pagination.limit,
              ),
          });

        if (
          this.filter.q.trim()
        ) {
          params.set(
            "q",
            this.filter.q.trim(),
          );
        }

        if (
          this.filter.lokasiId
        ) {
          params.set(
            "lokasiId",
            this.filter.lokasiId,
          );
        }

        if (
          this.filter.posyanduId
        ) {
          params.set(
            "posyanduId",
            this.filter.posyanduId,
          );
        }

        const payload =
          await window.PosgaApi.request(
            `/api/peserta?${params}`,
          );

        const data =
          payload?.data ?? {};

        this.items =
          Array.isArray(
            data.items,
          )
            ? data.items
            : [];

        this.pagination =
          data.pagination ??
          this.pagination;
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Data peserta gagal dimuat.";
      } finally {
        this.loading = false;
      }
    },

    async resetFilter() {
      this.filter = {
        q: "",
        lokasiId: "",
        posyanduId: "",
      };

      this.posyanduFilter = [];
      await this.muatPeserta(1);
    },

    async masukkanPesertaKeSesi(item) {
      if (
        !this.konteksSesi
          .sesiId ||
        !item?.nik
      ) {
        return;
      }

      this.error = "";
      this.success = "";

      try {
        const rosterPayload =
          await window.PosgaApi.request(
            `/api/sesi/${this.konteksSesi.sesiId}/peserta`,
            {
              method: "POST",
              body: {
                pesertaNik:
                  item.nik,
              },
            },
          );

        const kategoriBaru =
          rosterPayload
            ?.data
            ?.kategoriSaatItu ??
          this.konteksSesi
            .kategori;

        this.arahkanKembaliKePemeriksaan(
          kategoriBaru,
        );
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Peserta gagal dimasukkan ke sesi.";
      }
    },

    arahkanKembaliKePemeriksaan(
      kategoriBaru,
    ) {
      const tujuan =
        this.konteksSesi
          .kembali ||
        `/pemeriksaan/?sesi=${encodeURIComponent(
          this.konteksSesi
            .sesiId,
        )}&kategori=${encodeURIComponent(
          kategoriBaru ||
            this.konteksSesi
              .kategori,
        )}`;

      const url =
        new URL(
          tujuan,
          window.location
            .origin,
        );

      if (kategoriBaru) {
        url.searchParams.set(
          "kategori",
          kategoriBaru,
        );
      }

      window.location.href =
        `${url.pathname}${url.search}`;
    },

    bukaTambah() {
      this.modeForm = "tambah";
      this.pesertaDipilih = null;
      this.posyanduForm = [];
      this.alamatKtpSamaDomisili =
        true;

      this.form = {
        nik: "",
        nama: "",
        noRm: "",
        noTelp: "",
        tanggalLahir: "",
        jenisKelamin: "",
        alamatKtp: "",
        rtKtp: "",
        rwKtp: "",
        alamatDomisili: "",
        rtDomisili: "",
        rwDomisili: "",
        aktif: true,
        lokasiId: "",
        posyanduId: "",
        tanggalMulai:
          this.hariIni(),
      };
      this.modalError = "";
      this.modalForm = true;
    },

    bukaEdit(item) {
      this.modeForm = "edit";
      this.pesertaDipilih = item;
      this.alamatKtpSamaDomisili =
        this.alamatSama(item);

      this.form = {
        ...item,
        noRm: item.noRm ?? "",
        noTelp: item.noTelp ?? "",
        alamatKtp: item.alamatKtp ?? "",
        rtKtp: item.rtKtp ?? "",
        rwKtp: item.rwKtp ?? "",
        alamatDomisili: item.alamatDomisili ?? "",
        rtDomisili: item.rtDomisili ?? "",
        rwDomisili: item.rwDomisili ?? "",
        lokasiId: item.lokasiId ? String(item.lokasiId) : "",
        posyanduId: item.posyanduId ? String(item.posyanduId) : "",
        tanggalMulai: item.tanggalMulaiPosyandu ?? "",
      };

      this.modalError = "";
      this.modalForm = true;
    },

    valueOpsional(value) {
      const t = String(value ?? "").trim();
      return t || null;
    },

    async simpan() {
      if (this.saving) return;

      const nik = this.form.nik.trim();
      const nama = this.form.nama.trim();

      const wajibKosong = [
        ["NIK", nik],
        ["Nama", nama],
        [
          "Tanggal lahir",
          this.form.tanggalLahir,
        ],
        [
          "Jenis kelamin",
          this.form.jenisKelamin,
        ],
        [
          "Alamat domisili",
          this.form.alamatDomisili,
        ],
        [
          "RT domisili",
          this.form.rtDomisili,
        ],
        [
          "RW domisili",
          this.form.rwDomisili,
        ],
      ].filter(
        ([, value]) =>
          !String(
            value ?? "",
          ).trim(),
      );

      if (
        wajibKosong.length >
        0
      ) {
        this.modalError =
          `Field wajib belum diisi: ${wajibKosong
            .map(
              ([label]) =>
                label,
            )
            .join(", ")}.`;

        return;
      }

      this.sinkronAlamatKtp();

      if (
        this.modeForm === "tambah" &&
        (
          !this.form.lokasiId ||
          !this.form.posyanduId ||
          !this.form.tanggalMulai
        )
      ) {
        this.modalError =
          "Lokasi, Posyandu, dan tanggal mulai keanggotaan wajib dipilih.";
        return;
      }

      this.saving = true;
      this.modalError = "";

      try {
        const dasar = {
          nama,
          noRm:
            this.valueOpsional(
              this.form.noRm,
            ),
          noTelp:
            this.valueOpsional(
              this.form.noTelp,
            ),
          tanggalLahir:
            this.form.tanggalLahir,
          jenisKelamin:
            this.form.jenisKelamin,
          alamatKtp:
            this.alamatKtpSamaDomisili
              ? this.form
                  .alamatDomisili
              : this.valueOpsional(
                  this.form
                    .alamatKtp,
                ),

          rtKtp:
            this.alamatKtpSamaDomisili
              ? this.form
                  .rtDomisili
              : this.valueOpsional(
                  this.form.rtKtp,
                ),

          rwKtp:
            this.alamatKtpSamaDomisili
              ? this.form
                  .rwDomisili
              : this.valueOpsional(
                  this.form.rwKtp,
                ),
          alamatDomisili:
            this.valueOpsional(
              this.form.alamatDomisili,
            ),
          rtDomisili:
            this.valueOpsional(
              this.form.rtDomisili,
            ),
          rwDomisili:
            this.valueOpsional(
              this.form.rwDomisili,
            ),
        };

        if (
          this.modeForm ===
          "tambah"
        ) {
          const createPayload =
            await window.PosgaApi.request(
              "/api/peserta",
              {
                method: "POST",
                body: {
                  nik,
                  ...dasar,
                  posyanduId:
                    Number(
                      this.form
                        .posyanduId,
                    ),
                  tanggalMulai:
                    this.form
                      .tanggalMulai,
                },
              },
            );

          const nikBaru =
            createPayload
              ?.data
              ?.peserta
              ?.nik ??
            nik;

          if (
            this.konteksSesi
              .sesiId
          ) {
            const rosterPayload =
              await window.PosgaApi.request(
                `/api/sesi/${this.konteksSesi.sesiId}/peserta`,
                {
                  method:
                    "POST",
                  body: {
                    pesertaNik:
                      nikBaru,
                  },
                },
              );

            const kategoriBaru =
              rosterPayload
                ?.data
                ?.kategoriSaatItu ??
              this.konteksSesi
                .kategori;

            this.modalError = "";
            this.modalForm = false;

            this.arahkanKembaliKePemeriksaan(
              kategoriBaru,
            );

            return;
          }

          this.success =
            "Peserta berhasil dibuat dan langsung ditautkan ke Posyandu.";
        } else {
          await window.PosgaApi.request(
            `/api/peserta/${encodeURIComponent(this.pesertaDipilih.nik)}`,
            {
              method: "PUT",
              body: dasar,
            },
          );

          this.success =
            "Data peserta berhasil diperbarui.";
        }

        this.modalError = "";
        this.modalForm = false;

        await this.muatPeserta(
          this.pagination.page,
        );
      } catch (error) {
        this.modalError =
          error instanceof Error
            ? error.message
            : "Data peserta gagal disimpan.";
      } finally {
        this.saving = false;
      }
    },

    async bukaPindah(item) {
      if (!this.isAdmin || !item?.aktif) return;

      this.pesertaDipilih = item;
      this.pindahError = "";
      this.pindah = {
        lokasiId:
          item.lokasiId
            ? String(item.lokasiId)
            : "",
        posyanduId: "",
        tanggalPindah:
          this.hariIni(),
      };
      this.posyanduPindah = [];
      this.modalPindah = true;

      if (this.pindah.lokasiId) {
        await this.gantiLokasiPindah();
      }
    },

    async simpanPindah() {
      if (
        !this.pindah.lokasiId ||
        !this.pindah.posyanduId ||
        !this.pindah.tanggalPindah ||
        this.moving
      ) {
        this.pindahError =
          "Lokasi, Posyandu tujuan, dan tanggal wajib diisi.";
        return;
      }

      this.moving = true;
      this.pindahError = "";

      try {
        if (
          this.pesertaDipilih?.posyanduId &&
          String(this.pesertaDipilih.posyanduId) ===
            String(this.pindah.posyanduId)
        ) {
          this.pindahError =
            "Pilih Posyandu tujuan yang berbeda dari Posyandu saat ini.";
          return;
        }

        if (
          this.pesertaDipilih.posyanduId
        ) {
          await window.PosgaApi.request(
            `/api/peserta/${encodeURIComponent(this.pesertaDipilih.nik)}/pindah-posyandu`,
            {
              method: "POST",
              body: {
                posyanduBaruId:
                  Number(
                    this.pindah.posyanduId,
                  ),
                tanggalPindah:
                  this.pindah.tanggalPindah,
              },
            },
          );

          this.success =
            "Peserta berhasil dipindahkan ke Posyandu tujuan.";
        } else {
          await window.PosgaApi.request(
            "/api/peserta-posyandu",
            {
              method: "POST",
              body: {
                pesertaNik:
                  this.pesertaDipilih.nik,
                posyanduId:
                  Number(
                    this.pindah.posyanduId,
                  ),
                tanggalMulai:
                  this.pindah.tanggalPindah,
              },
            },
          );

          this.success =
            "Peserta berhasil ditempatkan ke Posyandu.";
        }

        this.pindahError = "";
        this.modalPindah = false;
        await this.muatPeserta(
          this.pagination.page,
        );
      } catch (error) {
        this.pindahError =
          error instanceof Error
            ? error.message
            : "Keanggotaan Posyandu gagal diperbarui.";
      } finally {
        this.moving = false;
      }
    },

    konfirmasiNonaktifkan(item) {
      this.pesertaDipilih = item;
      this.modalHapus = true;
    },

    async nonaktifkan() {
      if (!this.isAdmin || this.deleting) return;
      this.deleting = true;
      try {
        await window.PosgaApi.request(
          `/api/peserta/${encodeURIComponent(this.pesertaDipilih.nik)}/nonaktif`,
          { method: "POST" },
        );
        this.modalHapus = false;
        this.success = "Peserta berhasil dinonaktifkan.";
        await this.muatPeserta(this.pagination.page);
      } catch (error) {
        this.error = error.message ?? "Gagal menonaktifkan peserta.";
      } finally {
        this.deleting = false;
      }
    },

    konfirmasiHapusPermanen(item) {
      this.pesertaDipilih = item;
      this.modalHapusPermanen = true;
    },

    async hapusPermanen() {
      if (!this.isAdmin || this.deleting) return;
      this.deleting = true;
      try {
        await window.PosgaApi.request(
          `/api/peserta/${encodeURIComponent(this.pesertaDipilih.nik)}`,
          { method: "DELETE" },
        );
        this.modalHapusPermanen = false;
        this.success = "Peserta berhasil dihapus permanen.";
        await this.muatPeserta(this.pagination.page);
      } catch (error) {
        this.error = error.message ?? "Peserta gagal dihapus.";
      } finally {
        this.deleting = false;
      }
    },

    formatTanggal(v) {
      return window.PosgaUtils?.formatTanggalIndonesia(v) ?? v ?? "-";
    },

    labelJK(v) {
      return v === "L" ? "Laki-laki" : v === "P" ? "Perempuan" : "-";
    },
  }));
});
