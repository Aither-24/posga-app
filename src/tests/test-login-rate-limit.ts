import assert from "node:assert/strict";

import request from "supertest";

import {
  app,
} from "../app.js";

import {
  resetLoginRateLimitUntukTest,
} from "../middleware/login-rate-limit.js";

// ============================================================
// TEST 1:
// 5 PASSWORD SALAH MASIH 401.
// REQUEST KE-6 MENJADI 429.
// ============================================================

resetLoginRateLimitUntukTest();

const username =
  `rate_limit_${Date.now()}`;

for (
  let i = 1;
  i <= 5;
  i += 1
) {
  const response =
    await request(app)
      .post(
        "/api/auth/login",
      )
      .send({
        username,

        password:
          "password-salah",
      });

  assert.equal(
    response.status,
    401,
    `Percobaan gagal ke-${i} seharusnya 401.`,
  );
}

const blocked =
  await request(app)
    .post(
      "/api/auth/login",
    )
    .send({
      username,

      password:
        "password-salah",
    });

assert.equal(
  blocked.status,
  429,
  "Percobaan ke-6 seharusnya diblokir dengan 429.",
);

assert.equal(
  blocked.body
    .success,
  false,
);

assert.match(
  blocked.body
    .error
    .message,
  /terlalu banyak percobaan login/i,
);

assert.ok(
  blocked.headers[
    "retry-after"
  ],
  "Response 429 harus memiliki Retry-After.",
);

// ============================================================
// TEST 2:
// USERNAME LAIN DARI IP YANG SAMA BELUM TERKUNCI,
// KARENA LIMIT IP GLOBAL LEBIH BESAR.
// ============================================================

const usernameLain =
  `rate_limit_lain_${Date.now()}`;

const userLain =
  await request(app)
    .post(
      "/api/auth/login",
    )
    .send({
      username:
        usernameLain,

      password:
        "password-salah",
    });

assert.equal(
  userLain.status,
  401,
  "Username lain belum boleh terkena account lock.",
);

// ============================================================
// TEST 3:
// LIMIT GLOBAL IP = 20 KEGAGALAN.
// ============================================================

resetLoginRateLimitUntukTest();

for (
  let i = 1;
  i <= 20;
  i += 1
) {
  const response =
    await request(app)
      .post(
        "/api/auth/login",
      )
      .send({
        username:
          `ip_test_${i}_${Date.now()}`,

        password:
          "password-salah",
      });

  assert.equal(
    response.status,
    401,
    `Kegagalan IP ke-${i} seharusnya masih 401.`,
  );
}

const ipBlocked =
  await request(app)
    .post(
      "/api/auth/login",
    )
    .send({
      username:
        `ip_blocked_${Date.now()}`,

      password:
        "password-salah",
    });

assert.equal(
  ipBlocked.status,
  429,
  "Percobaan ke-21 dari IP yang sama harus 429.",
);

// ============================================================
// CLEANUP STATE
// ============================================================

resetLoginRateLimitUntukTest();

console.log(
  "✅ test-login-rate-limit: seluruh pengujian lulus",
);
