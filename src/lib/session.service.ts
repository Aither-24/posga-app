import {
  and,
  eq,
  isNull,
  sql,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  authSession,
} from "../db/schema.js";

// ============================================================
// REVOKE SEMUA SESSION AKTIF MILIK USER
// ============================================================

export async function revokeAllSessionsForUser(
  userId: number,
) {
  const rows =
    await db
      .update(
        authSession,
      )
      .set({
        revokedAt:
          sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(
            authSession.userId,
            userId,
          ),

          isNull(
            authSession.revokedAt,
          ),
        ),
      )
      .returning({
        id:
          authSession.id,
      });

  return {
    userId,

    jumlahDirevoke:
      rows.length,
  };
}