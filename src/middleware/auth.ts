import type {
  Request,
  RequestHandler,
  Response,
} from "express";

import {
  forbidden,
  unauthorized,
} from "../lib/api-error.js";

import {
  ambilSessionAktif,
} from "../lib/auth.service.js";

// ============================================================
// ROLE
// ============================================================

export type AuthRole =
  | "admin"
  | "petugas";

// ============================================================
// AUTH COOKIE
// ============================================================

export const AUTH_COOKIE_NAME =
  "posga_session";

// ============================================================
// AUTH USER
// ============================================================

export interface AuthUser {
  sessionId: number;

  userId: number;

  username: string;

  nama: string;

  role: AuthRole;

  expiresAt: string;
}

// ============================================================
// TEST BYPASS
// ============================================================

function sedangBypassAuthTest() {
  return (
    process.env
      .POSGA_TEST_BYPASS_AUTH ===
    "1"
  );
}

// ============================================================
// BEARER TOKEN
//
// Tetap didukung untuk regression test dan API client.
// ============================================================

export function ambilBearerToken(
  req: Request,
) {
  const authorization =
    req.get(
      "authorization",
    );

  if (!authorization) {
    return null;
  }

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i,
    );

  if (!match?.[1]) {
    return null;
  }

  return match[1]
    .trim();
}

// ============================================================
// COOKIE TOKEN
// ============================================================

export function ambilCookieToken(
  req: Request,
) {
  const rawCookie =
    req.get(
      "cookie",
    );

  if (!rawCookie) {
    return null;
  }

  const cookies =
    rawCookie.split(
      ";",
    );

  for (
    const cookie of cookies
  ) {
    const trimmed =
      cookie.trim();

    const separator =
      trimmed.indexOf(
        "=",
      );

    if (
      separator <=
      0
    ) {
      continue;
    }

    const nama =
      trimmed.slice(
        0,
        separator,
      );

    if (
      nama !==
      AUTH_COOKIE_NAME
    ) {
      continue;
    }

    const rawValue =
      trimmed.slice(
        separator +
          1,
      );

    if (!rawValue) {
      return null;
    }

    try {
      return decodeURIComponent(
        rawValue,
      );
    } catch {
      return rawValue;
    }
  }

  return null;
}

// ============================================================
// TOKEN AKTIF
//
// Bearer didahulukan agar API client/test lama tetap kompatibel.
// ============================================================

export function ambilAuthToken(
  req: Request,
) {
  return (
    ambilBearerToken(
      req,
    ) ??
    ambilCookieToken(
      req,
    )
  );
}

// ============================================================
// AUTH REQUIRED
// ============================================================

export const requireAuth:
  RequestHandler =
  async (
    req,
    res,
    next,
  ) => {
    try {
      if (
        sedangBypassAuthTest()
      ) {
        next();

        return;
      }

      const token =
        ambilAuthToken(
          req,
        );

      if (!token) {
        throw unauthorized(
          "Token autentikasi tidak ditemukan.",
        );
      }

      const session =
        await ambilSessionAktif(
          token,
        );

      if (!session) {
        throw unauthorized(
          "Token autentikasi tidak valid atau sudah berakhir.",
        );
      }

      const authUser:
        AuthUser =
      {
        sessionId:
          session.sessionId,

        userId:
          session.userId,

        username:
          session.username,

        nama:
          session.nama,

        role:
          session.role,

        expiresAt:
          session.expiresAt,
      };

      res.locals.authUser =
        authUser;

      res.locals.authToken =
        token;

      next();
    } catch (error) {
      next(error);
    }
  };

// ============================================================
// GET AUTH USER
// ============================================================

export function getAuthUser(
  res: Response,
) {
  const authUser =
    res.locals
      .authUser as
      | AuthUser
      | undefined;

  if (!authUser) {
    throw unauthorized(
      "Autentikasi diperlukan.",
    );
  }

  return authUser;
}

// ============================================================
// REQUIRE ROLE
// ============================================================

export function requireRole(
  ...roles: AuthRole[]
): RequestHandler {
  return (
    _req,
    res,
    next,
  ) => {
    try {
      if (
        sedangBypassAuthTest()
      ) {
        next();

        return;
      }

      const authUser =
        getAuthUser(
          res,
        );

      if (
        !roles.includes(
          authUser.role,
        )
      ) {
        throw forbidden(
          "Anda tidak memiliki izin untuk melakukan aksi ini.",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// ============================================================
// ADMIN ONLY
// ============================================================

export const requireAdmin =
  requireRole(
    "admin",
  );

// ============================================================
// ADMIN ATAU PETUGAS
// ============================================================

export const requirePetugas =
  requireRole(
    "admin",
    "petugas",
  );
