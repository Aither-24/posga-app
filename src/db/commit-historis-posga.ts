// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

type TypedValue = {
  type: "number" | "text" | "boolean" | "date" | "select";
  value?: number | string | boolean;
  optionCode?: string;
};

type ResultSeed = {
  indicatorCode: string;
  value: TypedValue;
  replaceIfMatches?: TypedValue;
};

type CounselSeed = {
  indicatorCode: string;
  optionCodes: string[];
  replaceIfOptionCodes?: string[];
};

type ParticipantSeed = {
  nik: string;
  kategoriSaatItu: string;
  sumberKategori: string;
  sourceCategory?: string;
  results: ResultSeed[];
  counseling: CounselSeed[];
  replaceIfCategory?: { kategoriSaatItu: string; sumberKategori: string };
};

type SeedData = {
  meta: any;
  posyandu: Array<{ key: string; nama: string; lokasi: string }>;
  biodataAnak: any[];
  biodataDewasa: any[];
  pregnancyEpisodes: any[];
  postpartumEpisodes: any[];
  sessions: Array<{ posyanduKey: string; tanggalPosga: string; participants: ParticipantSeed[] }>;
  screenings: Array<{
    nik: string;
    posyanduKey: string;
    tanggalSkrining: string;
    indicatorCode: string;
    value: TypedValue;
    replaceIfMatches?: TypedValue;
  }>;
};

const COMMIT = process.argv.includes("--commit");
const VERIFY_ONLY = process.argv.includes("--verify-only");
const SKIP_DERIVED = process.argv.includes("--skip-derived");
const JSON_OUTPUT = process.argv.includes("--json");

const root = process.cwd();
const seedPath = path.resolve(
  process.env.POSGA_HISTORIS_FINAL_FILE ?? path.join(root, "seed-historis-posga-final.json"),
);
const reportPath = path.resolve(
  process.env.POSGA_HISTORIS_FINAL_REPORT ?? path.join(root, "seed-historis-posga-final-report.json"),
);
const dbPath = path.resolve(
  process.env.POSGA_DB_PATH ?? path.join(root, "data", "posga.db"),
);

function fail(message: string): never {
  throw new Error(message);
}
function loadJson<T = any>(p: string): T {
  if (!fs.existsSync(p)) fail(`File tidak ditemukan: ${p}`);
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}
function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sqliteIntegrity(db: Database.Database) {
  try {
    const rows = db.pragma("integrity_check") as any[];
    const messages = rows.map((row) => String(Object.values(row)[0] ?? "")).filter((x) => x.toLowerCase() !== "ok");
    return { ok: messages.length === 0, messages };
  } catch (error) {
    return { ok: false, messages: [String(error)] };
  }
}
function sameNum(a: any, b: any) {
  return a !== null && a !== undefined && Number.isFinite(Number(a)) && Math.abs(Number(a) - Number(b)) < 1e-6;
}
function normalizeDb(v: any) {
  return typeof v === "boolean" ? (v ? 1 : 0) : v;
}
function eqNullable(a: any, b: any) {
  if (a === null || a === undefined || a === "") return b === null || b === undefined || b === "";
  if (typeof b === "number") return sameNum(a, b);
  if (typeof b === "boolean") return Number(a) === (b ? 1 : 0);
  return String(a) === String(b);
}
function sameSet<T>(a: Set<T>, b: Set<T>) {
  return a.size === b.size && [...a].every((x) => b.has(x));
}
function periodsOverlap(aStart: string, aEnd: string | null | undefined, bStart: string, bEnd: string | null | undefined) {
  const ae = aEnd ?? "9999-12-31";
  const be = bEnd ?? "9999-12-31";
  return aStart <= be && bStart <= ae;
}

function isIsoDate(value: any) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function dateBefore(a: string, b: string) {
  return isIsoDate(a) && isIsoDate(b) && a < b;
}
function validateTemporalDate(label: string, date: string, dob: string | null | undefined, staticErrors: string[]) {
  if (!isIsoDate(date)) {
    staticErrors.push(`${label}_invalid_date:${date}`);
    return false;
  }
  if (dob && isIsoDate(dob) && dateBefore(date, dob)) {
    staticErrors.push(`${label}_before_birth:${date}<${dob}`);
    return false;
  }
  return true;
}

function assertSchema(db: Database.Database) {
  const required = [
    "lokasi", "posyandu", "peserta", "peserta_posyandu", "biodata_anak", "biodata_dewasa",
    "episode_kehamilan", "episode_nifas", "tindakan_persalinan", "komplikasi_persalinan",
    "sesi_posga", "peserta_sesi_posga", "indikator", "opsi_indikator", "hasil_pemeriksaan",
    "hasil_konseling", "hasil_konseling_opsi", "hasil_skrining",
  ];
  const have = new Set((db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map((x) => x.name));
  const missing = required.filter((x) => !have.has(x));
  if (missing.length) fail(`Schema database belum lengkap: ${missing.join(", ")}`);
}

function seedDuplicateSummary(data: SeedData) {
  const sessionKeys = data.sessions.map((s) => `${s.posyanduKey}|${s.tanggalPosga}`);
  const participantKeys = data.sessions.flatMap((s) => s.participants.map((p) => `${s.posyanduKey}|${s.tanggalPosga}|${p.nik}`));
  const examKeys = data.sessions.flatMap((s) =>
    s.participants.flatMap((p) => (p.results ?? []).map((r) => `${s.posyanduKey}|${s.tanggalPosga}|${p.nik}|${r.indicatorCode}`)),
  );
  const screenKeys = data.screenings.map((x) => `${x.nik}|${x.tanggalSkrining}|${x.indicatorCode}`);
  return {
    sessions: sessionKeys.length - new Set(sessionKeys).size,
    participantSessions: participantKeys.length - new Set(participantKeys).size,
    examinations: examKeys.length - new Set(examKeys).size,
    screenings: screenKeys.length - new Set(screenKeys).size,
  };
}

function makeContext(db: Database.Database, data: SeedData) {
  assertSchema(db);
  db.pragma("foreign_keys = ON");

  const posId = new Map<string, number>();
  const qPos = db.prepare(`
    SELECT p.id
    FROM posyandu p
    JOIN lokasi l ON l.id = p.lokasi_id
    WHERE upper(trim(p.nama)) = upper(trim(?))
      AND upper(trim(l.nama)) = upper(trim(?))
    LIMIT 1
  `);
  for (const p of data.posyandu) {
    const row = qPos.get(p.nama, p.lokasi) as any;
    if (!row) fail(`Posyandu tidak ditemukan di database: ${p.key} (${p.nama} / ${p.lokasi})`);
    posId.set(p.key, row.id);
  }

  const indicators = new Map<string, any>();
  for (const row of db.prepare(`SELECT id,kode,kelompok,tipe_input,derived,aktif FROM indikator`).all() as any[]) {
    indicators.set(row.kode, row);
  }
  const optionIds = new Map<string, number>();
  for (const row of db.prepare(`
    SELECT i.kode indikator_kode, o.kode opsi_kode, o.id
    FROM opsi_indikator o
    JOIN indikator i ON i.id = o.indikator_id
    WHERE o.aktif = 1
  `).all() as any[]) {
    optionIds.set(`${row.indikator_kode}::${row.opsi_kode}`, row.id);
  }

  const qPeserta = db.prepare(`SELECT nik,tanggal_lahir FROM peserta WHERE nik=? LIMIT 1`);
  const qMember = db.prepare(`SELECT posyandu_id FROM peserta_posyandu WHERE peserta_nik=? AND aktif=1 AND tanggal_selesai IS NULL LIMIT 1`);
  const qBioAnak = db.prepare(`SELECT * FROM biodata_anak WHERE peserta_nik=? LIMIT 1`);
  const qBioDewasa = db.prepare(`SELECT * FROM biodata_dewasa WHERE peserta_nik=? LIMIT 1`);
  const qSession = db.prepare(`SELECT id,status,catatan FROM sesi_posga WHERE posyandu_id=? AND tanggal_posga=? LIMIT 1`);
  const qPS = db.prepare(`SELECT id,kategori_saat_itu,sumber_kategori,status_pemeriksaan FROM peserta_sesi_posga WHERE sesi_posga_id=? AND peserta_nik=? LIMIT 1`);
  const qExam = db.prepare(`SELECT * FROM hasil_pemeriksaan WHERE peserta_sesi_id=? AND indikator_id=? LIMIT 1`);
  const qCounsel = db.prepare(`SELECT id,opsi_id FROM hasil_konseling WHERE peserta_sesi_id=? AND indikator_id=? ORDER BY id`);
  const qCounselOpts = db.prepare(`SELECT opsi_id FROM hasil_konseling_opsi WHERE hasil_konseling_id=?`);
  const qScreen = db.prepare(`SELECT * FROM hasil_skrining WHERE peserta_nik=? AND indikator_id=? AND tanggal_skrining=? AND sumber='posga' ORDER BY id`);
  const qPregExact = db.prepare(`SELECT * FROM episode_kehamilan WHERE peserta_nik=? AND tanggal_mulai=? ORDER BY id`);
  const qPregOther = db.prepare(`SELECT * FROM episode_kehamilan WHERE peserta_nik=? AND status<>'dibatalkan' ORDER BY tanggal_mulai,id`);
  const qNifasExact = db.prepare(`SELECT * FROM episode_nifas WHERE peserta_nik=? AND tanggal_mulai=? ORDER BY id`);
  const qNifasOther = db.prepare(`SELECT * FROM episode_nifas WHERE peserta_nik=? AND status<>'dibatalkan' ORDER BY tanggal_mulai,id`);
  const qComp = db.prepare(`SELECT * FROM komplikasi_persalinan WHERE episode_nifas_id=? AND kode=? ORDER BY id`);
  const qAction = db.prepare(`SELECT * FROM tindakan_persalinan WHERE episode_nifas_id=? AND kode=? ORDER BY id`);

  function validateValue(code: string, value: TypedValue, expectedGroup: string) {
    const ind = indicators.get(code);
    if (!ind) fail(`Indikator tidak ditemukan: ${code}`);
    if (ind.aktif !== 1) fail(`Indikator tidak aktif: ${code}`);
    if (ind.kelompok !== expectedGroup) fail(`Kelompok indikator ${code} bukan ${expectedGroup}`);
    if (expectedGroup === "pemeriksaan" && ind.derived === 1) fail(`Seed mencoba menulis indikator derived secara manual: ${code}`);
    if (value.type !== ind.tipe_input) fail(`Tipe ${code} tidak cocok: seed=${value.type}, database=${ind.tipe_input}`);
    let optionId: number | null = null;
    if (value.type === "select") {
      optionId = optionIds.get(`${code}::${value.optionCode}`) ?? null;
      if (!optionId) fail(`Opsi indikator tidak ditemukan: ${code}/${value.optionCode}`);
    }
    return { ind, optionId };
  }

  function sameValueRow(row: any, value: TypedValue, optionId: number | null) {
    if (!row) return false;
    if (value.type === "number") return sameNum(row.nilai_number, value.value) && row.nilai_text == null && row.nilai_boolean == null;
    if (value.type === "text") return String(row.nilai_text ?? "").trim() === String(value.value ?? "").trim() && row.nilai_number == null && row.nilai_boolean == null;
    if (value.type === "boolean") return Number(row.nilai_boolean) === (value.value ? 1 : 0) && row.nilai_number == null && row.nilai_text == null;
    if (value.type === "date") return String(row.nilai_date ?? "") === String(value.value ?? "");
    if (value.type === "select") return (row.opsi_id ?? null) === optionId;
    return false;
  }

  function columnsForValue(value: TypedValue, optionId: number | null) {
    return {
      opsi: value.type === "select" ? optionId : null,
      num: value.type === "number" ? Number(value.value) : null,
      text: value.type === "text" ? String(value.value) : null,
      bool: value.type === "boolean" ? (value.value ? 1 : 0) : null,
      date: value.type === "date" ? String(value.value) : null,
    };
  }

  function optionSet(indicatorCode: string, codes: string[]) {
    return new Set(codes.map((code) => {
      const id = optionIds.get(`${indicatorCode}::${code}`);
      if (!id) fail(`Opsi konseling tidak ada: ${indicatorCode}/${code}`);
      return id;
    }));
  }
  function currentCounselSet(rows: any[]) {
    const got = new Set<number>();
    if (rows.length === 1) {
      if (rows[0].opsi_id) got.add(rows[0].opsi_id);
      for (const x of qCounselOpts.all(rows[0].id) as any[]) got.add(x.opsi_id);
    }
    return got;
  }

  const bioAnakFields: any = {
    namaIbuKandung: "nama_ibu_kandung", nikIbuKandung: "nik_ibu_kandung", anakKe: "anak_ke",
    imd: "imd", bblGram: "bbl_gram", pblCm: "pbl_cm",
  };
  const bioDewasaFields: any = {
    namaPasangan: "nama_pasangan", nikPasangan: "nik_pasangan", jumlahAnak: "jumlah_anak",
    kbYangDiikuti: "kb_yang_diikuti", alasanTidakBerKb: "alasan_tidak_ber_kb", rpdHt: "rpd_ht", rpdDm: "rpd_dm",
  };
  const pregFields: any = {
    tanggalSelesai: "tanggal_selesai", status: "status", bbSebelumHamilKg: "bb_sebelum_hamil_kg",
    tbCm: "tb_cm", hpht: "hpht", hpl: "hpl", lilaAwalCm: "lila_awal_cm",
  };
  const nifasFields: any = {
    tanggalSelesai: "tanggal_selesai", status: "status", tanggalMelahirkan: "tanggal_melahirkan",
    jamBersalin: "jam_bersalin", caraPersalinan: "cara_persalinan", vitaminA: "vitamin_a", asiEksklusif: "asi_eksklusif",
  };

  function inspectFill(old: any, obj: any, fields: any) {
    let changed = false;
    let conflict = false;
    for (const [src, col] of Object.entries(fields)) {
      const nv = obj[src];
      if (nv === undefined || nv === null) continue;
      const ov = old[col as string];
      if (ov === null || ov === undefined || ov === "") changed = true;
      else if (!eqNullable(ov, normalizeDb(nv))) conflict = true;
    }
    return { changed, conflict };
  }

  function pregHasOverlap(ep: any) {
    for (const x of qPregOther.all(ep.nik) as any[]) {
      if (x.tanggal_mulai === ep.tanggalMulai) continue;
      const oldEnd = x.tanggal_selesai ?? x.hpl ?? null;
      const newEnd = ep.tanggalSelesai ?? ep.hpl ?? null;
      if (periodsOverlap(ep.tanggalMulai, newEnd, x.tanggal_mulai, oldEnd)) return true;
    }
    return false;
  }
  function nifasHasOverlap(ep: any) {
    for (const x of qNifasOther.all(ep.nik) as any[]) {
      if (x.tanggal_mulai === ep.tanggalMulai) continue;
      if (periodsOverlap(ep.tanggalMulai, ep.tanggalSelesai ?? null, x.tanggal_mulai, x.tanggal_selesai ?? null)) return true;
    }
    return false;
  }

  return {
    posId, indicators, optionIds,
    qPeserta, qMember, qBioAnak, qBioDewasa, qSession, qPS, qExam, qCounsel, qCounselOpts, qScreen,
    qPregExact, qPregOther, qNifasExact, qNifasOther, qComp, qAction,
    validateValue, sameValueRow, columnsForValue, optionSet, currentCounselSet,
    bioAnakFields, bioDewasaFields, pregFields, nifasFields, inspectFill, pregHasOverlap, nifasHasOverlap,
  };
}

function blankCounts() {
  return {
    bioAnak: { insert: 0, update: 0, reuse: 0, conflict: 0 },
    bioDewasa: { insert: 0, update: 0, reuse: 0, conflict: 0 },
    pregnancy: { insert: 0, update: 0, reuse: 0, conflict: 0 },
    postpartum: { insert: 0, update: 0, reuse: 0, conflict: 0 },
    complications: { insert: 0, reuse: 0, conflict: 0 },
    actions: { insert: 0, reuse: 0, conflict: 0 },
    sessions: { insert: 0, reuse: 0, conflict: 0 },
    participantSessions: { insert: 0, reuse: 0, replaceSafe: 0, conflict: 0 },
    examinations: { insert: 0, reuse: 0, replaceSafe: 0, conflict: 0 },
    counseling: { insert: 0, reuse: 0, replaceSafe: 0, conflict: 0 },
    screenings: { insert: 0, reuse: 0, replaceSafe: 0, linkUpgrade: 0, conflict: 0 },
  };
}

function conflictTotal(counts: any) {
  return Object.values(counts).reduce((n: number, x: any) => n + Number(x.conflict ?? 0), 0);
}

function preflight(db: Database.Database, data: SeedData) {
  const c = makeContext(db, data);
  const counts = blankCounts();
  const staticErrors: string[] = [];

  const dup = seedDuplicateSummary(data);
  for (const [k, v] of Object.entries(dup)) if (v !== 0) staticErrors.push(`seed_duplicate:${k}:${v}`);

  const actualCounts = {
    sessions: data.sessions.length,
    participantSessions: data.sessions.reduce((n,s)=>n+s.participants.length,0),
    examinationResults: data.sessions.reduce((n,s)=>n+s.participants.reduce((m,p)=>m+(p.results??[]).length,0),0),
    counselingResults: data.sessions.reduce((n,s)=>n+s.participants.reduce((m,p)=>m+(p.counseling??[]).length,0),0),
    counselingOptions: data.sessions.reduce((n,s)=>n+s.participants.reduce((m,p)=>m+(p.counseling??[]).reduce((q,k)=>q+(k.optionCodes??[]).length,0),0),0),
    screenings: data.screenings.length,
    biodataAnak: data.biodataAnak.length,
    biodataDewasa: data.biodataDewasa.length,
    pregnancyEpisodes: data.pregnancyEpisodes.length,
    postpartumEpisodes: data.postpartumEpisodes.length,
    complications: data.postpartumEpisodes.reduce((n,x)=>n+(x.komplikasi??[]).length,0),
    actions: data.postpartumEpisodes.reduce((n,x)=>n+(x.tindakan??[]).length,0),
  };
  for (const [k,v] of Object.entries(actualCounts)) {
    if (Number(data.meta?.counts?.[k]) !== Number(v)) staticErrors.push(`seed_meta_count_mismatch:${k}:${data.meta?.counts?.[k]}!=${v}`);
  }

  const currentFk = db.pragma("foreign_key_check") as any[];
  if (currentFk.length) staticErrors.push(`database_foreign_key_violation:${currentFk.length}`);

  for (const b of data.biodataAnak) {
    if (!c.qPeserta.get(b.nik)) { staticErrors.push(`biodata_anak_participant_missing:${b.nik}`); continue; }
    const old = c.qBioAnak.get(b.nik) as any;
    if (!old) counts.bioAnak.insert++;
    else {
      const st = c.inspectFill(old, b, c.bioAnakFields);
      if (st.conflict) counts.bioAnak.conflict++;
      else if (st.changed) counts.bioAnak.update++;
      else counts.bioAnak.reuse++;
    }
  }

  for (const b of data.biodataDewasa) {
    if (!c.qPeserta.get(b.nik)) { staticErrors.push(`biodata_dewasa_participant_missing:${b.nik}`); continue; }
    const old = c.qBioDewasa.get(b.nik) as any;
    if (!old) counts.bioDewasa.insert++;
    else {
      const st = c.inspectFill(old, b, c.bioDewasaFields);
      if (st.conflict) counts.bioDewasa.conflict++;
      else if (st.changed) counts.bioDewasa.update++;
      else counts.bioDewasa.reuse++;
    }
  }

  const pregnancyPresence = new Map<string, { exists: boolean; id: number | null }>();
  for (const ep of data.pregnancyEpisodes) {
    const participant = c.qPeserta.get(ep.nik) as any;
    if (!participant) { staticErrors.push(`pregnancy_participant_missing:${ep.nik}`); continue; }
    if (!validateTemporalDate(`pregnancy:${ep.nik}`, ep.tanggalMulai, participant.tanggal_lahir, staticErrors)) continue;
    if (ep.tanggalSelesai && (!isIsoDate(ep.tanggalSelesai) || ep.tanggalSelesai < ep.tanggalMulai)) {
      staticErrors.push(`pregnancy_invalid_end:${ep.nik}:${ep.tanggalMulai}->${ep.tanggalSelesai}`);
      continue;
    }
    const epMember = c.qMember.get(ep.nik) as any;
    if (!epMember || epMember.posyandu_id !== c.posId.get(ep.posyanduKey)) { staticErrors.push(`pregnancy_membership_mismatch:${ep.nik}:${ep.posyanduKey}`); continue; }
    const rows = c.qPregExact.all(ep.nik, ep.tanggalMulai) as any[];
    if (rows.length > 1) { counts.pregnancy.conflict++; pregnancyPresence.set(ep.key, { exists: false, id: null }); continue; }
    if (rows.length === 1) {
      const st = c.inspectFill(rows[0], ep, c.pregFields);
      if (st.conflict) counts.pregnancy.conflict++;
      else if (st.changed) counts.pregnancy.update++;
      else counts.pregnancy.reuse++;
      pregnancyPresence.set(ep.key, { exists: true, id: rows[0].id });
    } else if (c.pregHasOverlap(ep)) {
      counts.pregnancy.conflict++;
      pregnancyPresence.set(ep.key, { exists: false, id: null });
    } else {
      counts.pregnancy.insert++;
      pregnancyPresence.set(ep.key, { exists: false, id: null });
    }
  }

  for (const ep of data.postpartumEpisodes) {
    const participant = c.qPeserta.get(ep.nik) as any;
    if (!participant) { staticErrors.push(`postpartum_participant_missing:${ep.nik}`); continue; }
    if (!validateTemporalDate(`postpartum:${ep.nik}`, ep.tanggalMulai, participant.tanggal_lahir, staticErrors)) continue;
    if (ep.tanggalSelesai && (!isIsoDate(ep.tanggalSelesai) || ep.tanggalSelesai < ep.tanggalMulai)) {
      staticErrors.push(`postpartum_invalid_end:${ep.nik}:${ep.tanggalMulai}->${ep.tanggalSelesai}`);
      continue;
    }
    const epMember = c.qMember.get(ep.nik) as any;
    if (!epMember || epMember.posyandu_id !== c.posId.get(ep.posyanduKey)) { staticErrors.push(`postpartum_membership_mismatch:${ep.nik}:${ep.posyanduKey}`); continue; }
    if (ep.pregnancyKey && !data.pregnancyEpisodes.some((x) => x.key === ep.pregnancyKey)) {
      staticErrors.push(`postpartum_pregnancy_key_missing:${ep.key}:${ep.pregnancyKey}`);
    }
    const rows = c.qNifasExact.all(ep.nik, ep.tanggalMulai) as any[];
    let episodeId: number | null = null;
    if (rows.length > 1) counts.postpartum.conflict++;
    else if (rows.length === 1) {
      episodeId = rows[0].id;
      const st = c.inspectFill(rows[0], ep, c.nifasFields);
      const wantedPreg = ep.pregnancyKey ? pregnancyPresence.get(ep.pregnancyKey)?.id ?? null : null;
      if (st.conflict || (rows[0].episode_kehamilan_id && wantedPreg && rows[0].episode_kehamilan_id !== wantedPreg)) counts.postpartum.conflict++;
      else if (st.changed || (!rows[0].episode_kehamilan_id && ep.pregnancyKey)) counts.postpartum.update++;
      else counts.postpartum.reuse++;
    } else if (c.nifasHasOverlap(ep)) counts.postpartum.conflict++;
    else counts.postpartum.insert++;

    for (const x of ep.komplikasi ?? []) {
      if (!episodeId) { counts.complications.insert++; continue; }
      const rowsComp = c.qComp.all(episodeId, x.kode) as any[];
      if (!rowsComp.length) counts.complications.insert++;
      else if (rowsComp.length === 1 && rowsComp[0].label === x.label) counts.complications.reuse++;
      else counts.complications.conflict++;
    }
    for (const x of ep.tindakan ?? []) {
      if (!episodeId) { counts.actions.insert++; continue; }
      const rowsAct = c.qAction.all(episodeId, x.kode) as any[];
      if (!rowsAct.length) counts.actions.insert++;
      else if (rowsAct.length === 1 && rowsAct[0].label === x.label) counts.actions.reuse++;
      else counts.actions.conflict++;
    }
  }

  for (const s of data.sessions) {
    const pid = c.posId.get(s.posyanduKey)!;
    const sr = c.qSession.get(pid, s.tanggalPosga) as any;
    if (sr) counts.sessions.reuse++; else counts.sessions.insert++;

    for (const p of s.participants) {
      const participant = c.qPeserta.get(p.nik) as any;
      if (!participant) { staticErrors.push(`participant_missing:${p.nik}`); continue; }
      if (!validateTemporalDate(`session:${s.posyanduKey}:${p.nik}`, s.tanggalPosga, participant.tanggal_lahir, staticErrors)) continue;
      const mem = c.qMember.get(p.nik) as any;
      if (!mem || mem.posyandu_id !== pid) { staticErrors.push(`membership_mismatch:${p.nik}:${s.posyanduKey}`); continue; }
      const validateNewPayload = () => {
        for (const r of p.results ?? []) {
          try { c.validateValue(r.indicatorCode, r.value, "pemeriksaan"); }
          catch (e: any) { staticErrors.push(e.message); }
        }
        for (const k of p.counseling ?? []) {
          const ind = c.indicators.get(k.indicatorCode);
          if (!ind || ind.kelompok !== "konseling" || ind.tipe_input !== "multiselect") {
            staticErrors.push(`counsel_indicator_invalid:${k.indicatorCode}`);
            continue;
          }
          try { c.optionSet(k.indicatorCode, k.optionCodes ?? []); }
          catch (e: any) { staticErrors.push(e.message); }
        }
      };
      if (!sr) {
        counts.participantSessions.insert++;
        counts.examinations.insert += (p.results ?? []).length;
        counts.counseling.insert += (p.counseling ?? []).length;
        validateNewPayload();
        continue;
      }
      const ps = c.qPS.get(sr.id, p.nik) as any;
      if (!ps) {
        counts.participantSessions.insert++;
        counts.examinations.insert += (p.results ?? []).length;
        counts.counseling.insert += (p.counseling ?? []).length;
        validateNewPayload();
        continue;
      }
      if (ps.kategori_saat_itu !== p.kategoriSaatItu || ps.sumber_kategori !== p.sumberKategori) {
        if (p.replaceIfCategory && ps.kategori_saat_itu === p.replaceIfCategory.kategoriSaatItu && ps.sumber_kategori === p.replaceIfCategory.sumberKategori) {
          counts.participantSessions.replaceSafe++;
        } else {
          counts.participantSessions.conflict++;
          continue;
        }
      } else counts.participantSessions.reuse++;

      for (const r of p.results ?? []) {
        try {
          const { ind, optionId } = c.validateValue(r.indicatorCode, r.value, "pemeriksaan");
          const old = c.qExam.get(ps.id, ind.id) as any;
          if (!old) counts.examinations.insert++;
          else if (c.sameValueRow(old, r.value, optionId)) counts.examinations.reuse++;
          else if (r.replaceIfMatches) {
            const base = c.validateValue(r.indicatorCode, r.replaceIfMatches, "pemeriksaan");
            if (c.sameValueRow(old, r.replaceIfMatches, base.optionId)) counts.examinations.replaceSafe++;
            else counts.examinations.conflict++;
          } else counts.examinations.conflict++;
        } catch (e: any) { staticErrors.push(e.message); }
      }

      for (const k of p.counseling ?? []) {
        const ind = c.indicators.get(k.indicatorCode);
        if (!ind || ind.kelompok !== "konseling" || ind.tipe_input !== "multiselect") {
          staticErrors.push(`counsel_indicator_invalid:${k.indicatorCode}`);
          continue;
        }
        try {
          const want = c.optionSet(k.indicatorCode, k.optionCodes ?? []);
          const rows = c.qCounsel.all(ps.id, ind.id) as any[];
          if (!rows.length) counts.counseling.insert++;
          else if (rows.length > 1) counts.counseling.conflict++;
          else {
            const got = c.currentCounselSet(rows);
            if (sameSet(got, want)) counts.counseling.reuse++;
            else if (k.replaceIfOptionCodes && sameSet(got, c.optionSet(k.indicatorCode, k.replaceIfOptionCodes))) counts.counseling.replaceSafe++;
            else counts.counseling.conflict++;
          }
        } catch (e: any) { staticErrors.push(e.message); }
      }
    }
  }

  for (const sc of data.screenings) {
    const participant = c.qPeserta.get(sc.nik) as any;
    if (!participant) { staticErrors.push(`screen_participant_missing:${sc.nik}`); continue; }
    if (!validateTemporalDate(`screening:${sc.nik}:${sc.indicatorCode}`, sc.tanggalSkrining, participant.tanggal_lahir, staticErrors)) continue;
    try {
      const { ind, optionId } = c.validateValue(sc.indicatorCode, sc.value, "skrining");
      const rows = c.qScreen.all(sc.nik, ind.id, sc.tanggalSkrining) as any[];
      if (!rows.length) counts.screenings.insert++;
      else if (rows.length > 1) counts.screenings.conflict++;
      else if (c.sameValueRow(rows[0], sc.value, optionId)) counts.screenings.reuse++;
      else if (sc.replaceIfMatches) {
        const base = c.validateValue(sc.indicatorCode, sc.replaceIfMatches, "skrining");
        if (c.sameValueRow(rows[0], sc.replaceIfMatches, base.optionId)) counts.screenings.replaceSafe++;
        else counts.screenings.conflict++;
      } else counts.screenings.conflict++;
    } catch (e: any) { staticErrors.push(e.message); }
  }

  const ready = conflictTotal(counts) === 0 && staticErrors.length === 0;
  return { counts, staticErrors: [...new Set(staticErrors)], seedDuplicates: dup, foreignKeyViolations: currentFk.length, ready };
}

function printPlan(data: SeedData, plan: any) {
  console.log("=== POSGA HISTORIS — TAHAP 7 ===");
  console.log(`Mode                     : ${VERIFY_ONLY ? "VERIFY ONLY" : COMMIT ? "COMMIT FINAL" : "FINAL DRY RUN"}`);
  console.log(`Database                 : ${dbPath}`);
  console.log(`Seed final               : ${seedPath}`);
  console.log(`Target sesi historis     : ${data.meta.counts.sessions}`);
  console.log(`Target peserta-sesi      : ${data.meta.counts.participantSessions}`);
  console.log(`Target pemeriksaan dasar : ${data.meta.counts.examinationResults}`);
  console.log(`Target skrining          : ${data.meta.counts.screenings}`);
  console.log(`Target konseling         : ${data.meta.counts.counselingResults}`);
  console.log("\n--- PREFLIGHT ---");
  console.table(plan.counts);
  console.log(`Static error             : ${plan.staticErrors.length}`);
  console.log(`FK violation saat ini    : ${plan.foreignKeyViolations}`);
  console.log(`READY COMMIT FINAL       : ${plan.ready ? "YA" : "TIDAK"}`);
}

function updateFillFields(db: Database.Database, table: string, idCol: string, idValue: any, old: any, obj: any, fields: any) {
  let changed = false;
  for (const [src, col] of Object.entries(fields)) {
    const nv = obj[src];
    if (nv === undefined || nv === null) continue;
    const ov = old[col as string];
    if (ov === null || ov === undefined || ov === "") {
      db.prepare(`UPDATE ${table} SET ${col}=?, updated_at=CURRENT_TIMESTAMP WHERE ${idCol}=?`).run(normalizeDb(nv), idValue);
      changed = true;
    } else if (!eqNullable(ov, normalizeDb(nv))) {
      fail(`Konflik saat commit ${table}.${String(col)} untuk ${idValue}`);
    }
  }
  return changed;
}

async function commitFinal(db: Database.Database, data: SeedData, backupPath: string) {
  const c = makeContext(db, data);
  const counts = blankCounts();
  const derivedSync = new Set<number>();
  const psMap = new Map<string, { sessionId: number; participantSessionId: number }>();
  const pregIds = new Map<string, number>();

  const insBioAnak = db.prepare(`INSERT INTO biodata_anak(peserta_nik,nama_ibu_kandung,nik_ibu_kandung,anak_ke,imd,bbl_gram,pbl_cm,updated_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`);
  const insBioDewasa = db.prepare(`INSERT INTO biodata_dewasa(peserta_nik,nama_pasangan,nik_pasangan,jumlah_anak,kb_yang_diikuti,alasan_tidak_ber_kb,rpd_ht,rpd_dm,updated_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`);
  const insPreg = db.prepare(`INSERT INTO episode_kehamilan(peserta_nik,tanggal_mulai,tanggal_selesai,status,bb_sebelum_hamil_kg,tb_cm,hpht,hpl,lila_awal_cm,catatan,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
  const insNifas = db.prepare(`INSERT INTO episode_nifas(peserta_nik,episode_kehamilan_id,tanggal_mulai,tanggal_selesai,tanggal_melahirkan,jam_bersalin,cara_persalinan,vitamin_a,asi_eksklusif,status,catatan,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
  const updNifasPreg = db.prepare(`UPDATE episode_nifas SET episode_kehamilan_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND episode_kehamilan_id IS NULL`);
  const insComp = db.prepare(`INSERT INTO komplikasi_persalinan(episode_nifas_id,kode,label,catatan,created_at) VALUES(?,?,?,NULL,CURRENT_TIMESTAMP)`);
  const insAction = db.prepare(`INSERT INTO tindakan_persalinan(episode_nifas_id,kode,label,catatan,created_at) VALUES(?,?,?,NULL,CURRENT_TIMESTAMP)`);
  const insSession = db.prepare(`INSERT INTO sesi_posga(posyandu_id,tanggal_posga,status,catatan,created_at,updated_at) VALUES(?,?,'selesai','Migrasi historis POSGA',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
  const insPS = db.prepare(`INSERT INTO peserta_sesi_posga(sesi_posga_id,peserta_nik,kategori_saat_itu,sumber_kategori,status_pemeriksaan,created_at,updated_at) VALUES(?,?,?,?,'selesai',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
  const updPS = db.prepare(`UPDATE peserta_sesi_posga SET kategori_saat_itu=?,sumber_kategori=?,status_pemeriksaan='selesai',updated_at=CURRENT_TIMESTAMP WHERE id=?`);
  const insExam = db.prepare(`INSERT INTO hasil_pemeriksaan(peserta_sesi_id,indikator_id,opsi_id,nilai_number,nilai_text,nilai_boolean,nilai_date,catatan,created_at,updated_at) VALUES(?,?,?,?,?,?,?,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
  const updExam = db.prepare(`UPDATE hasil_pemeriksaan SET opsi_id=?,nilai_number=?,nilai_text=?,nilai_boolean=?,nilai_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`);
  const insCounsel = db.prepare(`INSERT INTO hasil_konseling(peserta_sesi_id,indikator_id,opsi_id,catatan,created_at,updated_at) VALUES(?,?,NULL,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
  const delCounselOpts = db.prepare(`DELETE FROM hasil_konseling_opsi WHERE hasil_konseling_id=?`);
  const insCounselOpt = db.prepare(`INSERT OR IGNORE INTO hasil_konseling_opsi(hasil_konseling_id,opsi_id,created_at) VALUES(?,?,CURRENT_TIMESTAMP)`);
  const insScreen = db.prepare(`INSERT INTO hasil_skrining(peserta_nik,indikator_id,sesi_posga_id,tanggal_skrining,sumber,nama_fasilitas,opsi_id,nilai_number,nilai_text,nilai_boolean,catatan,created_at,updated_at) VALUES(?,?,?,?,'posga',NULL,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
  const updScreen = db.prepare(`UPDATE hasil_skrining SET opsi_id=?,nilai_number=?,nilai_text=?,nilai_boolean=?,catatan=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`);
  const updScreenSession = db.prepare(`UPDATE hasil_skrining SET sesi_posga_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND sesi_posga_id IS NULL`);

  const tx = db.transaction(() => {
    for (const b of data.biodataAnak) {
      const old = c.qBioAnak.get(b.nik) as any;
      if (!old) {
        insBioAnak.run(b.nik,b.namaIbuKandung??null,b.nikIbuKandung??null,b.anakKe??null,b.imd===undefined?null:(b.imd?1:0),b.bblGram??null,b.pblCm??null);
        counts.bioAnak.insert++;
      } else {
        const st = c.inspectFill(old, b, c.bioAnakFields);
        if (st.conflict) fail(`Konflik biodata anak saat commit: ${b.nik}`);
        if (updateFillFields(db,"biodata_anak","peserta_nik",b.nik,old,b,c.bioAnakFields)) counts.bioAnak.update++; else counts.bioAnak.reuse++;
      }
    }

    for (const b of data.biodataDewasa) {
      const old = c.qBioDewasa.get(b.nik) as any;
      if (!old) {
        insBioDewasa.run(b.nik,b.namaPasangan??null,b.nikPasangan??null,b.jumlahAnak??null,b.kbYangDiikuti??null,b.alasanTidakBerKb??null,b.rpdHt===undefined?null:(b.rpdHt?1:0),b.rpdDm===undefined?null:(b.rpdDm?1:0));
        counts.bioDewasa.insert++;
      } else {
        const st = c.inspectFill(old, b, c.bioDewasaFields);
        if (st.conflict) fail(`Konflik biodata dewasa saat commit: ${b.nik}`);
        if (updateFillFields(db,"biodata_dewasa","peserta_nik",b.nik,old,b,c.bioDewasaFields)) counts.bioDewasa.update++; else counts.bioDewasa.reuse++;
      }
    }

    for (const ep of data.pregnancyEpisodes) {
      const exact = c.qPregExact.all(ep.nik, ep.tanggalMulai) as any[];
      let id: number;
      if (exact.length > 1) fail(`Episode kehamilan ganda: ${ep.key}`);
      if (exact.length === 1) {
        id = exact[0].id;
        const st = c.inspectFill(exact[0], ep, c.pregFields);
        if (st.conflict) fail(`Konflik episode kehamilan: ${ep.key}`);
        if (updateFillFields(db,"episode_kehamilan","id",id,exact[0],ep,c.pregFields)) counts.pregnancy.update++; else counts.pregnancy.reuse++;
      } else {
        if (c.pregHasOverlap(ep)) fail(`Episode kehamilan overlap: ${ep.key}`);
        id = Number(insPreg.run(ep.nik,ep.tanggalMulai,ep.tanggalSelesai??null,ep.status,ep.bbSebelumHamilKg??null,ep.tbCm??null,ep.hpht??null,ep.hpl??null,ep.lilaAwalCm??null,ep.catatan??"Migrasi historis POSGA").lastInsertRowid);
        counts.pregnancy.insert++;
      }
      pregIds.set(ep.key, id);
    }

    for (const ep of data.postpartumEpisodes) {
      const desiredPreg = ep.pregnancyKey ? pregIds.get(ep.pregnancyKey) ?? null : null;
      const exact = c.qNifasExact.all(ep.nik, ep.tanggalMulai) as any[];
      let id: number;
      if (exact.length > 1) fail(`Episode nifas ganda: ${ep.key}`);
      if (exact.length === 1) {
        id = exact[0].id;
        const st = c.inspectFill(exact[0], ep, c.nifasFields);
        if (st.conflict || (exact[0].episode_kehamilan_id && desiredPreg && exact[0].episode_kehamilan_id !== desiredPreg)) fail(`Konflik episode nifas: ${ep.key}`);
        let changed = updateFillFields(db,"episode_nifas","id",id,exact[0],ep,c.nifasFields);
        if (!exact[0].episode_kehamilan_id && desiredPreg) { updNifasPreg.run(desiredPreg,id); changed = true; }
        if (changed) counts.postpartum.update++; else counts.postpartum.reuse++;
      } else {
        if (c.nifasHasOverlap(ep)) fail(`Episode nifas overlap: ${ep.key}`);
        id = Number(insNifas.run(ep.nik,desiredPreg,ep.tanggalMulai,ep.tanggalSelesai??null,ep.tanggalMelahirkan??null,ep.jamBersalin??null,ep.caraPersalinan??null,ep.vitaminA===null||ep.vitaminA===undefined?null:(ep.vitaminA?1:0),ep.asiEksklusif===null||ep.asiEksklusif===undefined?null:(ep.asiEksklusif?1:0),ep.status,ep.catatan??"Migrasi historis POSGA").lastInsertRowid);
        counts.postpartum.insert++;
      }
      for (const x of ep.komplikasi ?? []) {
        const rows = c.qComp.all(id, x.kode) as any[];
        if (!rows.length) { insComp.run(id,x.kode,x.label); counts.complications.insert++; }
        else if (rows.length === 1 && rows[0].label === x.label) counts.complications.reuse++;
        else fail(`Konflik komplikasi ${ep.key}/${x.kode}`);
      }
      for (const x of ep.tindakan ?? []) {
        const rows = c.qAction.all(id, x.kode) as any[];
        if (!rows.length) { insAction.run(id,x.kode,x.label); counts.actions.insert++; }
        else if (rows.length === 1 && rows[0].label === x.label) counts.actions.reuse++;
        else fail(`Konflik tindakan ${ep.key}/${x.kode}`);
      }
    }

    for (const s of data.sessions) {
      const pid = c.posId.get(s.posyanduKey)!;
      let sr = c.qSession.get(pid, s.tanggalPosga) as any;
      let sessionId: number;
      if (sr) { sessionId = sr.id; counts.sessions.reuse++; }
      else { sessionId = Number(insSession.run(pid,s.tanggalPosga).lastInsertRowid); counts.sessions.insert++; }

      for (const p of s.participants) {
        let ps = c.qPS.get(sessionId, p.nik) as any;
        let psid: number;
        if (ps) {
          if (ps.kategori_saat_itu !== p.kategoriSaatItu || ps.sumber_kategori !== p.sumberKategori) {
            if (p.replaceIfCategory && ps.kategori_saat_itu === p.replaceIfCategory.kategoriSaatItu && ps.sumber_kategori === p.replaceIfCategory.sumberKategori) {
              updPS.run(p.kategoriSaatItu,p.sumberKategori,ps.id);
              psid = ps.id;
              counts.participantSessions.replaceSafe++;
            } else fail(`Konflik peserta-sesi: ${s.posyanduKey}|${s.tanggalPosga}|${p.nik}`);
          } else { psid = ps.id; counts.participantSessions.reuse++; }
        } else {
          psid = Number(insPS.run(sessionId,p.nik,p.kategoriSaatItu,p.sumberKategori).lastInsertRowid);
          counts.participantSessions.insert++;
        }
        psMap.set(`${s.posyanduKey}|${s.tanggalPosga}|${p.nik}`, { sessionId, participantSessionId: psid });
        if ((p.results ?? []).length) derivedSync.add(psid);

        for (const r of p.results ?? []) {
          const { ind, optionId } = c.validateValue(r.indicatorCode, r.value, "pemeriksaan");
          const old = c.qExam.get(psid, ind.id) as any;
          if (!old) {
            const v = c.columnsForValue(r.value, optionId);
            insExam.run(psid,ind.id,v.opsi,v.num,v.text,v.bool,v.date);
            counts.examinations.insert++;
          } else if (c.sameValueRow(old, r.value, optionId)) counts.examinations.reuse++;
          else if (r.replaceIfMatches) {
            const base = c.validateValue(r.indicatorCode, r.replaceIfMatches, "pemeriksaan");
            if (!c.sameValueRow(old, r.replaceIfMatches, base.optionId)) fail(`Konflik hasil pemeriksaan: ${s.posyanduKey}|${s.tanggalPosga}|${p.nik}|${r.indicatorCode}`);
            const v = c.columnsForValue(r.value, optionId);
            updExam.run(v.opsi,v.num,v.text,v.bool,v.date,old.id);
            counts.examinations.replaceSafe++;
          } else fail(`Konflik hasil pemeriksaan: ${s.posyanduKey}|${s.tanggalPosga}|${p.nik}|${r.indicatorCode}`);
        }

        for (const k of p.counseling ?? []) {
          const ind = c.indicators.get(k.indicatorCode);
          if (!ind || ind.kelompok !== "konseling" || ind.tipe_input !== "multiselect") fail(`Indikator konseling invalid: ${k.indicatorCode}`);
          const want = c.optionSet(k.indicatorCode, k.optionCodes ?? []);
          const rows = c.qCounsel.all(psid, ind.id) as any[];
          if (!rows.length) {
            const hid = Number(insCounsel.run(psid,ind.id).lastInsertRowid);
            for (const oid of want) insCounselOpt.run(hid,oid);
            counts.counseling.insert++;
          } else if (rows.length > 1) fail(`Hasil konseling ganda: ${s.posyanduKey}|${s.tanggalPosga}|${p.nik}|${k.indicatorCode}`);
          else {
            const got = c.currentCounselSet(rows);
            if (sameSet(got,want)) counts.counseling.reuse++;
            else if (k.replaceIfOptionCodes && sameSet(got,c.optionSet(k.indicatorCode,k.replaceIfOptionCodes))) {
              delCounselOpts.run(rows[0].id);
              for (const oid of want) insCounselOpt.run(rows[0].id,oid);
              counts.counseling.replaceSafe++;
            } else fail(`Konflik konseling: ${s.posyanduKey}|${s.tanggalPosga}|${p.nik}|${k.indicatorCode}`);
          }
        }
      }
    }

    for (const sc of data.screenings) {
      const { ind, optionId } = c.validateValue(sc.indicatorCode, sc.value, "skrining");
      const rows = c.qScreen.all(sc.nik, ind.id, sc.tanggalSkrining) as any[];
      const linked = psMap.get(`${sc.posyanduKey}|${sc.tanggalSkrining}|${sc.nik}`);
      let sessionId = linked?.sessionId ?? null;
      if (!sessionId) {
        const pid = c.posId.get(sc.posyanduKey)!;
        const sr = c.qSession.get(pid, sc.tanggalSkrining) as any;
        if (sr && c.qPS.get(sr.id,sc.nik)) sessionId = sr.id;
      }
      if (!rows.length) {
        const v = c.columnsForValue(sc.value, optionId);
        const note = sessionId ? null : "Migrasi historis; sesi asal tidak dapat ditautkan secara pasti";
        insScreen.run(sc.nik,ind.id,sessionId,sc.tanggalSkrining,v.opsi,v.num,v.text,v.bool,note);
        counts.screenings.insert++;
      } else if (rows.length > 1) fail(`Skrining ganda: ${sc.nik}|${sc.tanggalSkrining}|${sc.indicatorCode}`);
      else if (c.sameValueRow(rows[0],sc.value,optionId)) {
        if (rows[0].sesi_posga_id == null && sessionId) { updScreenSession.run(sessionId,rows[0].id); counts.screenings.linkUpgrade++; }
        counts.screenings.reuse++;
      } else if (sc.replaceIfMatches) {
        const base = c.validateValue(sc.indicatorCode, sc.replaceIfMatches, "skrining");
        if (!c.sameValueRow(rows[0],sc.replaceIfMatches,base.optionId)) fail(`Konflik skrining: ${sc.nik}|${sc.tanggalSkrining}|${sc.indicatorCode}`);
        const v = c.columnsForValue(sc.value, optionId);
        const note = sessionId ? null : "Migrasi historis; sesi asal tidak dapat ditautkan secara pasti";
        updScreen.run(v.opsi,v.num,v.text,v.bool,note,rows[0].id);
        if (rows[0].sesi_posga_id == null && sessionId) { updScreenSession.run(sessionId,rows[0].id); counts.screenings.linkUpgrade++; }
        counts.screenings.replaceSafe++;
      } else fail(`Konflik skrining: ${sc.nik}|${sc.tanggalSkrining}|${sc.indicatorCode}`);
    }
  });

  tx();
  db.close();

  console.log("\nRaw transaction selesai.");
  console.log(`Backup tersedia          : ${backupPath}`);
  console.table(counts);

  if (!SKIP_DERIVED && derivedSync.size) {
    process.env.POSGA_DATABASE_PATH = dbPath;
    const { sinkronkanDerivedIndicators } = await import("../lib/derived-indicator.service.js");
    let i = 0;
    console.log(`\nSinkron derived         : ${derivedSync.size} peserta-sesi`);
    for (const id of derivedSync) {
      await sinkronkanDerivedIndicators(id);
      i++;
      if (i % 250 === 0 || i === derivedSync.size) console.log(`  derived ${i}/${derivedSync.size}`);
    }
  } else if (SKIP_DERIVED) {
    console.log("Derived                  : DILEWATI (--skip-derived)");
  }

  return counts;
}

function verifyFinal(data: SeedData) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  db.pragma("foreign_keys = ON");
  const c = makeContext(db, data);
  const errors: string[] = [];

  const integrity = sqliteIntegrity(db);
  if (!integrity.ok) errors.push(`sqlite_integrity:${integrity.messages.slice(0,20).join(" | ")}`);

  const fk = db.pragma("foreign_key_check") as any[];
  if (fk.length) errors.push(`foreign_key_violation:${fk.length}`);

  const dbDup = {
    sessions: (db.prepare(`SELECT COUNT(*) n FROM (SELECT posyandu_id,tanggal_posga,COUNT(*) c FROM sesi_posga GROUP BY 1,2 HAVING c>1)`).get() as any).n,
    participantSessions: (db.prepare(`SELECT COUNT(*) n FROM (SELECT sesi_posga_id,peserta_nik,COUNT(*) c FROM peserta_sesi_posga GROUP BY 1,2 HAVING c>1)`).get() as any).n,
    examinations: (db.prepare(`SELECT COUNT(*) n FROM (SELECT peserta_sesi_id,indikator_id,COUNT(*) c FROM hasil_pemeriksaan GROUP BY 1,2 HAVING c>1)`).get() as any).n,
  };
  if (Object.values(dbDup).some((x) => Number(x) !== 0)) errors.push(`database_duplicate:${JSON.stringify(dbDup)}`);

  for (const b of data.biodataAnak) {
    const old = c.qBioAnak.get(b.nik) as any;
    if (!old) { errors.push(`verify_biodata_anak_missing:${b.nik}`); continue; }
    for (const [src,col] of Object.entries(c.bioAnakFields)) if (b[src] !== undefined && b[src] !== null && !eqNullable(old[col as string],normalizeDb(b[src]))) errors.push(`verify_biodata_anak_value:${b.nik}:${src}`);
  }
  for (const b of data.biodataDewasa) {
    const old = c.qBioDewasa.get(b.nik) as any;
    if (!old) { errors.push(`verify_biodata_dewasa_missing:${b.nik}`); continue; }
    for (const [src,col] of Object.entries(c.bioDewasaFields)) if (b[src] !== undefined && b[src] !== null && !eqNullable(old[col as string],normalizeDb(b[src]))) errors.push(`verify_biodata_dewasa_value:${b.nik}:${src}`);
  }

  const pregId = new Map<string,number>();
  for (const ep of data.pregnancyEpisodes) {
    const rows = c.qPregExact.all(ep.nik,ep.tanggalMulai) as any[];
    if (rows.length !== 1) { errors.push(`verify_pregnancy_count:${ep.key}:${rows.length}`); continue; }
    pregId.set(ep.key,rows[0].id);
    for (const [src,col] of Object.entries(c.pregFields)) if (ep[src] !== undefined && ep[src] !== null && !eqNullable(rows[0][col as string],normalizeDb(ep[src]))) errors.push(`verify_pregnancy_value:${ep.key}:${src}`);
  }
  for (const ep of data.postpartumEpisodes) {
    const rows = c.qNifasExact.all(ep.nik,ep.tanggalMulai) as any[];
    if (rows.length !== 1) { errors.push(`verify_postpartum_count:${ep.key}:${rows.length}`); continue; }
    if (ep.pregnancyKey && rows[0].episode_kehamilan_id !== pregId.get(ep.pregnancyKey)) errors.push(`verify_postpartum_pregnancy_link:${ep.key}`);
    for (const [src,col] of Object.entries(c.nifasFields)) if (ep[src] !== undefined && ep[src] !== null && !eqNullable(rows[0][col as string],normalizeDb(ep[src]))) errors.push(`verify_postpartum_value:${ep.key}:${src}`);
    for (const x of ep.komplikasi ?? []) {
      const rr = c.qComp.all(rows[0].id,x.kode) as any[];
      if (rr.length !== 1 || rr[0].label !== x.label) errors.push(`verify_complication:${ep.key}:${x.kode}`);
    }
    for (const x of ep.tindakan ?? []) {
      const rr = c.qAction.all(rows[0].id,x.kode) as any[];
      if (rr.length !== 1 || rr[0].label !== x.label) errors.push(`verify_action:${ep.key}:${x.kode}`);
    }
  }

  let verifiedParticipantSessions = 0;
  let verifiedRawExaminations = 0;
  let verifiedCounseling = 0;
  for (const s of data.sessions) {
    const pid = c.posId.get(s.posyanduKey)!;
    const sr = c.qSession.get(pid,s.tanggalPosga) as any;
    if (!sr) { errors.push(`verify_session_missing:${s.posyanduKey}:${s.tanggalPosga}`); continue; }
    for (const p of s.participants) {
      const ps = c.qPS.get(sr.id,p.nik) as any;
      if (!ps) { errors.push(`verify_participant_session_missing:${s.posyanduKey}:${s.tanggalPosga}:${p.nik}`); continue; }
      verifiedParticipantSessions++;
      if (ps.kategori_saat_itu !== p.kategoriSaatItu || ps.sumber_kategori !== p.sumberKategori) errors.push(`verify_participant_session_category:${s.posyanduKey}:${s.tanggalPosga}:${p.nik}`);
      for (const r of p.results ?? []) {
        const { ind, optionId } = c.validateValue(r.indicatorCode,r.value,"pemeriksaan");
        const old = c.qExam.get(ps.id,ind.id) as any;
        if (!old || !c.sameValueRow(old,r.value,optionId)) errors.push(`verify_exam:${s.posyanduKey}:${s.tanggalPosga}:${p.nik}:${r.indicatorCode}`);
        else verifiedRawExaminations++;
      }
      for (const k of p.counseling ?? []) {
        const ind = c.indicators.get(k.indicatorCode);
        const rows = ind ? c.qCounsel.all(ps.id,ind.id) as any[] : [];
        if (rows.length !== 1 || !sameSet(c.currentCounselSet(rows),c.optionSet(k.indicatorCode,k.optionCodes ?? []))) errors.push(`verify_counsel:${s.posyanduKey}:${s.tanggalPosga}:${p.nik}:${k.indicatorCode}`);
        else verifiedCounseling++;
      }
    }
  }

  let verifiedScreenings = 0;
  for (const sc of data.screenings) {
    const { ind, optionId } = c.validateValue(sc.indicatorCode,sc.value,"skrining");
    const rows = c.qScreen.all(sc.nik,ind.id,sc.tanggalSkrining) as any[];
    if (rows.length !== 1 || !c.sameValueRow(rows[0],sc.value,optionId)) errors.push(`verify_screen:${sc.nik}:${sc.tanggalSkrining}:${sc.indicatorCode}`);
    else verifiedScreenings++;
  }

  const totals = {
    sessions: (db.prepare(`SELECT COUNT(*) n FROM sesi_posga`).get() as any).n,
    participantSessions: (db.prepare(`SELECT COUNT(*) n FROM peserta_sesi_posga`).get() as any).n,
    examinationsAll: (db.prepare(`SELECT COUNT(*) n FROM hasil_pemeriksaan`).get() as any).n,
    examinationsBase: (db.prepare(`SELECT COUNT(*) n FROM hasil_pemeriksaan hp JOIN indikator i ON i.id=hp.indikator_id WHERE i.derived=0`).get() as any).n,
    examinationsDerived: (db.prepare(`SELECT COUNT(*) n FROM hasil_pemeriksaan hp JOIN indikator i ON i.id=hp.indikator_id WHERE i.derived=1`).get() as any).n,
    counseling: (db.prepare(`SELECT COUNT(*) n FROM hasil_konseling`).get() as any).n,
    screening: (db.prepare(`SELECT COUNT(*) n FROM hasil_skrining`).get() as any).n,
    biodataAnak: (db.prepare(`SELECT COUNT(*) n FROM biodata_anak`).get() as any).n,
    biodataDewasa: (db.prepare(`SELECT COUNT(*) n FROM biodata_dewasa`).get() as any).n,
    pregnancy: (db.prepare(`SELECT COUNT(*) n FROM episode_kehamilan`).get() as any).n,
    postpartum: (db.prepare(`SELECT COUNT(*) n FROM episode_nifas`).get() as any).n,
    complications: (db.prepare(`SELECT COUNT(*) n FROM komplikasi_persalinan`).get() as any).n,
  };
  db.close();

  const result = {
    ok: errors.length === 0,
    errors: errors.slice(0,200),
    errorCount: errors.length,
    foreignKeyViolations: fk.length,
    duplicates: dbDup,
    verified: {
      sessions: data.sessions.length,
      participantSessions: verifiedParticipantSessions,
      rawExaminations: verifiedRawExaminations,
      counseling: verifiedCounseling,
      screenings: verifiedScreenings,
      biodataAnak: data.biodataAnak.length,
      biodataDewasa: data.biodataDewasa.length,
      pregnancyEpisodes: data.pregnancyEpisodes.length,
      postpartumEpisodes: data.postpartumEpisodes.length,
    },
    totals,
  };
  return result;
}

async function main() {
  const data = loadJson<SeedData>(seedPath);
  loadJson(reportPath); // keberadaan report final wajib, meskipun commit hanya memakai accepted seed.
  if (!fs.existsSync(dbPath)) fail(`Database tidak ditemukan: ${dbPath}`);

  if (VERIFY_ONLY) {
    const verification = verifyFinal(data);
    console.log("=== VERIFIKASI FINAL HISTORIS POSGA ===");
    console.log(`Status                  : ${verification.ok ? "LOLOS" : "GAGAL"}`);
    console.log(`Error                   : ${verification.errorCount}`);
    console.log(`Foreign key             : ${verification.foreignKeyViolations}`);
    console.log("Total database          :", verification.totals);
    if (verification.errorCount) console.log("Contoh error            :", verification.errors.slice(0,20));
    if (JSON_OUTPUT) console.log(JSON.stringify(verification,null,2));
    if (!verification.ok) process.exitCode = 2;
    return;
  }

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  const integrity = sqliteIntegrity(db);
  if (!integrity.ok) {
    console.error("\nDATABASE SQLITE TIDAK SEHAT.");
    console.error("Integrity error:", integrity.messages.slice(0, 20));
    db.close();
    fail("PRAGMA integrity_check gagal. Database tidak boleh dipakai untuk migrasi sebelum direstore dari backup sehat.");
  }
  db.pragma("journal_mode = WAL");
  const plan = preflight(db,data);
  printPlan(data,plan);

  if (JSON_OUTPUT) console.log(JSON.stringify(plan,null,2));
  if (!plan.ready) {
    db.close();
    if (COMMIT) fail("Preflight gagal. Database tidak diubah.");
    process.exitCode = 2;
    return;
  }
  if (!COMMIT) {
    console.log("\nDATABASE BELUM DIUBAH.");
    console.log("Untuk commit final jalankan: .\\commit-historis-posga.ps1 -Commit");
    db.close();
    return;
  }

  const backupDir = path.join(root,"data","backups");
  fs.mkdirSync(backupDir,{recursive:true});
  const runStamp = stamp();
  const backupPath = path.join(backupDir,`posga-before-historis-final-${runStamp}.db`);
  await db.backup(backupPath);
  fs.writeFileSync(path.join(backupDir,"LAST-HISTORIS-BACKUP.txt"),backupPath,"utf8");
  console.log(`\nBackup                   : ${backupPath}`);

  try {
    const commitCounts = await commitFinal(db,data,backupPath);
    const verification = verifyFinal(data);
    const resultPath = path.join(backupDir,`historis-final-result-${runStamp}.json`);
    fs.writeFileSync(resultPath,JSON.stringify({backupPath,commitCounts,verification},null,2),"utf8");
    console.log("\n--- VERIFIKASI PASCA-COMMIT ---");
    console.log(`Raw peserta-sesi        : ${verification.verified.participantSessions}/${data.meta.counts.participantSessions}`);
    console.log(`Raw pemeriksaan         : ${verification.verified.rawExaminations}/${data.meta.counts.examinationResults}`);
    console.log(`Skrining                : ${verification.verified.screenings}/${data.meta.counts.screenings}`);
    console.log(`Foreign key             : ${verification.foreignKeyViolations}`);
    console.log(`Derived tersimpan       : ${verification.totals.examinationsDerived}`);
    console.log(`Result log              : ${resultPath}`);
    console.log(`STATUS FINAL            : ${verification.ok ? "BERHASIL" : "GAGAL VERIFIKASI"}`);
    if (!verification.ok) {
      console.log(`Backup untuk restore    : ${backupPath}`);
      console.log("Database mentah sudah ditulis. Jangan lanjut operasional sampai hasil verifikasi diperiksa atau backup direstore.");
      process.exitCode = 3;
    }
  } catch (error) {
    console.error("\nCOMMIT FINAL GAGAL:",error);
    console.error(`Backup aman tersedia    : ${backupPath}`);
    console.error("Jika kegagalan terjadi setelah raw transaction selesai, restore backup setelah aplikasi/server POSGA dihentikan.");
    process.exitCode = 4;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
