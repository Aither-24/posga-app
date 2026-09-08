document.addEventListener("alpine:init", () => {
  Alpine.data("sesiPage", () => ({
    loading: false,
    error: "",
    success: "",
    lokasi: [],
    posyandu: [],
    sesi: [],
    pesertaSesi: [],
    lokasiId: "",
    posyanduId: "",
    sesiAktif: null,
    kategoriAktif: "",
    saving: false,
    processing: false,
    modalForm: false,
    modalKonfirmasi: false,
    modeForm: "tambah",
    aksiKonfirmasi: "",
    filter: { status: "", tanggalMulai: "", tanggalSelesai: "" },
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false },
    form: { tanggalPosga: "", catatan: "" },
    kategori: [
      ["bayi","Bayi"],["balita","Balita"],["prasekolah","Prasekolah"],["sekolah","Sekolah"],
      ["dewasa","Dewasa"],["lansia","Lansia"],["ibu_hamil","Ibu Hamil"],["ibu_nifas","Ibu Nifas"]
    ],

    async init() {
      await this.muatLokasi();

      const params = new URLSearchParams(location.search);
      const lokasiId = params.get("lokasiId") ?? "";
      const posyanduId = params.get("posyanduId") ?? "";
      const id = Number(params.get("id"));
      const kategori = params.get("kategori") ?? "";
      const page = Math.max(1, Number(params.get("page")) || 1);

      this.filter = {
        status: params.get("status") ?? "",
        tanggalMulai: params.get("tanggalMulai") ?? "",
        tanggalSelesai: params.get("tanggalSelesai") ?? "",
      };

      if (lokasiId && this.lokasi.some((x) => String(x.id) === lokasiId)) {
        this.lokasiId = lokasiId;
        await this.muatPosyanduLokasi(lokasiId);
      }

      if (
        posyanduId &&
        this.posyandu.some((x) => String(x.id) === posyanduId)
      ) {
        this.posyanduId = posyanduId;
        await this.muatSesi(page);
      }

      if (kategori && this.kategori.some((x) => x[0] === kategori)) {
        this.kategoriAktif = kategori;
      }

      if (Number.isInteger(id) && id > 0) {
        await this.bukaSesiById(id);
      } else {
        this.sinkronUrl();
      }
    },

    get pesertaSesiKategori() {
      return this.kategoriAktif ? this.pesertaSesi.filter(x => x.kategori === this.kategoriAktif) : [];
    },

    jumlahKategori(id) { return this.pesertaSesi.filter(x => x.kategori === id).length; },
    jumlahSelesai(id) { return this.pesertaSesi.filter(x => x.kategori === id && x.statusPemeriksaan === "selesai").length; },
    labelKategori(id) { return this.kategori.find(x => x[0] === id)?.[1] ?? id; },

    async muatLokasi() {
      try {
        const p = await PosgaApi.request("/api/lokasi");
        this.lokasi = (Array.isArray(p?.data) ? p.data : []).filter(x => x.aktif !== false);
      } catch (e) { this.error = e.message ?? "Lokasi gagal dimuat."; }
    },

    async muatPosyanduLokasi(lokasiId) {
      this.posyandu = [];
      if (!lokasiId) return;

      try {
        const p = await PosgaApi.request(`/api/lokasi/${lokasiId}/posyandu`);
        this.posyandu = (Array.isArray(p?.data) ? p.data : [])
          .filter((x) => x.aktif !== false);
      } catch (e) {
        this.error = e.message ?? "Posyandu gagal dimuat.";
      }
    },

    sinkronUrl() {
      const u = new URL(location.href);

      const setAtauHapus = (nama, nilai) => {
        const teks = String(nilai ?? "").trim();
        if (teks) u.searchParams.set(nama, teks);
        else u.searchParams.delete(nama);
      };

      setAtauHapus("lokasiId", this.lokasiId);
      setAtauHapus("posyanduId", this.posyanduId);
      setAtauHapus("status", this.filter.status);
      setAtauHapus("tanggalMulai", this.filter.tanggalMulai);
      setAtauHapus("tanggalSelesai", this.filter.tanggalSelesai);

      if (this.pagination.page > 1) {
        u.searchParams.set("page", String(this.pagination.page));
      } else {
        u.searchParams.delete("page");
      }

      if (this.sesiAktif?.id) {
        u.searchParams.set("id", String(this.sesiAktif.id));
      } else {
        u.searchParams.delete("id");
      }

      if (this.kategoriAktif) {
        u.searchParams.set("kategori", this.kategoriAktif);
      } else {
        u.searchParams.delete("kategori");
      }

      history.replaceState(null, "", u);
    },

    async gantiLokasi() {
      this.posyanduId = "";
      this.sesi = [];
      this.sesiAktif = null;
      this.pesertaSesi = [];
      this.kategoriAktif = "";
      await this.muatPosyanduLokasi(this.lokasiId);
      this.sinkronUrl();
    },

    async gantiPosyandu() {
      this.sesiAktif = null;
      this.pesertaSesi = [];
      this.kategoriAktif = "";

      if (!this.posyanduId) {
        this.sesi = [];
        this.sinkronUrl();
        return;
      }

      await this.muatSesi(1);
      this.sinkronUrl();
    },

    async muatSesi(page = 1) {
      if (!this.posyanduId) return;
      this.loading = true; this.error = "";
      try {
        const q = new URLSearchParams({ page: String(page), limit: "20" });
        if (this.filter.status) q.set("status", this.filter.status);
        if (this.filter.tanggalMulai) q.set("tanggalMulai", this.filter.tanggalMulai);
        if (this.filter.tanggalSelesai) q.set("tanggalSelesai", this.filter.tanggalSelesai);
        const p = await PosgaApi.request(`/api/posyandu/${this.posyanduId}/sesi/search?${q}`);
        const d = p?.data ?? {};
        this.sesi = Array.isArray(d) ? d : (Array.isArray(d.items) ? d.items : []);
        this.pagination = d.pagination ?? { page, limit:20, total:this.sesi.length, totalPages:this.sesi.length?1:0, hasNext:false, hasPrevious:false };
        this.sinkronUrl();
      } catch (e) { this.error = e.message ?? "Sesi gagal dimuat."; }
      finally { this.loading = false; }
    },

    async bukaSesiById(id) {
      this.loading = true; this.error = "";
      try {
        const [s, r] = await Promise.all([
          PosgaApi.request(`/api/sesi/${id}`),
          PosgaApi.request(`/api/sesi/${id}/peserta`)
        ]);
        this.sesiAktif = s?.data ?? null;
        this.pesertaSesi = Array.isArray(r?.data) ? r.data : [];
        if (
          !this.kategoriAktif ||
          !this.kategori.some((x) => x[0] === this.kategoriAktif)
        ) {
          this.kategoriAktif =
            this.kategori.find((x) => this.jumlahKategori(x[0]) > 0)?.[0] ??
            this.kategori[0]?.[0] ??
            "";
        }

        this.sinkronUrl();
      } catch (e) { this.error = e.message ?? "Detail sesi gagal dimuat."; }
      finally { this.loading = false; }
    },

    bukaTambah() {
      if (!this.posyanduId) { this.error = "Pilih lokasi dan Posyandu terlebih dahulu."; return; }
      this.modeForm = "tambah";
      this.form = { tanggalPosga: new Date().toISOString().slice(0,10), catatan:"" };
      this.modalForm = true;
    },

    bukaEdit() {
      if (this.sesiAktif?.status !== "aktif") return;
      this.modeForm = "edit";
      this.form = { tanggalPosga:this.sesiAktif.tanggalPosga ?? "", catatan:this.sesiAktif.catatan ?? "" };
      this.modalForm = true;
    },

    async simpanSesi() {
      if (this.saving || !this.form.tanggalPosga) return;
      this.saving = true; this.error = "";
      try {
        if (this.modeForm === "tambah") {
          const p = await PosgaApi.request("/api/sesi", {
            method:"POST",
            body:{
              posyanduId:Number(this.posyanduId),
              tanggalPosga:this.form.tanggalPosga,
              ...(this.form.catatan.trim() ? {catatan:this.form.catatan.trim()} : {})
            }
          });
          this.modalForm = false; this.success = "Sesi berhasil dibuat dan peserta sesi otomatis disiapkan.";
          await this.muatSesi(1);
          if (p?.data?.sesi?.id) await this.bukaSesiById(Number(p.data.sesi.id));
        } else {
          await PosgaApi.request(`/api/sesi/${this.sesiAktif.id}`, {
            method:"PUT",
            body:{ tanggalPosga:this.form.tanggalPosga, catatan:this.form.catatan.trim() || null }
          });
          this.modalForm = false; this.success = "Sesi berhasil diperbarui.";
          await this.muatSesi(this.pagination.page);
          await this.bukaSesiById(this.sesiAktif.id);
        }
      } catch (e) { this.error = e.message ?? "Sesi gagal disimpan."; }
      finally { this.saving = false; }
    },

    konfirmasi(aksi) { this.aksiKonfirmasi = aksi; this.modalKonfirmasi = true; },

    async prosesKonfirmasi() {
      if (!this.sesiAktif || this.processing) return;
      this.processing = true; this.error = "";
      try {
        if (this.aksiKonfirmasi === "hapus") {
          const idDihapus = this.sesiAktif.id;

          await PosgaApi.request(
            `/api/sesi/${idDihapus}`,
            { method: "DELETE" },
          );

          this.modalKonfirmasi = false;
          this.sesiAktif = null;
          this.pesertaSesi = [];
          this.kategoriAktif = "";
          this.success = "Sesi berhasil dihapus permanen.";

          this.sinkronUrl();

          await this.muatSesi(this.pagination.page);
          return;
        }

        const ep = this.aksiKonfirmasi === "selesai"
          ? `/api/sesi/${this.sesiAktif.id}/selesai`
          : `/api/sesi/${this.sesiAktif.id}/batal`;

        await PosgaApi.request(ep,{method:"POST"});
        this.modalKonfirmasi = false;
        this.success = this.aksiKonfirmasi === "selesai" ? "Sesi berhasil diselesaikan." : "Sesi berhasil dibatalkan.";
        await this.muatSesi(this.pagination.page);
        await this.bukaSesiById(this.sesiAktif.id);
      } catch (e) { this.modalKonfirmasi = false; this.error = e.message ?? "Status sesi gagal diubah."; }
      finally { this.processing = false; }
    },


    pilihKategori(id) {
      if (!this.kategori.some((x) => x[0] === id)) return;
      this.kategoriAktif = id;
      this.sinkronUrl();
    },

    bukaPemeriksaan(id) {
      if (!this.sesiAktif || !id) return;

      this.kategoriAktif = id;
      this.sinkronUrl();

      const kembali = `${location.pathname}${location.search}`;
      const params = new URLSearchParams({
        sesi: String(this.sesiAktif.id),
        kategori: id,
        kembali,
      });

      location.href = `/pemeriksaan/?${params.toString()}`;
    },

    formatTanggal(v) { return PosgaUtils?.formatTanggalIndonesia(v) ?? v ?? "-"; },
    statusLabel(s) { return ({aktif:"Aktif",selesai:"Selesai",dibatalkan:"Dibatalkan"})[s] ?? s ?? "-"; },
    statusClass(s) { return s==="aktif"?"bg-emerald-50 text-emerald-700":s==="selesai"?"bg-blue-50 text-blue-700":"bg-red-50 text-red-700"; },
    statusPesertaLabel(s) { return ({belum_diperiksa:"Belum diperiksa",sedang_diperiksa:"Sedang diperiksa",selesai:"Selesai",tidak_hadir:"Tidak hadir",batal:"Batal"})[s] ?? s; },
    statusPesertaClass(s) { return s==="selesai"?"bg-emerald-50 text-emerald-700":s==="sedang_diperiksa"?"bg-amber-50 text-amber-700":(s==="tidak_hadir"||s==="batal")?"bg-red-50 text-red-700":"bg-slate-100 text-slate-600"; }
  }));
});
