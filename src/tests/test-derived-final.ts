import assert from "node:assert/strict";

import {
  hitungMap,
  klasifikasiKunjunganNifas,
  klasifikasiLingkarPerutAsia,
} from "../lib/clinical-derived-calculator.js";

const map = hitungMap(120, 80);
assert.ok(map !== null);
assert.ok(
  Math.abs(map - 93.3333333333) < 1e-8,
);

assert.equal(
  klasifikasiLingkarPerutAsia(
    89,
    "L",
  ),
  "NORMAL",
);

assert.equal(
  klasifikasiLingkarPerutAsia(
    90,
    "L",
  ),
  "OBESITAS_SENTRAL",
);

assert.equal(
  klasifikasiLingkarPerutAsia(
    79,
    "P",
  ),
  "NORMAL",
);

assert.equal(
  klasifikasiLingkarPerutAsia(
    80,
    "P",
  ),
  "OBESITAS_SENTRAL",
);

assert.equal(
  klasifikasiKunjunganNifas(
    "2026-09-01",
    "2026-09-02",
  ),
  "KF1",
);

assert.equal(
  klasifikasiKunjunganNifas(
    "2026-09-01",
    "2026-09-06",
  ),
  "KF2",
);

assert.equal(
  klasifikasiKunjunganNifas(
    "2026-09-01",
    "2026-09-20",
  ),
  "KF3",
);

assert.equal(
  klasifikasiKunjunganNifas(
    "2026-09-01",
    "2026-10-05",
  ),
  "KF4",
);

assert.equal(
  klasifikasiKunjunganNifas(
    "2026-09-01",
    "2026-10-20",
  ),
  null,
);

console.log(
  "PASS: 12.7B3 final derived calculator",
);
