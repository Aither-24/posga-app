const version = process.versions.node;

const major = Number(
  version.split(".")[0],
);

if (major !== 24) {
  console.error("");
  console.error("========================================");
  console.error("VERSI NODE.JS TIDAK SESUAI");
  console.error("========================================");
  console.error(`Node yang digunakan : ${version}`);
  console.error("Node yang dibutuhkan: Node.js 24 LTS");
  console.error("");
  console.error("Gunakan Node.js 24 lalu jalankan kembali:");
  console.error("npm ci");
  console.error("========================================");
  console.error("");

  process.exit(1);
}

console.log(
  `Node.js ${version} sesuai untuk POSGA.`,
);
