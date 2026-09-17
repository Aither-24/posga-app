# POSGA

POSGA adalah aplikasi web untuk digitalisasi pelayanan POSGA/Posyandu, mulai dari pendataan peserta, sesi pelayanan, pemeriksaan, skrining, konseling, reproduksi, riwayat, rekap, hingga export Excel.

## Fitur Utama

* Manajemen peserta berbasis NIK
* Kategori peserta otomatis berdasarkan usia
* Manajemen Lokasi dan Posyandu
* Sesi POSGA
* Pemeriksaan kesehatan
* Skrining dan konseling
* Derived clinical indicator
* Riwayat peserta
* Modul kehamilan dan nifas
* Rekap sesi
* Export Excel berdasarkan rentang tanggal
* Export Excel berdasarkan sesi terpilih
* Role Admin dan Petugas
* Audit trail perubahan data penting
* Pembatasan koreksi sesi selesai
* Rate limiting pada login
* Autentikasi berbasis HttpOnly session cookie

## Teknologi

* Node.js dan TypeScript
* Express
* SQLite dan better-sqlite3
* Drizzle ORM
* Zod
* Tailwind CSS
* Alpine.js
* XLSX

## Menjalankan Project

1. npm install
2. npm run build
3. npm run migrate
4. npm run seed:indikator
5. npm run seed:admin
6. npm start

Untuk development, aplikasi dapat dijalankan menggunakan `npm run dev`.

## Catatan

Database lokal, data operasional, password, session, dan environment secret tidak disertakan dalam repository.

Konfigurasi environment dapat mengacu pada `.env.example`. Deployment production menggunakan `NODE_ENV=production` dan HTTPS.

Project ini digunakan sebagai dokumentasi teknis dan portofolio pengembangan aplikasi.

## Author

**Aither-24**
