# POSGA

POSGA adalah aplikasi web untuk digitalisasi pelayanan POSGA/Posyandu, mulai dari pendataan peserta, sesi pelayanan, pemeriksaan, skrining, konseling, reproduksi, riwayat, rekap, hingga export Excel.

## Fitur Utama

- Manajemen peserta berbasis NIK
- Kategori peserta otomatis berdasarkan usia
- Manajemen Lokasi dan Posyandu
- Sesi POSGA
- Pemeriksaan kesehatan
- Skrining dan konseling
- Derived clinical indicator
- Riwayat peserta
- Modul kehamilan dan nifas
- Rekap sesi
- Export Excel berdasarkan rentang tanggal
- Export Excel berdasarkan sesi terpilih
- Role Admin dan Petugas

## Teknologi

- Node.js dan TypeScript
- Express
- SQLite dan better-sqlite3
- Drizzle ORM
- Zod
- Tailwind CSS
- Alpine.js
- XLSX

## Menjalankan Project

1. npm install
2. npx tsx src/db/run-migrate.ts
3. npx tsx src/db/seed-indikator-posga.ts
4. npx tsx src/seed-demo.ts
5. npm run dev

## Catatan

Database lokal, data operasional, token, session, dan environment secret tidak disertakan dalam repository.

Project ini digunakan sebagai dokumentasi teknis dan portofolio pengembangan aplikasi.

## Author

**Aither-24**
