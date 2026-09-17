(() => {
  const DEFAULT_USER = {
    id: null,
    username: "",
    nama: "",
    role: "",
    expiresAt: null,
  };

  function normalisasiUser(data) {
    return {
      id:
        data?.id ??
        null,

      username:
        data?.username ??
        "",

      nama:
        data?.nama ??
        data?.username ??
        "",

      role:
        data?.role ??
        "",

      expiresAt:
        data?.expiresAt ??
        null,
    };
  }

  function nextTujuan() {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const next =
      params.get(
        "next",
      );

    if (
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !next.startsWith("/login")
    ) {
      return next;
    }

    return "/";
  }

  async function verifikasiSession() {
    const auth =
      window.PosgaApi.bacaAuth();

    if (
      !auth ||
      window.PosgaApi.tokenKadaluarsa(
        auth,
      )
    ) {
      window.PosgaApi.hapusAuth();

      window.PosgaApi.arahkanKeLogin();

      throw new Error(
        "Sesi tidak tersedia.",
      );
    }

    const payload =
      await window.PosgaApi.request(
        "/api/auth/me",
        {
          method:
            "GET",

          auth:
            true,

          redirectUnauthorized:
            true,
        },
      );

    const user =
      normalisasiUser(
        payload?.data,
      );

    window.PosgaApi.simpanAuth({
      token:
        auth.token,

      expiresAt:
        user.expiresAt ??
        auth.expiresAt ??
        null,

      user,
    });

    return user;
  }

  async function logout() {
    const auth =
      window.PosgaApi.bacaAuth();

    try {
      if (auth?.token) {
        await window.PosgaApi.request(
          "/api/auth/logout",
          {
            method:
              "POST",

            auth:
              true,

            redirectUnauthorized:
              false,
          },
        );
      }
    } catch {
      // Logout lokal tetap dilakukan bila server sudah
      // menganggap sesi tidak valid / tidak tersedia.
    } finally {
      window.PosgaApi.hapusAuth();

      window.location.replace(
        "/login.html",
      );
    }
  }

  window.PosgaAuth = {
    verifikasiSession,
    logout,
    nextTujuan,
  };

  document.addEventListener(
    "alpine:init",
    () => {
      Alpine.store(
        "auth",
        {
          loading:
            true,

          user: {
            ...DEFAULT_USER,
          },

          async initPrivate() {
            this.loading =
              true;

            try {
              this.user =
                await verifikasiSession();
            } finally {
              this.loading =
                false;

              document.documentElement.dataset.authReady =
                "true";
            }
          },

          async logout() {
            await logout();
          },
        },
      );

      Alpine.data(
        "loginPage",
        () => ({
          username:
            "",

          password:
            "",

          loading:
            false,

          checking:
            true,

          error:
            "",

          tampilkanPassword:
            false,

          async init() {
            const auth =
              window.PosgaApi.bacaAuth();

            if (
              !auth ||
              window.PosgaApi.tokenKadaluarsa(
                auth,
              )
            ) {
              window.PosgaApi.hapusAuth();

              this.checking =
                false;

              return;
            }

            try {
              await verifikasiSession();

              window.location.replace(
                nextTujuan(),
              );
            } catch {
              window.PosgaApi.hapusAuth();

              this.checking =
                false;
            }
          },

          async submit() {
            if (
              this.loading
            ) {
              return;
            }

            this.error =
              "";

            const username =
              this.username.trim();

            if (
              !username ||
              !this.password
            ) {
              this.error =
                "Username dan password wajib diisi.";

              return;
            }

            this.loading =
              true;

            try {
              const payload =
                await window.PosgaApi.request(
                  "/api/auth/login",
                  {
                    method:
                      "POST",

                    auth:
                      false,

                    redirectUnauthorized:
                      false,

                    body: {
                      username,

                      password:
                        this.password,
                    },
                  },
                );

              const data =
                payload?.data;

              if (
                !data?.token ||
                !data?.user
              ) {
                throw new Error(
                  "Response login dari server tidak valid.",
                );
              }

              window.PosgaApi.simpanAuth({
                token:
                  data.token,

                expiresAt:
                  data.expiresAt ??
                  null,

                user:
                  normalisasiUser({
                    ...data.user,

                    expiresAt:
                      data.expiresAt ??
                      null,
                  }),
              });

              window.location.replace(
                nextTujuan(),
              );
            } catch (
              error
            ) {
              this.error =
                error instanceof Error
                  ? error.message
                  : "Login gagal.";

              this.password =
                "";
            } finally {
              this.loading =
                false;
            }
          },
        }),
      );
    },
  );
})();

