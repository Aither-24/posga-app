import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, isNull, sql } from "drizzle-orm";

import { db } from "../db/index.js";

import { authSession, user } from "../db/schema.js";

import { unauthorized } from "./api-error.js";

import { catatAudit } from "./audit.service.js";

import { ambilUserByUsername } from "./user.service.js";

import { verifyPassword } from "./password.service.js";

// ============================================================
// CONFIG
// ============================================================

const SESSION_DAYS = 7;

// ============================================================
// TOKEN
// ============================================================

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function buatToken() {
  return randomBytes(32).toString("base64url");
}

function buatTanggalKadaluarsa() {
  const tanggal = new Date();

  tanggal.setUTCDate(tanggal.getUTCDate() + SESSION_DAYS);

  return tanggal.toISOString();
}

// ============================================================
// LOGIN INPUT
// ============================================================

export interface LoginInput {
  username: string;

  password: string;

  ipAddress?: string | null;

  userAgent?: string | null;

  method?: string | null;

  path?: string | null;
}

// ============================================================
// LOGIN
// ============================================================

export async function login(input: LoginInput) {
  const dataUser = await ambilUserByUsername(input.username);

  if (!dataUser || !dataUser.aktif) {
    throw unauthorized("Username atau password salah.");
  }

  const cocok = await verifyPassword(input.password, dataUser.passwordHash);

  if (!cocok) {
    throw unauthorized("Username atau password salah.");
  }

  const token = buatToken();

  const tokenHash = hashToken(token);

  const expiresAt = buatTanggalKadaluarsa();

  const sessionRows = await db
    .insert(authSession)
    .values({
      userId: dataUser.id,

      tokenHash,

      expiresAt,

      ipAddress: input.ipAddress ?? null,

      userAgent: input.userAgent ?? null,
    })
    .returning({
      id: authSession.id,
    });

  const sessionId = sessionRows[0]?.id;

  if (!sessionId) {
    throw new Error("Gagal membuat sesi autentikasi.");
  }

  await catatAudit({
    userId: dataUser.id,

    aksi: "LOGIN",

    entitas: "auth_session",

    entitasId: sessionId,

    ipAddress: input.ipAddress ?? null,

    method: input.method ?? null,

    path: input.path ?? null,
  });

  return {
    token,

    expiresAt,

    user: {
      id: dataUser.id,

      username: dataUser.username,

      nama: dataUser.nama,

      role: dataUser.role,

      aktif: dataUser.aktif,
    },
  };
}

// ============================================================
// SESSION AKTIF
// ============================================================

export async function ambilSessionAktif(token: string) {
  const tokenHash = hashToken(token);

  const sekarang = new Date().toISOString();

  const rows = await db
    .select({
      sessionId: authSession.id,

      expiresAt: authSession.expiresAt,

      userId: user.id,

      username: user.username,

      nama: user.nama,

      role: user.role,

      aktif: user.aktif,
    })
    .from(authSession)
    .innerJoin(user, eq(user.id, authSession.userId))
    .where(
      and(
        eq(authSession.tokenHash, tokenHash),

        isNull(authSession.revokedAt),

        gt(authSession.expiresAt, sekarang),
      ),
    )
    .limit(1);

  const data = rows[0];

  if (!data || !data.aktif) {
    return null;
  }

  return data;
}

// ============================================================
// LOGOUT CONTEXT
// ============================================================

export interface LogoutContext {
  ipAddress?: string | null;

  method?: string | null;

  path?: string | null;
}

// ============================================================
// LOGOUT
// ============================================================

export async function logout(token: string, context?: LogoutContext) {
  const session = await ambilSessionAktif(token);

  if (!session) {
    throw unauthorized("Sesi autentikasi tidak valid atau sudah berakhir.");
  }

  await db
    .update(authSession)
    .set({
      revokedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(authSession.id, session.sessionId));

  await catatAudit({
    userId: session.userId,

    aksi: "LOGOUT",

    entitas: "auth_session",

    entitasId: session.sessionId,

    ipAddress: context?.ipAddress ?? null,

    method: context?.method ?? null,

    path: context?.path ?? null,
  });

  return {
    berhasil: true,
  };
}
