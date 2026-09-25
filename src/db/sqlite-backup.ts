// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const args = process.argv.slice(2);
function arg(name: string) { const i=args.indexOf(name); return i>=0 ? args[i+1] : undefined; }
const source = path.resolve(arg("--source") ?? "data/posga.db");
const dest = path.resolve(arg("--dest") ?? (()=>{ throw new Error("--dest wajib"); })());
if (!fs.existsSync(source)) throw new Error(`Source tidak ditemukan: ${source}`);
fs.mkdirSync(path.dirname(dest), { recursive: true });
if (fs.existsSync(dest)) fs.rmSync(dest, { force: true });
const db = new Database(source, { readonly: true, fileMustExist: true });
const rows = db.pragma("integrity_check") as any[];
const msgs = rows.map((r)=>String(Object.values(r)[0]??""));
if (!(msgs.length===1 && msgs[0].toLowerCase()==="ok")) { db.close(); throw new Error(`Source corrupt: ${msgs.slice(0,10).join(" | ")}`); }
await db.backup(dest);
db.close();
const out = new Database(dest, { readonly: true, fileMustExist: true });
const check = (out.pragma("integrity_check") as any[]).map((r)=>String(Object.values(r)[0]??""));
out.close();
if (!(check.length===1 && check[0].toLowerCase()==="ok")) throw new Error(`Backup hasil tidak sehat: ${check.slice(0,10).join(" | ")}`);
console.log(dest);
