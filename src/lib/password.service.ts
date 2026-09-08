import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

import {
  promisify,
} from "node:util";

const scrypt =
  promisify(
    scryptCallback,
  );

const SALT_BYTES =
  16;

const KEY_LENGTH =
  64;

// ============================================================
// HASH PASSWORD
//
// Format:
// scrypt$<salt hex>$<hash hex>
// ============================================================

export async function hashPassword(
  password: string,
) {
  if (
    password.length < 8
  ) {
    throw new Error(
      "Password minimal 8 karakter.",
    );
  }

  const salt =
    randomBytes(
      SALT_BYTES,
    ).toString(
      "hex",
    );

  const derived =
    (await scrypt(
      password,
      salt,
      KEY_LENGTH,
    )) as Buffer;

  return [
    "scrypt",
    salt,
    derived.toString(
      "hex",
    ),
  ].join("$");
}

// ============================================================
// VERIFY PASSWORD
// ============================================================

export async function verifyPassword(
  password: string,
  storedHash: string,
) {
  const parts =
    storedHash.split(
      "$",
    );

  if (
    parts.length !== 3
  ) {
    return false;
  }

  const [
    algorithm,
    salt,
    hashHex,
  ] = parts;

  if (
    algorithm !==
      "scrypt" ||
    !salt ||
    !hashHex
  ) {
    return false;
  }

  let storedBuffer:
    Buffer;

  try {
    storedBuffer =
      Buffer.from(
        hashHex,
        "hex",
      );
  } catch {
    return false;
  }

  if (
    storedBuffer.length !==
    KEY_LENGTH
  ) {
    return false;
  }

  const derived =
    (await scrypt(
      password,
      salt,
      KEY_LENGTH,
    )) as Buffer;

  if (
    derived.length !==
    storedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    derived,
    storedBuffer,
  );
}