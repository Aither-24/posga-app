import type {
  Request,
  Response,
} from "express";

import type {
  AuthUser,
} from "../middleware/auth.js";

// ============================================================
// AUDIT REQUEST CONTEXT
//
// Pada request normal:
// - userId berasal dari user yang login.
//
// Pada regression test lama dengan auth bypass:
// - authUser tidak tersedia.
// - userId menjadi null.
// ============================================================

export function ambilAuditContext(
  req: Request,
  res: Response,
) {
  const authUser =
    res.locals
      .authUser as
      | AuthUser
      | undefined;

  return {
    userId:
      authUser?.userId ??
      null,

    ipAddress:
      req.ip ??
      null,

    method:
      req.method,

    path:
      req.originalUrl,
  };
}