import {
  asc,
  eq,
  sql,
} from "drizzle-orm";

import {
  db,
} from "../db/index.js";

import {
  user,
} from "../db/schema.js";

import {
  conflict,
  notFound,
} from "./api-error.js";

import {
  hashPassword,
} from "./password.service.js";

import {
  revokeAllSessionsForUser,
} from "./session.service.js";

export type UserRole =
  | "admin"
  | "petugas";

export interface TambahUserInput {
  username: string;

  password: string;

  nama: string;

  role?:
    UserRole;

  aktif?:
    boolean;
}

export interface UpdateUserInput {
  nama?: string;

  role?:
    UserRole;

  aktif?:
    boolean;

  password?:
    string;
}

// ============================================================
// NORMALISASI USERNAME
// ============================================================

export function normalisasiUsername(
  username: string,
) {
  return username
    .trim()
    .toLowerCase();
}

// ============================================================
// GET BY ID
// ============================================================

export async function ambilUserById(
  id: number,
) {
  const rows =
    await db
      .select()
      .from(
        user,
      )
      .where(
        eq(
          user.id,
          id,
        ),
      )
      .limit(1);

  return (
    rows[0] ??
    null
  );
}

// ============================================================
// GET BY USERNAME
// ============================================================

export async function ambilUserByUsername(
  username: string,
) {
  const usernameNormal =
    normalisasiUsername(
      username,
    );

  const rows =
    await db
      .select()
      .from(
        user,
      )
      .where(
        eq(
          user.username,
          usernameNormal,
        ),
      )
      .limit(1);

  return (
    rows[0] ??
    null
  );
}

// ============================================================
// LIST
// ============================================================

export async function ambilSemuaUser() {
  const rows =
    await db
      .select({
        id:
          user.id,

        username:
          user.username,

        nama:
          user.nama,

        role:
          user.role,

        aktif:
          user.aktif,

        createdAt:
          user.createdAt,

        updatedAt:
          user.updatedAt,
      })
      .from(
        user,
      )
      .orderBy(
        asc(
          user.nama,
        ),
      );

  return rows;
}

// ============================================================
// CREATE
// ============================================================

export async function tambahUser(
  input: TambahUserInput,
) {
  const username =
    normalisasiUsername(
      input.username,
    );

  if (
    !username
  ) {
    throw new Error(
      "Username wajib diisi.",
    );
  }

  const existing =
    await ambilUserByUsername(
      username,
    );

  if (existing) {
    throw conflict(
      "Username sudah digunakan.",
    );
  }

  const passwordHash =
    await hashPassword(
      input.password,
    );

  const hasil =
    await db
      .insert(
        user,
      )
      .values({
        username,

        passwordHash,

        nama:
          input.nama.trim(),

        role:
          input.role ??
          "petugas",

        aktif:
          input.aktif ??
          true,
      })
      .returning({
        id:
          user.id,

        username:
          user.username,

        nama:
          user.nama,

        role:
          user.role,

        aktif:
          user.aktif,

        createdAt:
          user.createdAt,

        updatedAt:
          user.updatedAt,
      });

  const data =
    hasil[0];

  if (!data) {
    throw new Error(
      "Gagal menyimpan user.",
    );
  }

  return data;
}

// ============================================================
// UPDATE
// ============================================================

export async function updateUser(
  id: number,
  input: UpdateUserInput,
) {
  const existing =
    await ambilUserById(
      id,
    );

  if (!existing) {
    throw notFound(
      "User tidak ditemukan.",
    );
  }

  const passwordHash =
    input.password !==
    undefined
      ? await hashPassword(
          input.password,
        )
      : undefined;

  const passwordBerubah =
    input.password !==
    undefined;

  const akunDinonaktifkan =
    existing.aktif ===
      true &&
    input.aktif ===
      false;

  const harusRevokeSession =
    passwordBerubah ||
    akunDinonaktifkan;

  const hasil =
    await db
      .update(
        user,
      )
      .set({
        ...(input.nama !==
        undefined
          ? {
              nama:
                input.nama.trim(),
            }
          : {}),

        ...(input.role !==
        undefined
          ? {
              role:
                input.role,
            }
          : {}),

        ...(input.aktif !==
        undefined
          ? {
              aktif:
                input.aktif,
            }
          : {}),

        ...(passwordHash !==
        undefined
          ? {
              passwordHash,
            }
          : {}),

        updatedAt:
          sql`CURRENT_TIMESTAMP`,
      })
      .where(
        eq(
          user.id,
          id,
        ),
      )
      .returning({
        id:
          user.id,

        username:
          user.username,

        nama:
          user.nama,

        role:
          user.role,

        aktif:
          user.aktif,

        createdAt:
          user.createdAt,

        updatedAt:
          user.updatedAt,
      });

  const data =
    hasil[0];

  if (!data) {
    throw new Error(
      "User gagal diperbarui.",
    );
  }

  
  if (
    harusRevokeSession
  ) {
    await revokeAllSessionsForUser(
      id,
    );
  }

  return data;
}
