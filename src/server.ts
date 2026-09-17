import {
  app,
} from "./app.js";

// ============================================================
// PRODUCTION SAFETY
// ============================================================

const IS_PRODUCTION =
  process.env.NODE_ENV ===
  "production";

if (
  IS_PRODUCTION &&
  process.env
    .POSGA_TEST_BYPASS_AUTH ===
    "1"
) {
  throw new Error(
    "POSGA_TEST_BYPASS_AUTH tidak boleh aktif pada production.",
  );
}

// ============================================================
// CONFIG
// ============================================================

const rawPort =
  process.env.PORT ??
  "3000";

const PORT =
  Number(
    rawPort,
  );

if (
  !Number.isInteger(
    PORT,
  ) ||
  PORT < 1 ||
  PORT > 65535
) {
  throw new Error(
    `PORT tidak valid: ${rawPort}`,
  );
}

// ============================================================
// SERVER
// ============================================================

app.listen(
  PORT,

  () => {
    console.log(
      "========================================",
    );

    console.log(
      "POSGA API AKTIF",
    );

    console.log(
      `http://localhost:${PORT}`,
    );

    console.log(
      `Environment: ${
        process.env.NODE_ENV ??
        "development"
      }`,
    );

    console.log(
      "========================================",
    );
  },
);
