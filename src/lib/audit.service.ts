import {
  desc,
  eq,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  auditLog,
} from "../db/schema.js";

export interface CatatAuditInput {
  userId?:
    number | null;

  aksi: string;

  entitas: string;

  entitasId?:
    string | number | null;

  dataSebelum?:
    unknown;

  dataSesudah?:
    unknown;

  ipAddress?:
    string | null;

  method?:
    string | null;

  path?:
    string | null;
}

// ============================================================
// JSON AMAN
// ============================================================

function keJson(
  value: unknown,
) {
  if (
    value === undefined
  ) {
    return null;
  }

  return JSON.stringify(
    value,
  );
}

// ============================================================
// CATAT AUDIT
// ============================================================

export async function catatAudit(
  input: CatatAuditInput,
) {
  const hasil =
    await db
      .insert(
        auditLog,
      )
      .values({
        userId:
          input.userId ??
          null,

        aksi:
          input.aksi,

        entitas:
          input.entitas,

        entitasId:
          input.entitasId ===
            undefined ||
          input.entitasId ===
            null
            ? null
            : String(
                input.entitasId,
              ),

        dataSebelum:
          keJson(
            input.dataSebelum,
          ),

        dataSesudah:
          keJson(
            input.dataSesudah,
          ),

        ipAddress:
          input.ipAddress ??
          null,

        method:
          input.method ??
          null,

        path:
          input.path ??
          null,
      })
      .returning();

  return (
    hasil[0] ??
    null
  );
}

// ============================================================
// LIST AUDIT TERBARU
// ============================================================

export async function ambilAuditTerbaru(
  limit = 100,
) {
  return db
    .select()
    .from(
      auditLog,
    )
    .orderBy(
      desc(
        auditLog.id,
      ),
    )
    .limit(
      limit,
    );
}

// ============================================================
// AUDIT PER USER
// ============================================================

export async function ambilAuditByUser(
  userId: number,
) {
  return db
    .select()
    .from(
      auditLog,
    )
    .where(
      eq(
        auditLog.userId,
        userId,
      ),
    )
    .orderBy(
      desc(
        auditLog.id,
      ),
    );
}