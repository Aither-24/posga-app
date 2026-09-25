// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const args = process.argv.slice(2);
function arg(name: string) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const dbPath = path.resolve(arg("--db") ?? "data/posga.db");
const json = args.includes("--json");
const requireOk = args.includes("--require-ok");

const result: any = { path: dbPath, exists: fs.existsSync(dbPath), integrityOk: false, integrity: [], foreignKeyViolations: null, counts: {} };
if (!result.exists) {
  if (json) console.log(JSON.stringify(result)); else console.log(`MISSING  ${dbPath}`);
  process.exitCode = 2;
} else {
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    try {
      const rows = db.pragma("integrity_check") as any[];
      result.integrity = rows.map((r) => String(Object.values(r)[0] ?? ""));
      result.integrityOk = result.integrity.length === 1 && result.integrity[0].toLowerCase() === "ok";
      const fk = db.pragma("foreign_key_check") as any[];
      result.foreignKeyViolations = fk.length;
      for (const t of ["lokasi","posyandu","peserta","peserta_posyandu","sesi_posga","peserta_sesi_posga","hasil_pemeriksaan","hasil_skrining","episode_kehamilan","episode_nifas"]) {
        try { result.counts[t] = (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as any).n; }
        catch { result.counts[t] = null; }
      }
    } finally { db.close(); }
  } catch (error) {
    result.error = String(error);
  }
  if (json) console.log(JSON.stringify(result));
  else {
    console.log(`${result.integrityOk ? "OK     " : "CORRUPT"} ${dbPath}`);
    console.log(`  integrity : ${result.integrity.slice(0,5).join(" | ") || result.error || "unknown"}`);
    console.log(`  FK        : ${result.foreignKeyViolations ?? "?"}`);
    console.log(`  counts    : peserta=${result.counts.peserta ?? "?"}, posyandu=${result.counts.posyandu ?? "?"}, sesi=${result.counts.sesi_posga ?? "?"}, peserta-sesi=${result.counts.peserta_sesi_posga ?? "?"}, pemeriksaan=${result.counts.hasil_pemeriksaan ?? "?"}`);
  }
  if (requireOk && (!result.integrityOk || Number(result.foreignKeyViolations ?? 1) !== 0)) process.exitCode = 3;
}
