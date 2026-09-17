import assert from "node:assert/strict";

import request from "supertest";

import {
  eq,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  auditLog,
  authSession,
  user,
} from "../db/schema.js";

import {
  tambahUser,
} from "../lib/user.service.js";

const OLD_NODE_ENV =
  process.env.NODE_ENV;

process.env.NODE_ENV =
  "test";

const {
  app,
} = await import(
  "../app.js"
);

const username =
  `cookie_test_${Date.now()}`;

const password =
  "CookieTest123!";

let userId:
  number |
  null =
  null;

try {
  const userData =
    await tambahUser({
      username,

      password,

      nama:
        "Cookie Auth Test",

      role:
        "petugas",

      aktif:
        true,
    });

  userId =
    userData.id;

  // ==========================================================
  // LOGIN VIA COOKIE
  // ==========================================================

  const agent =
    request.agent(
      app,
    );

  const loginResponse =
    await agent
      .post(
        "/api/auth/login",
      )
      .send({
        username,
        password,
      })
      .expect(200);

  const setCookie =
    loginResponse.headers[
      "set-cookie"
    ];

  assert.ok(
    Array.isArray(
      setCookie,
    ),
    "Login harus menghasilkan Set-Cookie.",
  );

  const cookieHeader =
    setCookie.join(
      "; ",
    );

  assert.match(
    cookieHeader,
    /posga_session=/i,
  );

  assert.match(
    cookieHeader,
    /HttpOnly/i,
  );

  assert.match(
    cookieHeader,
    /SameSite=Strict/i,
  );

  // ==========================================================
  // BEARER TOKEN TETAP KOMPATIBEL
  //
  // Browser memakai cookie, tetapi API client dan regression
  // lama masih boleh memakai Authorization: Bearer.
  // ==========================================================

  const bearerToken =
    loginResponse.body
      .data.token;

  assert.equal(
    typeof bearerToken,
    "string",
    "Environment test harus tetap menerima bearer token.",
  );

  const bearerMe =
    await request(app)
      .get(
        "/api/auth/me",
      )
      .set(
        "Authorization",
        `Bearer ${bearerToken}`,
      )
      .expect(200);

  assert.equal(
    bearerMe.body
      .data
      .username,
    username,
  );

  // ==========================================================
  // COOKIE SAJA HARUS CUKUP
  // ==========================================================

  const me =
    await agent
      .get(
        "/api/auth/me",
      )
      .expect(200);

  assert.equal(
    me.body
      .data
      .username,
    username,
  );

  // ==========================================================
  // TANPA COOKIE TETAP DITOLAK
  // ==========================================================

  await request(app)
    .get(
      "/api/auth/me",
    )
    .expect(401);

  // ==========================================================
  // LOGOUT VIA COOKIE
  // ==========================================================

  const logoutResponse =
    await agent
      .post(
        "/api/auth/logout",
      )
      .expect(200);

  const logoutCookie =
    logoutResponse
      .headers[
        "set-cookie"
      ];

  assert.ok(
    Array.isArray(
      logoutCookie,
    ),
  );

  assert.match(
    logoutCookie.join(
      "; ",
    ),
    /Max-Age=0/i,
  );

  await agent
    .get(
      "/api/auth/me",
    )
    .expect(401);

  // ==========================================================
  // PRODUCTION:
  // TOKEN TIDAK BOLEH ADA DI BODY + COOKIE SECURE
  // ==========================================================

  process.env.NODE_ENV =
    "production";

  const productionLogin =
    await request(app)
      .post(
        "/api/auth/login",
      )
      .send({
        username,
        password,
      })
      .expect(200);

  assert.equal(
    productionLogin
      .body
      .data
      .token,
    undefined,
    "Production login tidak boleh mengirim token mentah.",
  );

  const productionCookie =
    productionLogin
      .headers[
        "set-cookie"
      ];

  assert.ok(
    Array.isArray(
      productionCookie,
    ),
  );

  const productionHeader =
    productionCookie.join(
      "; ",
    );

  assert.match(
    productionHeader,
    /HttpOnly/i,
  );

  assert.match(
    productionHeader,
    /SameSite=Strict/i,
  );

  assert.match(
    productionHeader,
    /Secure/i,
  );

  console.log(
    "✅ test-cookie-auth: seluruh pengujian lulus",
  );
} finally {
  if (
    OLD_NODE_ENV ===
    undefined
  ) {
    delete process.env
      .NODE_ENV;
  } else {
    process.env.NODE_ENV =
      OLD_NODE_ENV;
  }

  if (
    userId !==
    null
  ) {
    await db
      .delete(
        auditLog,
      )
      .where(
        eq(
          auditLog.userId,
          userId,
        ),
      );

    await db
      .delete(
        authSession,
      )
      .where(
        eq(
          authSession.userId,
          userId,
        ),
      );

    await db
      .delete(
        user,
      )
      .where(
        eq(
          user.id,
          userId,
        ),
      );
  }
}

