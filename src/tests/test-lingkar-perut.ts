import assert from "node:assert/strict";

import {
  klasifikasiLingkarPerutAsia,
} from "../lib/clinical-derived-calculator.js";

assert.equal(
  klasifikasiLingkarPerutAsia(
    5,
    "L",
  ),
  "TIDAK_VALID",
);

assert.equal(
  klasifikasiLingkarPerutAsia(
    5,
    "P",
  ),
  "TIDAK_VALID",
);

assert.equal(
  klasifikasiLingkarPerutAsia(
    85,
    "L",
  ),
  "NORMAL",
);

assert.equal(
  klasifikasiLingkarPerutAsia(
    85,
    "P",
  ),
  "OBESITAS_SENTRAL",
);

assert.equal(
  klasifikasiLingkarPerutAsia(
    90,
    "L",
  ),
  "NORMAL",
);

assert.equal(
  klasifikasiLingkarPerutAsia(
    91,
    "L",
  ),
  "OBESITAS_SENTRAL",
);

console.log(
  "TEST LINGKAR PERUT PASS",
);
