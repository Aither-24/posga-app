import type { NextFunction, Request, RequestHandler, Response } from "express";

import { ZodError, type ZodType } from "zod";

import { badRequest } from "../lib/api-error.js";

// ============================================================
// HELPER ERROR ZOD
// ============================================================

function pesanZod(error: ZodError) {
  const issue = error.issues[0];

  if (!issue) {
    return "Data tidak valid.";
  }

  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";

  return `${path}${issue.message}`;
}

// ============================================================
// BODY
// ============================================================

export function validateBody(schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(badRequest(pesanZod(error)));

        return;
      }

      next(error);
    }
  };
}

// ============================================================
// PARAMS
// ============================================================

export function validateParams(schema: ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      /*
       * Express 5 dapat memberi typing params yang lebih luas.
       * Karena itu hasil validasi tidak perlu dipaksa kembali
       * ke req.params.
       *
       * Hasil yang telah diparse disimpan di res.locals.
       */
      res.locals.validatedParams = schema.parse(req.params);

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(badRequest(pesanZod(error)));

        return;
      }

      next(error);
    }
  };
}

// ============================================================
// QUERY STRING
// ============================================================

export function validateQuery(schema: ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      /*
       * req.query pada Express 5 sebaiknya tidak dioverwrite.
       * Hasil parsing disimpan di res.locals.
       */
      res.locals.validatedQuery = schema.parse(req.query);

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(badRequest(pesanZod(error)));

        return;
      }

      next(error);
    }
  };
}
