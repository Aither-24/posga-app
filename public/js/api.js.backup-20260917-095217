(() => {
  const STORAGE_KEY = "posga.auth";

  function bacaAuth() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);

      if (
        !parsed ||
        typeof parsed.token !== "string" ||
        !parsed.token
      ) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return parsed;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function simpanAuth(data) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data),
    );
  }

  function hapusAuth() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function tokenKadaluarsa(auth) {
    if (!auth?.expiresAt) {
      return false;
    }

    const expiresAt = new Date(auth.expiresAt).getTime();

    if (Number.isNaN(expiresAt)) {
      return false;
    }

    return expiresAt <= Date.now();
  }

  function arahkanKeLogin() {
    const tujuan =
      `${window.location.pathname}${window.location.search}`;

    const params =
      new URLSearchParams({
        next: tujuan,
      });

    window.location.replace(
      `/login.html?${params.toString()}`,
    );
  }

  async function request(
    path,
    options = {},
  ) {
    const {
      auth = true,
      redirectUnauthorized = true,
      headers: customHeaders = {},
      body,
      ...fetchOptions
    } = options;

    const headers =
      new Headers(
        customHeaders,
      );

    headers.set(
      "Accept",
      "application/json",
    );

    let requestBody =
      body;

    if (
      body !== undefined &&
      body !== null &&
      !(body instanceof FormData) &&
      typeof body !== "string"
    ) {
      headers.set(
        "Content-Type",
        "application/json",
      );

      requestBody =
        JSON.stringify(
          body,
        );
    }

    if (auth) {
      const authData =
        bacaAuth();

      if (
        !authData ||
        tokenKadaluarsa(
          authData,
        )
      ) {
        hapusAuth();

        if (
          redirectUnauthorized
        ) {
          arahkanKeLogin();
        }

        throw new Error(
          "Sesi autentikasi tidak tersedia.",
        );
      }

      headers.set(
        "Authorization",
        `Bearer ${authData.token}`,
      );
    }

    let response;

    try {
      response =
        await fetch(
          path,
          {
            ...fetchOptions,

            headers,

            body:
              requestBody,
          },
        );
    } catch {
      throw new Error(
        "Tidak dapat terhubung ke server POSGA.",
      );
    }

    const contentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    let payload =
      null;

    if (
      contentType.includes(
        "application/json",
      )
    ) {
      try {
        payload =
          await response.json();
      } catch {
        payload =
          null;
      }
    }

    if (
      response.status ===
      401
    ) {
      hapusAuth();

      if (
        auth &&
        redirectUnauthorized
      ) {
        arahkanKeLogin();
      }
    }

    if (
      !response.ok
    ) {
      const pesan =
        payload?.message ??
        payload?.error?.message ??
        payload?.error ??
        payload?.data?.message ??
        `Request gagal (${response.status}).`;

      const error =
        new Error(
          typeof pesan ===
            "string"
            ? pesan
            : `Request gagal (${response.status}).`,
        );

      error.status =
        response.status;

      error.payload =
        payload;

      throw error;
    }

    return payload;
  }

  async function requestBlob(
    path,
    options = {},
  ) {
    const {
      auth = true,
      redirectUnauthorized = true,
      headers: customHeaders = {},
      ...fetchOptions
    } = options;

    const headers =
      new Headers(
        customHeaders,
      );

    headers.set(
      "Accept",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*",
    );

    if (auth) {
      const authData =
        bacaAuth();

      if (
        !authData ||
        tokenKadaluarsa(
          authData,
        )
      ) {
        hapusAuth();

        if (
          redirectUnauthorized
        ) {
          arahkanKeLogin();
        }

        throw new Error(
          "Sesi autentikasi tidak tersedia.",
        );
      }

      headers.set(
        "Authorization",
        `Bearer ${authData.token}`,
      );
    }

    let response;

    try {
      response =
        await fetch(
          path,
          {
            ...fetchOptions,
            headers,
          },
        );
    } catch {
      throw new Error(
        "Tidak dapat terhubung ke server POSGA.",
      );
    }

    if (
      response.status ===
      401
    ) {
      hapusAuth();

      if (
        auth &&
        redirectUnauthorized
      ) {
        arahkanKeLogin();
      }
    }

    if (!response.ok) {
      let payload =
        null;

      const contentType =
        response.headers.get(
          "content-type",
        ) ?? "";

      if (
        contentType.includes(
          "application/json",
        )
      ) {
        try {
          payload =
            await response.json();
        } catch {
          payload =
            null;
        }
      }

      const pesan =
        payload?.message ??
        payload?.error?.message ??
        payload?.error ??
        payload?.data?.message ??
        `Request gagal (${response.status}).`;

      const error =
        new Error(
          typeof pesan ===
            "string"
            ? pesan
            : `Request gagal (${response.status}).`,
        );

      error.status =
        response.status;

      error.payload =
        payload;

      throw error;
    }

    return {
      response,
      blob:
        await response.blob(),
    };
  }

  window.PosgaApi = {
    request,
    requestBlob,
    bacaAuth,
    simpanAuth,
    hapusAuth,
    tokenKadaluarsa,
    arahkanKeLogin,
    STORAGE_KEY,
  };
})();
