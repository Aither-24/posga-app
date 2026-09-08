import assert from "node:assert/strict";

import request from "supertest";

import * as XLSX from "xlsx";

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
    XLSX.read(
      body,
      {
        type: "buffer",
      },
    );

  assert.ok(
    workbook.SheetNames.includes(
      "Ringkasan",
    ),
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
    assert.ok(
      workbook.SheetNames.includes(
        sheet,
      ),
      `Sheet ${sheet} tidak ditemukan.`,
    );
  }

  console.log(
    "TEST EXPORT EXCEL POSGA BERHASIL",
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
