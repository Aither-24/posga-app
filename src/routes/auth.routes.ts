import {
  Router,
} from "express";

import {
  login,
  logout,
} from "../lib/auth.service.js";

import {
  ApiError,
} from "../lib/api-error.js";

import {
  catatAudit,
} from "../lib/audit.service.js";

import {
  ambilSemuaUser,
  tambahUser,
  updateUser,
} from "../lib/user.service.js";

import {
  AUTH_COOKIE_NAME,
  requireAdmin,
  requireAuth,
  type AuthUser,
} from "../middleware/auth.js";

import {
  batasiLogin,
  catatLoginGagal,
  resetLoginPengguna,
} from "../middleware/login-rate-limit.js";

import {
  validateBody,
  validateParams,
} from "../middleware/validate.js";

import {
  loginSchema,
  tambahUserSchema,
  updateUserSchema,
  userIdParamsSchema,
} from "../validation/auth.schemas.js";

// ============================================================
// ROUTER
// ============================================================

export const authRouter =
  Router();

// ============================================================
// COOKIE CONFIG
// ============================================================

const SESSION_MAX_AGE_SECONDS =
  7 *
  24 *
  60 *
  60;

function buatSessionCookie(
  token: string,
) {
  const attributes = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,

    "HttpOnly",

    "Path=/",

    "SameSite=Strict",

    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    attributes.push(
      "Secure",
    );
  }

  return attributes.join(
    "; ",
  );
}

function buatCookieLogout() {
  const attributes = [
    `${AUTH_COOKIE_NAME}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Strict",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    attributes.push(
      "Secure",
    );
  }

  return attributes.join(
    "; ",
  );
}

// ============================================================
// LOGIN
// ============================================================

authRouter.post(
  "/auth/login",

  validateBody(
    loginSchema,
  ),

  batasiLogin,

  async (
    req,
    res,
    next,
  ) => {
    try {
      const data =
        await login({
          username:
            req.body.username,

          password:
            req.body.password,

          ipAddress:
            req.ip ??
            null,

          userAgent:
            req.get(
              "user-agent",
            ) ??
            null,

          method:
            req.method,

          path:
            req.originalUrl,
        });

      resetLoginPengguna(
        req,
      );

      res.setHeader(
        "Set-Cookie",
        buatSessionCookie(
          data.token,
        ),
      );

      // Browser production tidak menerima token mentah.
      //
      // Token tetap tersedia di development/test agar
      // regression test/API client lama tetap kompatibel.
      const dataUntukClient =
        process.env.NODE_ENV ===
        "production"
          ? {
              expiresAt:
                data.expiresAt,

              user:
                data.user,
            }
          : data;

      res.setHeader(
        "Cache-Control",
        "no-store",
      );

      res.json({
        success: true,

        data:
          dataUntukClient,
      });
    } catch (error) {
      if (
        error instanceof
          ApiError &&
        error.statusCode ===
          401
      ) {
        catatLoginGagal(
          req,
        );
      }

      next(error);
    }
  },
);

// ============================================================
// ME
// ============================================================

authRouter.get(
  "/auth/me",

  requireAuth,

  (
    _req,
    res,
  ) => {
    const authUser =
      res.locals
        .authUser as
        AuthUser;

    res.setHeader(
      "Cache-Control",
      "no-store",
    );

    res.json({
      success: true,

      data: {
        id:
          authUser.userId,

        username:
          authUser.username,

        nama:
          authUser.nama,

        role:
          authUser.role,

        expiresAt:
          authUser.expiresAt,
      },
    });
  },
);

// ============================================================
// LOGOUT
// ============================================================

authRouter.post(
  "/auth/logout",

  requireAuth,

  async (
    req,
    res,
    next,
  ) => {
    try {
      const token =
        res.locals
          .authToken as
          | string
          | undefined;

      if (!token) {
        throw new Error(
          "Token autentikasi tidak ditemukan.",
        );
      }

      const data =
        await logout(
          token,
          {
            ipAddress:
              req.ip ??
              null,

            method:
              req.method,

            path:
              req.originalUrl,
          },
        );

      res.setHeader(
        "Set-Cookie",
        buatCookieLogout(),
      );

      res.setHeader(
        "Cache-Control",
        "no-store",
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// LIST USER - ADMIN
// ============================================================

authRouter.get(
  "/users",

  requireAuth,

  requireAdmin,

  async (
    _req,
    res,
    next,
  ) => {
    try {
      const data =
        await ambilSemuaUser();

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// CREATE USER - ADMIN
// ============================================================

authRouter.post(
  "/users",

  requireAuth,

  requireAdmin,

  validateBody(
    tambahUserSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const authUser =
        res.locals
          .authUser as
          AuthUser;

      const data =
        await tambahUser(
          req.body,
        );

      await catatAudit({
        userId:
          authUser.userId,

        aksi:
          "CREATE",

        entitas:
          "user",

        entitasId:
          data.id,

        dataSesudah:
          data,

        ipAddress:
          req.ip ??
          null,

        method:
          req.method,

        path:
          req.originalUrl,
      });

      res
        .status(201)
        .json({
          success: true,
          data,
        });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================
// UPDATE USER - ADMIN
// ============================================================

authRouter.put(
  "/users/:id",

  requireAuth,

  requireAdmin,

  validateParams(
    userIdParamsSchema,
  ),

  validateBody(
    updateUserSchema,
  ),

  async (
    req,
    res,
    next,
  ) => {
    try {
      const authUser =
        res.locals
          .authUser as
          AuthUser;

      const id =
        Number(
          req.params.id,
        );

      const data =
        await updateUser(
          id,
          req.body,
        );

      await catatAudit({
        userId:
          authUser.userId,

        aksi:
          "UPDATE",

        entitas:
          "user",

        entitasId:
          id,

        dataSesudah:
          data,

        ipAddress:
          req.ip ??
          null,

        method:
          req.method,

        path:
          req.originalUrl,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);
