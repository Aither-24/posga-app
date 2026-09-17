import type {
  Request,
  RequestHandler,
} from "express";

import {
  ApiError,
} from "../lib/api-error.js";

// ============================================================
// CONFIG
//
// Per username + IP:
// 5 login gagal / 15 menit.
//
// Per IP:
// 20 login gagal / 15 menit.
//
// Rate limiter ini sesuai arsitektur POSGA yang saat ini
// berjalan sebagai satu instance aplikasi.
// ============================================================

const WINDOW_MS =
  15 * 60 * 1000;

const MAX_ACCOUNT_FAILURES =
  5;

const MAX_IP_FAILURES =
  20;

// ============================================================
// STATE
// ============================================================

interface AttemptBucket {
  count: number;

  windowStartedAt: number;
}

const accountBuckets =
  new Map<
    string,
    AttemptBucket
  >();

const ipBuckets =
  new Map<
    string,
    AttemptBucket
  >();

let lastCleanup =
  0;

// ============================================================
// KEY
// ============================================================

function normalisasiIp(
  req: Request,
) {
  return (
    req.ip ??
    "unknown"
  )
    .trim()
    .toLowerCase();
}

function normalisasiUsername(
  req: Request,
) {
  const username =
    typeof req.body
      ?.username ===
    "string"
      ? req.body.username
          .trim()
          .toLowerCase()
      : "";

  return (
    username ||
    "<kosong>"
  );
}

function accountKey(
  req: Request,
) {
  return (
    `${normalisasiIp(req)}|` +
    normalisasiUsername(req)
  );
}

// ============================================================
// CLEANUP
// ============================================================

function bersihkanKadaluarsa(
  now: number,
) {
  if (
    now -
      lastCleanup <
    WINDOW_MS
  ) {
    return;
  }

  lastCleanup =
    now;

  for (
    const [
      key,
      bucket,
    ] of accountBuckets
  ) {
    if (
      now -
        bucket.windowStartedAt >=
      WINDOW_MS
    ) {
      accountBuckets.delete(
        key,
      );
    }
  }

  for (
    const [
      key,
      bucket,
    ] of ipBuckets
  ) {
    if (
      now -
        bucket.windowStartedAt >=
      WINDOW_MS
    ) {
      ipBuckets.delete(
        key,
      );
    }
  }
}

// ============================================================
// ACTIVE BUCKET
// ============================================================

function ambilBucketAktif(
  map: Map<
    string,
    AttemptBucket
  >,
  key: string,
  now: number,
) {
  const bucket =
    map.get(
      key,
    );

  if (!bucket) {
    return null;
  }

  if (
    now -
      bucket.windowStartedAt >=
    WINDOW_MS
  ) {
    map.delete(
      key,
    );

    return null;
  }

  return bucket;
}

// ============================================================
// RETRY AFTER
// ============================================================

function retryAfterSeconds(
  bucket: AttemptBucket,
  now: number,
) {
  return Math.max(
    1,

    Math.ceil(
      (
        bucket.windowStartedAt +
        WINDOW_MS -
        now
      ) /
        1000,
    ),
  );
}

// ============================================================
// CEK LIMIT
// ============================================================

function cekLimit(
  map: Map<
    string,
    AttemptBucket
  >,
  key: string,
  maximum: number,
  now: number,
) {
  const bucket =
    ambilBucketAktif(
      map,
      key,
      now,
    );

  if (
    !bucket ||
    bucket.count <
      maximum
  ) {
    return null;
  }

  return retryAfterSeconds(
    bucket,
    now,
  );
}

// ============================================================
// MIDDLEWARE
// ============================================================

export const batasiLogin:
  RequestHandler =
  (
    req,
    res,
    next,
  ) => {
    const now =
      Date.now();

    bersihkanKadaluarsa(
      now,
    );

    const accountRetry =
      cekLimit(
        accountBuckets,
        accountKey(
          req,
        ),
        MAX_ACCOUNT_FAILURES,
        now,
      );

    const ipRetry =
      cekLimit(
        ipBuckets,
        normalisasiIp(
          req,
        ),
        MAX_IP_FAILURES,
        now,
      );

    const retryAfter =
      Math.max(
        accountRetry ??
          0,

        ipRetry ??
          0,
      );

    if (
      retryAfter >
      0
    ) {
      res.setHeader(
        "Retry-After",
        String(
          retryAfter,
        ),
      );

      next(
        new ApiError(
          429,
          "Terlalu banyak percobaan login gagal. Coba lagi beberapa menit.",
        ),
      );

      return;
    }

    next();
  };

// ============================================================
// RECORD FAILURE
// ============================================================

function tambahKegagalan(
  map: Map<
    string,
    AttemptBucket
  >,
  key: string,
  now: number,
) {
  const bucket =
    ambilBucketAktif(
      map,
      key,
      now,
    );

  if (bucket) {
    bucket.count +=
      1;

    return;
  }

  map.set(
    key,
    {
      count: 1,

      windowStartedAt:
        now,
    },
  );
}

export function catatLoginGagal(
  req: Request,
) {
  const now =
    Date.now();

  tambahKegagalan(
    accountBuckets,
    accountKey(
      req,
    ),
    now,
  );

  tambahKegagalan(
    ipBuckets,
    normalisasiIp(
      req,
    ),
    now,
  );
}

// ============================================================
// SUCCESS
//
// Login berhasil mereset kegagalan khusus username tersebut.
// Bucket IP tidak direset agar satu login valid tidak dapat
// dipakai untuk menghapus serangan brute-force dari IP yang sama.
// ============================================================

export function resetLoginPengguna(
  req: Request,
) {
  accountBuckets.delete(
    accountKey(
      req,
    ),
  );
}

// ============================================================
// TEST ONLY
// ============================================================

export function resetLoginRateLimitUntukTest() {
  accountBuckets.clear();

  ipBuckets.clear();

  lastCleanup =
    0;
}
