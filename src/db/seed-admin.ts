import {
  tambahUser,
  ambilUserByUsername,
} from "../lib/user.service.js";

async function main() {
  const username =
    (
      process.env
        .POSGA_ADMIN_USERNAME ??
      "admin"
    )
      .trim()
      .toLowerCase();

  const password =
    process.env
      .POSGA_ADMIN_PASSWORD;

  const nama =
    process.env
      .POSGA_ADMIN_NAME ??
    "Administrator POSGA";

  if (!password) {
    throw new Error(
      "POSGA_ADMIN_PASSWORD belum diisi.",
    );
  }

  const existing =
    await ambilUserByUsername(
      username,
    );

  if (existing) {
    console.log(
      `Admin '${username}' sudah ada. Seed dilewati.`,
    );

    return;
  }

  const data =
    await tambahUser({
      username,

      password,

      nama,

      role:
        "admin",

      aktif:
        true,
    });

  console.log(
    "Admin berhasil dibuat:",
    {
      id:
        data.id,

      username:
        data.username,

      nama:
        data.nama,

      role:
        data.role,
    },
  );
}

main().catch(
  (error) => {
    console.error(
      "SEED ADMIN GAGAL:",
      error,
    );

    process.exitCode =
      1;
  },
);