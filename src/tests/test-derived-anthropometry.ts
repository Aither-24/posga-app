import assert from "node:assert/strict";

import { db } from "../db/index.js";
import { eq, inArray } from "drizzle-orm";
import {
  hasilPemeriksaan,
  indikator,
  opsiIndikator,
} from "../db/schema.js";
import {
  siapkanRencanaDerivedIndicators,
} from "../lib/derived-indicator.service.js";

async function main() {
  const masters = await db
    .select({
      id: indikator.id,
      kode: indikator.kode,
      derived: indikator.derived,
    })
    .from(indikator)
    .where(
      inArray(indikator.kode, [
        "BB_U",
        "STATUS_BB_U",
        "TB_U",
        "STATUS_TB_U",
        "BB_TB",
        "STATUS_BB_TB",
        "STATUS_LILA",
        "STATUS_LIKA",
        "IMT_U",
        "STATUS_IMT_U",
      ]),
    );

  for (const row of masters) {
    assert.equal(
      row.derived,
      true,
      `${row.kode} harus derived`,
    );
  }

  const prasekolahRules = await db
    .select({
      kode: indikator.kode,
    })
    .from(indikator)
    .where(
      inArray(indikator.kode, [
        "IMT_U",
        "STATUS_IMT_U",
      ]),
    );

  assert.equal(prasekolahRules.length, 2);

  console.log("PASS derived anthropometry master smoke");
  console.log(
    "Catatan: kalkulasi runtime diuji saat form menyimpan BB/TB/LIKA/LILA.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
