document.addEventListener("alpine:init", () => {
  Alpine.data("posgaLayout", () => ({
    namaAplikasi:
      "POSGA",

    subjudulAplikasi:
      "Sistem Pelayanan Posyandu",

    halamanAktif:
      "dashboard",

    akunTerbuka:
      false,

    navigasi: [
      {
        id:
          "dashboard",

        label:
          "Dashboard",

        href:
          "/",

        icon:
          "home",
      },
      {
        id:
          "peserta",

        label:
          "Peserta",

        href:
          "/peserta/",

        icon:
          "users",
      },
      {
        id:
          "posyandu",

        label:
          "Posyandu",

        href:
          "/posyandu/",

        icon:
          "building",
      },
      {
        id:
          "sesi",

        label:
          "Sesi POSGA",

        href:
          "/sesi/",

        icon:
          "calendar",
      },
      {
        id:
          "reproduksi",

        label:
          "Reproduksi",

        href:
          "/reproduksi/",

        icon:
          "heart",
      },
      {
        id:
          "riwayat",

        label:
          "Riwayat",

        href:
          "/riwayat/",

        icon:
          "history",
      },
      {
        id:
          "rekap",

        label:
          "Rekap",

        href:
          "/rekap/",

        icon:
          "chart",
      },
    ],

    async init() {
      this.halamanAktif =
        document.body.dataset.page ??
        "dashboard";

      await this.$store.auth.initPrivate();

      document.body.classList.add(
        "posga-safe-bottom",
      );

      this.pasangNavigasiMobile();
    },

    pasangNavigasiMobile() {
      if (
        document.getElementById(
          "posga-mobile-navigation",
        )
      ) {
        return;
      }

      const wrapper =
        document.createElement(
          "nav",
        );

      wrapper.id =
        "posga-mobile-navigation";

      wrapper.className =
        "posga-mobile-bar";

      wrapper.setAttribute(
        "aria-label",
        "Navigasi utama",
      );

      const inner =
        document.createElement(
          "div",
        );

      inner.className =
        "posga-mobile-bar-inner";

      for (
        const item of
        this.navigasi
      ) {
        const link =
          document.createElement(
            "a",
          );

        link.href =
          item.href;

        link.className =
          [
            "posga-mobile-nav-link",
            item.id ===
              this.halamanAktif
              ? "posga-mobile-nav-link-active"
              : "",
          ]
            .filter(Boolean)
            .join(" ");

        link.innerHTML =
          `<span class="size-5">${this.iconSvg(item.icon)}</span><span>${item.label}</span>`;

        inner.appendChild(
          link,
        );
      }

      wrapper.appendChild(
        inner,
      );

      document.body.appendChild(
        wrapper,
      );
    },

    get user() {
      return this.$store.auth.user;
    },

    get inisialUser() {
      const nama =
        this.user?.nama ||
        this.user?.username ||
        "POSGA";

      return nama
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(
          (bagian) =>
            bagian[0]?.toUpperCase() ??
            "",
        )
        .join("") ||
        "P";
    },

    async logout() {
      await this.$store.auth.logout();
    },

    iconSvg(icon) {
      const icons = {
        home: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10.75 12 3l9 7.75V21a1 1 0 0 1-1 1h-5.5v-6.5h-5V22H4a1 1 0 0 1-1-1V10.75Z"/>
          </svg>
        `,

        users: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        `,

        building: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 22V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v18M8 6h5M8 10h5M8 14h5M2 22h20M17 9h3a1 1 0 0 1 1 1v12"/>
          </svg>
        `,

        calendar: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2"/>
            <path stroke-linecap="round" d="M16 3v4M8 3v4M3 10h18"/>
          </svg>
        `,

        heart: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>
          </svg>
        `,

        history: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 3v5h5M12 7v5l3 2"/>
          </svg>
        `,

        chart: `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path stroke-linecap="round" d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>
          </svg>
        `,
      };

      return icons[icon] ??
        "";
    },
  }));
});
