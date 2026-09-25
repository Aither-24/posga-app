import assert from "node:assert/strict";

import ExcelJS from "@ayocore/exceljs";

import request from "supertest";

import {
  asc,
} from "drizzle-orm";

import {
  app,
} from "../app.js";

import {
  db,
} from "../db/index.js";

import {
  sesiPosga,
} from "../db/schema.js";

function binaryParser(
  res: NodeJS.ReadableStream,
  callback: (
    error: Error | null,
    body?: Buffer,
  ) => void,
) {
  const chunks: Buffer[] =
    [];

  res.on(
    "data",
    (
      chunk: Buffer,
    ) => {
      chunks.push(
        Buffer.from(
          chunk,
        ),
      );
    },
  );

  res.on(
    "end",
    () => {
      callback(
        null,
        Buffer.concat(
          chunks,
        ),
      );
    },
  );
}

async function main() {
  process.env
    .POSGA_TEST_BYPASS_AUTH =
    "1";

  const sesi =
    (
      await db
        .select({
          posyanduId:
            sesiPosga.posyanduId,
        })
        .from(
          sesiPosga,
        )
        .orderBy(
          asc(
            sesiPosga.id,
          ),
        )
        .limit(1)
    )[0];

  assert.ok(
    sesi,
    "Fixture sesi tidak tersedia.",
  );

  const response =
    await request(
      app,
    )
      .get(
        `/api/export/posga.xlsx?posyanduId=${sesi.posyanduId}`,
      )
      .buffer(
        true,
      )
      .parse(
        binaryParser as any,
      )
      .expect(
        200,
      )
      .expect(
        "Content-Type",
        /spreadsheetml/,
      );

  const body =
    response.body as Buffer;

  assert.ok(
    Buffer.isBuffer(
      body,
    ),
  );

  assert.equal(
    body.subarray(
      0,
      2,
    ).toString(),
    "PK",
    "File bukan XLSX/ZIP yang valid.",
  );

  const workbook =
    new ExcelJS.Workbook();

  await workbook.xlsx.load(
    body as any,
  );

  assert.ok(
    workbook.getWorksheet(
      "Ringkasan",
    ),
    "Sheet Ringkasan tidak ditemukan.",
  );

  for (
    const sheet of [
      "Bayi",
      "Balita",
      "Prasekolah",
      "Sekolah",
      "Dewasa",
      "Lansia",
      "Ibu Hamil",
      "Ibu Nifas",
    ]
  ) {
    const worksheet =
      workbook.getWorksheet(
        sheet,
      );

    assert.ok(
      worksheet,
      `Sheet ${sheet} tidak ditemukan.`,
    );

    assert.equal(
      worksheet.getCell(
        "A6",
      ).value,
      "IDENTITAS / BIODATA PESERTA",
      `Header biodata ${sheet} tidak sesuai.`,
    );

    assert.equal(
      worksheet.getCell(
        "A1",
      ).isMerged,
      true,
      `Judul sheet ${sheet} harus merged.`,
    );

    assert.equal(
      worksheet.views[0]?.state,
      "frozen",
      `Freeze pane ${sheet} tidak aktif.`,
    );
  }

  const punyaBlokTanggal =
    workbook.worksheets
      .filter(
        (worksheet) =>
          worksheet.name !==
          "Ringkasan",
      )
      .some(
        (worksheet) => {
          const values =
            worksheet
              .getRow(6)
              .values;

          if (
            !Array.isArray(
              values,
            )
          ) {
            return false;
          }

          return values.some(
            (value) =>
              String(
                value ??
                  "",
              ).startsWith(
                "POSGA TANGGAL ",
              ),
          );
        },
      );

  assert.equal(
    punyaBlokTanggal,
    true,
    "Tidak ada blok POSGA per tanggal pada workbook export.",
  );

  console.log(
    "TEST EXPORT EXCELJS POSGA BERHASIL",
  );
}

main()
  .catch(
    (err) => {
      console.error(
        err,
      );
      process.exit(
        1,
      );
    },
  );
