import assert from "node:assert/strict";

import {
  hitungImt,
  klasifikasiAnemia,
  klasifikasiGds,
  klasifikasiObesitasAsiaPasifik,
  klasifikasiTekananDarahDewasa,
  zScoreMasukRentangWho,
} from "../lib/clinical-derived-calculator.js";

// hitungImt() sengaja mengembalikan nilai mentah.
// Pembulatan untuk penyimpanan/display dilakukan oleh derived service.
// Jangan menguji floating point dengan string toFixed(), karena representasi
// biner JavaScript dapat membuat 21.875 tampil sebagai 21.87 pada kasus tertentu.
const imt = hitungImt(56, 160);
assert.ok(imt !== null);
assert.ok(
  Math.abs(imt - 21.875) < 1e-10,
  `IMT 56 kg / 160 cm seharusnya 21.875, aktual ${imt}`,
);

assert.equal(klasifikasiObesitasAsiaPasifik(18.4), "KURANG");
assert.equal(klasifikasiObesitasAsiaPasifik(18.5), "NORMAL");
assert.equal(klasifikasiObesitasAsiaPasifik(23), "OVERWEIGHT");
assert.equal(klasifikasiObesitasAsiaPasifik(25), "OBESITAS_1");
assert.equal(klasifikasiObesitasAsiaPasifik(30), "OBESITAS_2");

assert.equal(klasifikasiGds(139.9), "NORMAL");
assert.equal(klasifikasiGds(140), "PREDIABETES");
assert.equal(klasifikasiGds(199.9), "PREDIABETES");
assert.equal(klasifikasiGds(200), "DM");

assert.equal(
  klasifikasiTekananDarahDewasa(110, 70),
  "NORMAL",
);
assert.equal(
  klasifikasiTekananDarahDewasa(135, 88),
  "PREHIPERTENSI",
);
assert.equal(
  klasifikasiTekananDarahDewasa(150, 95),
  "HIPERTENSI_1",
);
assert.equal(
  klasifikasiTekananDarahDewasa(170, 105),
  "HIPERTENSI_2",
);
assert.equal(
  klasifikasiTekananDarahDewasa(180, 110),
  "HIPERTENSI_3",
);
assert.equal(
  klasifikasiTekananDarahDewasa(150, 80),
  "HT_SISTOLIK_TERISOLASI",
);

assert.equal(
  klasifikasiAnemia(
    11.5,
    {
      umurTahun: 10,
      jenisKelamin: "P",
      kategori: "sekolah",
    },
  ),
  "NORMAL",
);

assert.equal(
  klasifikasiAnemia(
    11.4,
    {
      umurTahun: 10,
      jenisKelamin: "P",
      kategori: "sekolah",
    },
  ),
  "RINGAN",
);

assert.equal(
  klasifikasiAnemia(
    10.4,
    {
      umurTahun: 25,
      jenisKelamin: "P",
      kategori: "ibu_hamil",
      trimesterKehamilan: 2,
    },
  ),
  "RINGAN",
);

assert.equal(zScoreMasukRentangWho("WAZ", 37.55), null);
assert.equal(zScoreMasukRentangWho("WAZ", 2), 2);
assert.equal(zScoreMasukRentangWho("WHZ", 5.1), null);

console.log("PASS: 12.7B2 clinical calculator boundaries");
