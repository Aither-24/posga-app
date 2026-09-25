import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const root = process.cwd();
const dbPath = path.resolve(process.env.POSGA_DB_PATH ?? path.join(root, 'data', 'posga.db'));
const finalSeedPath = path.resolve(process.env.POSGA_HISTORIS_FINAL_FILE ?? path.join(root, 'seed-historis-posga-final.json'));
const reportPath = path.resolve(process.env.POSGA_HISTORIS_FINAL_REPORT ?? path.join(root, 'seed-historis-posga-final-report.json'));

for (const file of [dbPath, finalSeedPath, reportPath]) {
  if (!fs.existsSync(file)) throw new Error(`File wajib tidak ditemukan: ${file}`);
}

const data = JSON.parse(fs.readFileSync(finalSeedPath, 'utf8'));
const review = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
db.pragma('foreign_keys = ON');

const posByKey = new Map();
for (const p of data.posyandu) {
  const row = db.prepare(`SELECT p.id FROM posyandu p JOIN lokasi l ON l.id=p.lokasi_id WHERE p.nama=? AND l.nama=? LIMIT 1`).get(p.nama, p.lokasi);
  if (!row) throw new Error(`Posyandu tidak ditemukan: ${p.key} (${p.nama} / ${p.lokasi})`);
  posByKey.set(p.key, row.id);
}

const indicator = new Map();
for (const r of db.prepare(`SELECT id,kode,kelompok,tipe_input,derived,aktif FROM indikator`).all()) indicator.set(r.kode, r);
const optionId = new Map();
for (const r of db.prepare(`SELECT i.kode indikator_kode,o.kode opsi_kode,o.id FROM opsi_indikator o JOIN indikator i ON i.id=o.indikator_id WHERE o.aktif=1`).all()) {
  optionId.set(`${r.indikator_kode}::${r.opsi_kode}`, r.id);
}

const qPeserta = db.prepare(`SELECT nik FROM peserta WHERE nik=? LIMIT 1`);
const qMember = db.prepare(`SELECT posyandu_id FROM peserta_posyandu WHERE peserta_nik=? AND aktif=1 AND tanggal_selesai IS NULL LIMIT 1`);
const qSession = db.prepare(`SELECT id,status FROM sesi_posga WHERE posyandu_id=? AND tanggal_posga=? LIMIT 1`);
const qPS = db.prepare(`SELECT id,kategori_saat_itu,sumber_kategori,status_pemeriksaan FROM peserta_sesi_posga WHERE sesi_posga_id=? AND peserta_nik=? LIMIT 1`);
const qExam = db.prepare(`SELECT * FROM hasil_pemeriksaan WHERE peserta_sesi_id=? AND indikator_id=? LIMIT 1`);
const qCounsel = db.prepare(`SELECT id,opsi_id FROM hasil_konseling WHERE peserta_sesi_id=? AND indikator_id=? ORDER BY id`);
const qCounselOpts = db.prepare(`SELECT opsi_id FROM hasil_konseling_opsi WHERE hasil_konseling_id=?`);
const qScreen = db.prepare(`SELECT * FROM hasil_skrining WHERE peserta_nik=? AND indikator_id=? AND tanggal_skrining=? AND sumber='posga' ORDER BY id`);
const qBioAnak = db.prepare(`SELECT * FROM biodata_anak WHERE peserta_nik=? LIMIT 1`);
const qBioDewasa = db.prepare(`SELECT * FROM biodata_dewasa WHERE peserta_nik=? LIMIT 1`);
const qPreg = db.prepare(`SELECT * FROM episode_kehamilan WHERE peserta_nik=? AND tanggal_mulai=? ORDER BY id`);
const qNifas = db.prepare(`SELECT en.*, ek.tanggal_mulai AS pregnancy_start FROM episode_nifas en LEFT JOIN episode_kehamilan ek ON ek.id=en.episode_kehamilan_id WHERE en.peserta_nik=? AND en.tanggal_mulai=? ORDER BY en.id`);

const counts = {
  sessions: { insert:0, reuse:0, conflict:0 },
  participantSessions: { insert:0, reuse:0, replaceSafe:0, conflict:0 },
  examinations: { insert:0, reuse:0, replaceSafe:0, conflict:0 },
  counseling: { insert:0, reuse:0, conflict:0 },
  screenings: { insert:0, reuse:0, conflict:0 },
  biodataAnak: { insert:0, update:0, reuse:0, conflict:0 },
  biodataDewasa: { insert:0, update:0, reuse:0, conflict:0 },
  pregnancyEpisodes: { insert:0, update:0, reuse:0, conflict:0 },
  postpartumEpisodes: { insert:0, update:0, reuse:0, conflict:0 },
};
const errors = [];

function typedInfo(code, value, group) {
  const ind = indicator.get(code);
  if (!ind) { errors.push(`indikator_missing:${code}`); return null; }
  if (ind.aktif !== 1 || ind.kelompok !== group) { errors.push(`indikator_invalid:${code}:${group}`); return null; }
  if (group === 'pemeriksaan' && ind.derived === 1) errors.push(`derived_manual:${code}`);
  if (ind.tipe_input !== value.type) errors.push(`type_mismatch:${code}:${value.type}->${ind.tipe_input}`);
  let oid = null;
  if (value.type === 'select') {
    oid = optionId.get(`${code}::${value.optionCode}`) ?? null;
    if (!oid) errors.push(`option_missing:${code}:${value.optionCode}`);
  }
  return { ind, oid };
}

function sameTypedRow(row, value, oid) {
  if (!row) return false;
  if ((row.opsi_id ?? null) !== (oid ?? null)) return false;
  if (value.type === 'number') return Number(row.nilai_number) === Number(value.value) && row.nilai_text == null && row.nilai_boolean == null;
  if (value.type === 'text') return String(row.nilai_text ?? '') === String(value.value ?? '') && row.nilai_number == null && row.nilai_boolean == null;
  if (value.type === 'boolean') return Number(row.nilai_boolean) === (value.value ? 1 : 0) && row.nilai_number == null && row.nilai_text == null;
  if (value.type === 'date') return String(row.nilai_date ?? '') === String(value.value ?? '');
  if (value.type === 'select') return (row.opsi_id ?? null) === oid;
  return false;
}

function sameSet(a,b){ return a.size===b.size && [...a].every(x=>b.has(x)); }
function normalizeDb(v){ return typeof v === 'boolean' ? (v ? 1 : 0) : v; }
function inspectFill(old, obj, fields) {
  let changed=false, conflict=false;
  for (const [src,col] of Object.entries(fields)) {
    const nv=obj[src]; if (nv===undefined || nv===null) continue;
    const ov=old[col];
    if (ov===null || ov===undefined || ov==='') changed=true;
    else if (String(ov) !== String(normalizeDb(nv))) conflict=true;
  }
  return {changed, conflict};
}

// Baseline override fingerprints are embedded in the final seed so Tahap 6 is standalone.
// They are used only to recognize the 9 participant-session and 4 examination replacements
// that Stage 5 intentionally overrides from the Tahap 4 baseline.
const embeddedBaseline = data.meta?.standaloneReconcileBaseline ?? { participantSessions: [], examinations: [] };
const stage4PS = new Map((embeddedBaseline.participantSessions ?? []).map(x => [x.key, { kategoriSaatItu:x.kategoriSaatItu, sumberKategori:x.sumberKategori }]));
const stage4Exam = new Map((embeddedBaseline.examinations ?? []).map(x => [x.key, x.value]));
if (stage4PS.size !== 9 || stage4Exam.size !== 4) {
  errors.push(`standalone_baseline_invalid:ps=${stage4PS.size}:exam=${stage4Exam.size}`);
}

const targetPS = new Map();
for (const s of data.sessions) {
  const pid = posByKey.get(s.posyanduKey);
  const sr = qSession.get(pid, s.tanggalPosga);
  if (sr) counts.sessions.reuse++; else counts.sessions.insert++;
  for (const p of s.participants) {
    const pk=`${s.posyanduKey}|${s.tanggalPosga}|${p.nik}`;
    targetPS.set(pk, p);
    if (!qPeserta.get(p.nik)) errors.push(`participant_missing:${p.nik}`);
    const mem=qMember.get(p.nik);
    if (!mem || mem.posyandu_id!==pid) errors.push(`membership_mismatch:${p.nik}:${s.posyanduKey}`);
    if (!sr) {
      counts.participantSessions.insert++;
      counts.examinations.insert += (p.results ?? []).length;
      counts.counseling.insert += (p.counseling ?? []).length;
      continue;
    }
    const ps=qPS.get(sr.id,p.nik);
    if (!ps) {
      counts.participantSessions.insert++;
      counts.examinations.insert += (p.results ?? []).length;
      counts.counseling.insert += (p.counseling ?? []).length;
      continue;
    }
    if (ps.kategori_saat_itu!==p.kategoriSaatItu || ps.sumber_kategori!==p.sumberKategori) {
      const baseline=stage4PS.get(pk);
      if (baseline && ps.kategori_saat_itu===baseline.kategoriSaatItu && ps.sumber_kategori===baseline.sumberKategori && p.sumberKategori!=='usia') counts.participantSessions.replaceSafe++;
      else { counts.participantSessions.conflict++; continue; }
    } else counts.participantSessions.reuse++;

    for (const r of p.results ?? []) {
      const ti=typedInfo(r.indicatorCode,r.value,'pemeriksaan'); if(!ti) continue;
      const old=qExam.get(ps.id,ti.ind.id);
      if (!old) counts.examinations.insert++;
      else if (sameTypedRow(old,r.value,ti.oid)) counts.examinations.reuse++;
      else {
        const base=stage4Exam.get(`${pk}|${r.indicatorCode}`);
        if (base) {
          const binfo=typedInfo(r.indicatorCode,base,'pemeriksaan');
          if (binfo && sameTypedRow(old,base,binfo.oid) && p.sumberKategori!=='usia') counts.examinations.replaceSafe++;
          else counts.examinations.conflict++;
        } else counts.examinations.conflict++;
      }
    }
    for (const c of p.counseling ?? []) {
      const ind=indicator.get(c.indicatorCode);
      if (!ind || ind.kelompok!=='konseling' || ind.tipe_input!=='multiselect') { errors.push(`counsel_indicator:${c.indicatorCode}`); continue; }
      const want=new Set();
      for (const oc of c.optionCodes ?? []) {
        const oid=optionId.get(`${c.indicatorCode}::${oc}`);
        if (!oid) errors.push(`counsel_option:${c.indicatorCode}:${oc}`); else want.add(oid);
      }
      const rows=qCounsel.all(ps.id,ind.id);
      if (rows.length===0) counts.counseling.insert++;
      else if (rows.length>1) counts.counseling.conflict++;
      else {
        const got=new Set(); if(rows[0].opsi_id) got.add(rows[0].opsi_id);
        for (const x of qCounselOpts.all(rows[0].id)) got.add(x.opsi_id);
        if (sameSet(got,want)) counts.counseling.reuse++; else counts.counseling.conflict++;
      }
    }
  }
}

for (const sc of data.screenings) {
  const ti=typedInfo(sc.indicatorCode,sc.value,'skrining'); if(!ti) continue;
  if (!qPeserta.get(sc.nik)) errors.push(`screen_participant_missing:${sc.nik}`);
  const rows=qScreen.all(sc.nik,ti.ind.id,sc.tanggalSkrining);
  if (rows.length===0) counts.screenings.insert++;
  else if (rows.length>1) counts.screenings.conflict++;
  else if (sameTypedRow(rows[0],sc.value,ti.oid)) counts.screenings.reuse++;
  else counts.screenings.conflict++;
}

const bioAnakFields={namaIbuKandung:'nama_ibu_kandung',nikIbuKandung:'nik_ibu_kandung',anakKe:'anak_ke',imd:'imd',bblGram:'bbl_gram',pblCm:'pbl_cm'};
for (const b of data.biodataAnak) {
  const old=qBioAnak.get(b.nik);
  if (!old) counts.biodataAnak.insert++;
  else { const st=inspectFill(old,b,bioAnakFields); if(st.conflict)counts.biodataAnak.conflict++; else if(st.changed)counts.biodataAnak.update++; else counts.biodataAnak.reuse++; }
}
const bioDewasaFields={namaPasangan:'nama_pasangan',nikPasangan:'nik_pasangan',jumlahAnak:'jumlah_anak',kbYangDiikuti:'kb_yang_diikuti',alasanTidakBerKb:'alasan_tidak_ber_kb',rpdHt:'rpd_ht',rpdDm:'rpd_dm'};
for (const b of data.biodataDewasa) {
  const old=qBioDewasa.get(b.nik);
  if (!old) counts.biodataDewasa.insert++;
  else { const st=inspectFill(old,b,bioDewasaFields); if(st.conflict)counts.biodataDewasa.conflict++; else if(st.changed)counts.biodataDewasa.update++; else counts.biodataDewasa.reuse++; }
}

const pregFields={tanggalSelesai:'tanggal_selesai',status:'status',bbSebelumHamilKg:'bb_sebelum_hamil_kg',tbCm:'tb_cm',hpht:'hpht',hpl:'hpl',lilaAwalCm:'lila_awal_cm'};
for (const ep of data.pregnancyEpisodes) {
  const rows=qPreg.all(ep.nik,ep.tanggalMulai);
  if(rows.length===0) counts.pregnancyEpisodes.insert++;
  else if(rows.length>1) counts.pregnancyEpisodes.conflict++;
  else { const st=inspectFill(rows[0],ep,pregFields); if(st.conflict)counts.pregnancyEpisodes.conflict++; else if(st.changed)counts.pregnancyEpisodes.update++; else counts.pregnancyEpisodes.reuse++; }
}
const nifasFields={tanggalSelesai:'tanggal_selesai',tanggalMelahirkan:'tanggal_melahirkan',jamBersalin:'jam_bersalin',caraPersalinan:'cara_persalinan',vitaminA:'vitamin_a',asiEksklusif:'asi_eksklusif',status:'status'};
for (const ep of data.postpartumEpisodes) {
  const rows=qNifas.all(ep.nik,ep.tanggalMulai);
  if(rows.length===0) counts.postpartumEpisodes.insert++;
  else if(rows.length>1) counts.postpartumEpisodes.conflict++;
  else { const st=inspectFill(rows[0],ep,nifasFields); if(st.conflict)counts.postpartumEpisodes.conflict++; else if(st.changed)counts.postpartumEpisodes.update++; else counts.postpartumEpisodes.reuse++; }
}

const duplicateSeed = {
  sessions: data.sessions.length - new Set(data.sessions.map(s=>`${s.posyanduKey}|${s.tanggalPosga}`)).size,
  participantSessions: data.meta.counts.participantSessions - new Set(data.sessions.flatMap(s=>s.participants.map(p=>`${s.posyanduKey}|${s.tanggalPosga}|${p.nik}`))).size,
  examinations: data.meta.counts.examinationResults - new Set(data.sessions.flatMap(s=>s.participants.flatMap(p=>(p.results??[]).map(r=>`${s.posyanduKey}|${s.tanggalPosga}|${p.nik}|${r.indicatorCode}`)))).size,
  screenings: data.screenings.length - new Set(data.screenings.map(x=>`${x.nik}|${x.tanggalSkrining}|${x.indicatorCode}`)).size,
};
const fk=db.pragma('foreign_key_check');
const dbDuplicates={
  sessions: db.prepare(`SELECT COUNT(*) n FROM (SELECT posyandu_id,tanggal_posga,COUNT(*) c FROM sesi_posga GROUP BY 1,2 HAVING c>1)`).get().n,
  participantSessions: db.prepare(`SELECT COUNT(*) n FROM (SELECT sesi_posga_id,peserta_nik,COUNT(*) c FROM peserta_sesi_posga GROUP BY 1,2 HAVING c>1)`).get().n,
  examinations: db.prepare(`SELECT COUNT(*) n FROM (SELECT peserta_sesi_id,indikator_id,COUNT(*) c FROM hasil_pemeriksaan GROUP BY 1,2 HAVING c>1)`).get().n,
};

db.close();
const conflictTotal=Object.values(counts).reduce((n,x)=>n+(x.conflict??0),0);
const output={
  mode:'READ_ONLY_GLOBAL_DRY_RUN', database:dbPath, seed:finalSeedPath,
  targetCounts:data.meta.counts,
  plan:counts,
  seedDuplicates:duplicateSeed,
  currentDatabaseDuplicates:dbDuplicates,
  foreignKeyViolationsCurrent:fk.length,
  review:review.meta,
  staticErrors:errors,
  readyForStage7: conflictTotal===0 && errors.length===0 && Object.values(duplicateSeed).every(x=>x===0) && fk.length===0,
};
console.log('=== REKONSILIASI HISTORIS POSGA — TAHAP 6 ===');
console.log(`Database                : ${dbPath}`);
console.log(`Seed final              : ${finalSeedPath}`);
console.log(`Target sesi             : ${data.meta.counts.sessions}`);
console.log(`Target peserta-sesi     : ${data.meta.counts.participantSessions}`);
console.log(`Target pemeriksaan dasar: ${data.meta.counts.examinationResults}`);
console.log(`Review event            : ${review.meta.rawEvents} (${review.meta.open_review ?? review.meta.statusCounts?.open_review ?? 0} open)`);
console.log('\n--- RENCANA TERHADAP DATABASE SAAT INI ---');
console.table(counts);
console.log('\nSeed duplicate          :', duplicateSeed);
console.log('DB duplicate            :', dbDuplicates);
console.log(`Foreign key saat ini    : ${fk.length}`);
console.log(`Static error            : ${errors.length}`);
console.log(`READY TAHAP 7           : ${output.readyForStage7 ? 'YA' : 'TIDAK'}`);
if (process.argv.includes('--json')) console.log(JSON.stringify(output,null,2));
if (!output.readyForStage7) process.exitCode=2;
