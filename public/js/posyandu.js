document.addEventListener("alpine:init", () => {
  Alpine.data("posyanduPage", () => ({
    loading: true,
    loadingPosyandu: false,
    saving: false,
    deleting: false,
    error: "",
    success: "",

    lokasi: [],
    posyandu: [],
    lokasiTerpilih: null,
    itemDipilih: null,

    modalLokasi: false,
    modalPosyandu: false,
    modalKonfirmasi: false,
    modeForm: "tambah",
    jenisKonfirmasi: "",

    formLokasi: {
      nama: "",
      alamat: "",
      aktif: true,
    },

    formPosyandu: {
      nama: "",
      alamat: "",
      aktif: true,
    },

    async init() {
      await this.muatLokasi();
    },

    get isAdmin() {
      return this.$store.auth.user.role === "admin";
    },

    async muatLokasi() {
      this.loading = true;
      this.error = "";

      try {
        const payload =
          await window.PosgaApi.request(
            "/api/lokasi",
            {
              method: "GET",
            },
          );

        this.lokasi =
          Array.isArray(payload?.data)
            ? payload.data
            : [];

        if (
          this.lokasiTerpilih
        ) {
          const terbaru =
            this.lokasi.find(
              (item) =>
                item.id ===
                this.lokasiTerpilih.id,
            );

          if (terbaru) {
            this.lokasiTerpilih =
              terbaru;

            await this.muatPosyandu(
              terbaru,
            );
          } else {
            this.lokasiTerpilih =
              null;

            this.posyandu =
              [];
          }
        }
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Data lokasi gagal dimuat.";
      } finally {
        this.loading =
          false;
      }
    },

    async pilihLokasi(item) {
      this.lokasiTerpilih =
        item;

      await this.muatPosyandu(
        item,
      );
    },

    async muatPosyandu(item = this.lokasiTerpilih) {
      if (!item) {
        this.posyandu = [];
        return;
      }

      this.loadingPosyandu =
        true;

      this.error =
        "";

      try {
        const payload =
          await window.PosgaApi.request(
            `/api/lokasi/${item.id}/posyandu`,
            {
              method: "GET",
            },
          );

        this.posyandu =
          Array.isArray(payload?.data)
            ? payload.data
            : [];
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Data Posyandu gagal dimuat.";
      } finally {
        this.loadingPosyandu =
          false;
      }
    },

    bukaTambahLokasi() {
      if (!this.isAdmin) {
        return;
      }

      this.modeForm =
        "tambah";

      this.itemDipilih =
        null;

      this.formLokasi = {
        nama: "",
        alamat: "",
        aktif: true,
      };

      this.error = "";
      this.success = "";
      this.modalLokasi = true;
    },

    bukaEditLokasi(item) {
      if (!this.isAdmin) {
        return;
      }

      this.modeForm =
        "edit";

      this.itemDipilih =
        item;

      this.formLokasi = {
        nama:
          item.nama ??
          "",

        alamat:
          item.alamat ??
          "",

        aktif:
          item.aktif !== false,
      };

      this.error = "";
      this.success = "";
      this.modalLokasi = true;
    },

    bukaTambahPosyandu() {
      if (
        !this.isAdmin ||
        !this.lokasiTerpilih
      ) {
        return;
      }

      this.modeForm =
        "tambah";

      this.itemDipilih =
        null;

      this.formPosyandu = {
        nama: "",
        alamat: "",
        aktif: true,
      };

      this.error = "";
      this.success = "";
      this.modalPosyandu = true;
    },

    bukaEditPosyandu(item) {
      if (!this.isAdmin) {
        return;
      }

      this.modeForm =
        "edit";

      this.itemDipilih =
        item;

      this.formPosyandu = {
        nama:
          item.nama ??
          "",

        alamat:
          item.alamat ??
          "",

        aktif:
          item.aktif !== false,
      };

      this.error = "";
      this.success = "";
      this.modalPosyandu = true;
    },

    async simpanLokasi() {
      if (
        !this.isAdmin ||
        this.saving
      ) {
        return;
      }

      const nama =
        this.formLokasi.nama.trim();

      if (!nama) {
        this.error =
          "Nama lokasi wajib diisi.";

        return;
      }

      this.saving = true;
      this.error = "";
      this.success = "";

      try {
        if (
          this.modeForm ===
          "tambah"
        ) {
          await window.PosgaApi.request(
            "/api/lokasi",
            {
              method: "POST",

              body: {
                nama,

                alamat:
                  this.formLokasi.alamat.trim() ||
                  undefined,

                aktif:
                  this.formLokasi.aktif,
              },
            },
          );

          this.success =
            "Lokasi berhasil ditambahkan.";
        } else {
          await window.PosgaApi.request(
            `/api/lokasi/${this.itemDipilih.id}`,
            {
              method: "PUT",

              body: {
                nama,

                alamat:
                  this.formLokasi.alamat.trim() ||
                  null,

                aktif:
                  this.formLokasi.aktif,
              },
            },
          );

          this.success =
            "Lokasi berhasil diperbarui.";
        }

        this.modalLokasi =
          false;

        await this.muatLokasi();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Lokasi gagal disimpan.";
      } finally {
        this.saving =
          false;
      }
    },

    async simpanPosyandu() {
      if (
        !this.isAdmin ||
        !this.lokasiTerpilih ||
        this.saving
      ) {
        return;
      }

      const nama =
        this.formPosyandu.nama.trim();

      if (!nama) {
        this.error =
          "Nama Posyandu wajib diisi.";

        return;
      }

      this.saving = true;
      this.error = "";
      this.success = "";

      try {
        if (
          this.modeForm ===
          "tambah"
        ) {
          await window.PosgaApi.request(
            "/api/posyandu",
            {
              method: "POST",

              body: {
                lokasiId:
                  this.lokasiTerpilih.id,

                nama,

                alamat:
                  this.formPosyandu.alamat.trim() ||
                  undefined,

                aktif:
                  this.formPosyandu.aktif,
              },
            },
          );

          this.success =
            "Posyandu berhasil ditambahkan.";
        } else {
          await window.PosgaApi.request(
            `/api/posyandu/${this.itemDipilih.id}`,
            {
              method: "PUT",

              body: {
                nama,

                alamat:
                  this.formPosyandu.alamat.trim() ||
                  null,

                aktif:
                  this.formPosyandu.aktif,
              },
            },
          );

          this.success =
            "Posyandu berhasil diperbarui.";
        }

        this.modalPosyandu =
          false;

        await this.muatPosyandu();
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Posyandu gagal disimpan.";
      } finally {
        this.saving =
          false;
      }
    },

    konfirmasiLokasi(item) {
      if (!this.isAdmin) {
        return;
      }

      this.jenisKonfirmasi =
        "lokasi";

      this.itemDipilih =
        item;

      this.modalKonfirmasi =
        true;

      this.error = "";
      this.success = "";
    },

    konfirmasiPosyandu(item) {
      if (!this.isAdmin) {
        return;
      }

      this.jenisKonfirmasi =
        "posyandu";

      this.itemDipilih =
        item;

      this.modalKonfirmasi =
        true;

      this.error = "";
      this.success = "";
    },

    konfirmasiHapusPosyandu(item) {
      if (!this.isAdmin) {
        return;
      }

      this.jenisKonfirmasi =
        "hapus_posyandu";

      this.itemDipilih =
        item;

      this.modalKonfirmasi =
        true;

      this.error = "";
      this.success = "";
    },

    async nonaktifkan() {
      if (
        !this.isAdmin ||
        !this.itemDipilih ||
        this.deleting
      ) {
        return;
      }

      this.deleting =
        true;

      this.error = "";
      this.success = "";

      try {
        if (
          this.jenisKonfirmasi ===
          "lokasi"
        ) {
          await window.PosgaApi.request(
            `/api/lokasi/${this.itemDipilih.id}`,
            {
              method: "DELETE",
            },
          );

          this.success =
            "Lokasi berhasil dinonaktifkan.";

          this.modalKonfirmasi =
            false;

          await this.muatLokasi();
        } else {
          await window.PosgaApi.request(
            `/api/posyandu/${this.itemDipilih.id}/nonaktif`,
            {
              method: "POST",
            },
          );

          this.success =
            "Posyandu berhasil dinonaktifkan.";

          this.modalKonfirmasi =
            false;

          await this.muatPosyandu();
        }
      } catch (error) {
        this.error =
          error instanceof Error
            ? error.message
            : "Data gagal dinonaktifkan.";
      } finally {
        this.deleting =
          false;
      }
    },

    async hapusPosyanduPermanen() {
      if (
        !this.isAdmin ||
        !this.itemDipilih ||
        this.deleting
      ) {
        return;
      }

      this.deleting =
        true;

      this.error = "";
      this.success = "";

      try {
        await window.PosgaApi.request(
          `/api/posyandu/${this.itemDipilih.id}`,
          {
            method: "DELETE",
          },
        );

        this.modalKonfirmasi =
          false;

        this.success =
          "Posyandu berhasil dihapus permanen.";

        await this.muatPosyandu();
      } catch (error) {
        this.modalKonfirmasi =
          false;

        this.error =
          error instanceof Error
            ? error.message
            : "Posyandu gagal dihapus.";
      } finally {
        this.deleting =
          false;
      }
    },

    async prosesKonfirmasi() {
      if (
        this.jenisKonfirmasi ===
        "hapus_posyandu"
      ) {
        await this.hapusPosyanduPermanen();

        return;
      }

      await this.nonaktifkan();
    },
  }));
});
