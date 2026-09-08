import type { Request, RequestHandler, Response } from "express";

import { forbidden, unauthorized } from "../lib/api-error.js";

import { ambilSessionAktif } from "../lib/auth.service.js";

// ============================================================
// ROLE
// ============================================================

export type AuthRole = "admin" | "petugas";

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
  return process.env.POSGA_TEST_BYPASS_AUTH === "1";
}

// ============================================================
// BEARER TOKEN
// ============================================================

export function ambilBearerToken(req: Request) {
  const authorization = req.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match?.[1]) {
    return null;
  }

  return match[1].trim();
}

// ============================================================
// AUTH REQUIRED
// ============================================================

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    // Bypass hanya untuk regression test lama.
    if (sedangBypassAuthTest()) {
      next();

      return;
    }

    const token = ambilBearerToken(req);

    if (!token) {
      throw unauthorized("Token autentikasi tidak ditemukan.");
    }

    const session = await ambilSessionAktif(token);

    if (!session) {
      throw unauthorized("Token autentikasi tidak valid atau sudah berakhir.");
    }

    const authUser: AuthUser = {
      sessionId: session.sessionId,

      userId: session.userId,

      username: session.username,

      nama: session.nama,

      role: session.role,

      expiresAt: session.expiresAt,
    };

    res.locals.authUser = authUser;

    res.locals.authToken = token;

    next();
  } catch (error) {
    next(error);
  }
};

// ============================================================
// AMBIL AUTH USER
// ============================================================

export function getAuthUser(res: Response) {
  const authUser = res.locals.authUser as AuthUser | undefined;

  if (!authUser) {
    throw unauthorized("Autentikasi diperlukan.");
  }

  return authUser;
}

// ============================================================
// REQUIRE ROLE
// ============================================================

export function requireRole(...roles: AuthRole[]): RequestHandler {
  return (_req, res, next) => {
    try {
      // Regression test lama boleh melewati role check.
      // Production tidak boleh memiliki env flag ini.
      if (sedangBypassAuthTest()) {
        next();

        return;
      }

      const authUser = getAuthUser(res);

      if (!roles.includes(authUser.role)) {
        throw forbidden("Anda tidak memiliki izin untuk melakukan aksi ini.");
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

export const requireAdmin = requireRole("admin");

// ============================================================
// ADMIN ATAU PETUGAS
// ============================================================

export const requirePetugas = requireRole("admin", "petugas");
