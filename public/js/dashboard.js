document.addEventListener("alpine:init", () => {
  Alpine.data("dashboardPage", () => ({
    loading: true,
    error: "",
    statistik: {
      lokasiAktif: 0,
      posyanduAktif: 0,
      sesiBulanIni: 0,
      sesiAktif: 0,
    },
    sesiTerbaru: [],

    async init() {
      await this.muatDashboard();
    },

    async muatDashboard() {
      this.loading = true;
      this.error = "";

      try {
        const lokasiPayload =
          await window.PosgaApi.request(
            "/api/lokasi",
            {
              method: "GET",
            },
          );

        const lokasi =
          Array.isArray(lokasiPayload?.data)
            ? lokasiPayload.data
            : [];

        const lokasiAktif =
          lokasi.filter(
            (item) =>
              item.aktif !== false,
          );

        const hasilPosyandu =
          await Promise.all(
            lokasiAktif.map(
              async (item) => {
                const payload =
                  await window.PosgaApi.request(
                    `/api/lokasi/${item.id}/posyandu`,
                    {
                      method: "GET",
                    },
                  );

                return Array.isArray(
                  payload?.data,
                )
                  ? payload.data
                  : [];
              },
            ),
          );

        const posyandu =
          hasilPosyandu
            .flat()
            .filter(
              (item) =>
                item.aktif !== false,
            );

        const sekarang =
          new Date();

        const tahun =
          sekarang.getFullYear();

        const bulan =
          sekarang.getMonth();

        const tanggalMulai =
          `${tahun}-${String(
            bulan + 1,
          ).padStart(
            2,
            "0",
          )}-01`;

        const akhirBulan =
          new Date(
            tahun,
            bulan + 1,
            0,
          );

        const tanggalSelesai =
          `${tahun}-${String(
            bulan + 1,
          ).padStart(
            2,
            "0",
          )}-${String(
            akhirBulan.getDate(),
          ).padStart(
            2,
            "0",
          )}`;

        const hasilSesi =
          await Promise.all(
            posyandu.map(
              async (item) => {
                const params =
                  new URLSearchParams({
                    tanggalMulai,
                    tanggalSelesai,
                    page: "1",
                    limit: "100",
                  });

                const payload =
                  await window.PosgaApi.request(
                    `/api/posyandu/${item.id}/sesi/search?${params.toString()}`,
                    {
                      method: "GET",
                    },
                  );

                const data =
                  payload?.data;

                const items =
                  Array.isArray(data)
                    ? data
                    : Array.isArray(
                        data?.items,
                      )
                      ? data.items
                      : [];

                return items.map(
                  (sesi) => ({
                    ...sesi,

                    posyanduId:
                      sesi.posyanduId ??
                      item.id,

                    namaPosyandu:
                      sesi.namaPosyandu ??
                      item.nama,
                  }),
                );
              },
            ),
          );

        const semuaSesi =
          hasilSesi
            .flat()
            .sort(
              (a, b) => {
                const tanggalA =
                  String(
                    a.tanggalPosga ??
                    "",
                  );

                const tanggalB =
                  String(
                    b.tanggalPosga ??
                    "",
                  );

                if (
                  tanggalA !==
                  tanggalB
                ) {
                  return tanggalB.localeCompare(
                    tanggalA,
                  );
                }

                return Number(
                  b.id ??
                  0,
                ) -
                Number(
                  a.id ??
                  0,
                );
              },
            );

        this.statistik = {
          lokasiAktif:
            lokasiAktif.length,

          posyanduAktif:
            posyandu.length,

          sesiBulanIni:
            semuaSesi.length,

          sesiAktif:
            semuaSesi.filter(
              (item) =>
                item.status ===
                "aktif",
            ).length,
        };

        const terbaru =
          semuaSesi.slice(
            0,
            5,
          );

        this.sesiTerbaru =
          await Promise.all(
            terbaru.map(
              async (item) => {
                try {
                  const payload =
                    await window.PosgaApi.request(
                      `/api/sesi/${item.id}/rekap`,
                      {
                        method: "GET",
                      },
                    );

                  const rekap =
                    payload?.data;

                  return {
                    ...item,

                    namaPosyandu:
                      rekap?.sesi
                        ?.namaPosyandu ??
                      item.namaPosyandu,

                    ringkasan:
                      rekap?.ringkasan ??
                      null,
                  };
                } catch {
                  return {
                    ...item,

                    ringkasan:
                      null,
                  };
                }
              },
            ),
          );
      } catch (
        error
      ) {
        this.error =
          error instanceof Error
            ? error.message
            : "Dashboard gagal dimuat.";
      } finally {
        this.loading =
          false;
      }
    },

    formatTanggal(value) {
      return window.PosgaUtils
        ?.formatTanggalIndonesia(
          value,
        ) ??
        value ??
        "-";
    },

    labelStatus(status) {
      const labels = {
        aktif: "Aktif",
        selesai: "Selesai",
        dibatalkan: "Dibatalkan",
      };

      return labels[status] ??
        status ??
        "-";
    },

    kelasStatus(status) {
      if (
        status ===
        "aktif"
      ) {
        return "bg-emerald-50 text-emerald-700";
      }

      if (
        status ===
        "selesai"
      ) {
        return "bg-blue-50 text-blue-700";
      }

      if (
        status ===
        "dibatalkan"
      ) {
        return "bg-red-50 text-red-700";
      }

      return "bg-slate-100 text-slate-600";
    },

    progres(item) {
      const ringkasan =
        item?.ringkasan;

      if (!ringkasan) {
        return null;
      }

      if (
        typeof ringkasan.persenSelesai ===
        "number"
      ) {
        return ringkasan.persenSelesai;
      }

      const total =
        Number(
          ringkasan.totalRoster ??
          0,
        );

      const selesai =
        Number(
          ringkasan.statusPemeriksaan
            ?.selesai ??
          0,
        );

      if (
        total <=
        0
      ) {
        return 100;
      }

      return Math.round(
        selesai /
          total *
          100,
      );
    },

    totalRoster(item) {
      return Number(
        item?.ringkasan
          ?.totalRoster ??
        0,
      );
    },
  }));
});
