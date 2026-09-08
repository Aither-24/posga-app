import * as XLSX from "xlsx";
import path from "node:path";

const filePath = path.resolve("data", "posga.xlsx");

const workbook = XLSX.readFile(filePath);

console.log("=== DAFTAR SHEET ===");

for (const sheetName of workbook.SheetNames) {
  console.log(`\nSheet: ${sheetName}`);

  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    console.log("Sheet tidak dapat dibaca.");
    continue;
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
  });

  console.log("Jumlah baris:", rows.length);

  console.log("Preview 5 baris pertama:");

  console.dir(rows.slice(0, 5), {
    depth: null,
  });
}