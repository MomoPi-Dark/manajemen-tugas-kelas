# Class Task Tracker API

Backend REST API untuk aplikasi Manajemen Tugas Kelas. Stack: Bun + TypeScript + Express + PostgreSQL.

## Menjalankan seluruh aplikasi dengan Docker Compose

1. Salin `.env.example` menjadi `.env` di folder `backend/`.
2. Isi secret JWT (minimal 32 karakter), kode pendaftaran guru, dan kredensial akun seeder dengan nilai lokal.
3. Dari root repository, ganti semua placeholder literal `<POSTGRES_PASSWORD>` di `docker-compose.yml` dengan password PostgreSQL yang sama. Gunakan karakter URL-safe (huruf dan angka).
4. Jalankan dari root repository:

   ```bash
   docker compose up --build
   ```

Compose membangun frontend dan API, menunggu PostgreSQL sehat, menjalankan migrasi serta seeder, lalu melayani web di `http://localhost:5173` dan API di `http://localhost:4000`. Cek `GET /api/health`.

Database tes belum dibuat otomatis. Setelah Compose berjalan, buat sekali dari root repository dengan `docker compose exec db createdb -U class_tracker class_tasks_test`. Untuk menghentikan container tanpa menghapus data, jalankan `docker compose down`. **Menambahkan `-v` menghapus volume dan seluruh data lokal.**

## Menjalankan tanpa Docker

1. Gunakan Bun dan PostgreSQL.
2. Buat dua database PostgreSQL lokal: `class_tasks` dan `class_tasks_test`, lalu buat role database yang sesuai.
3. Salin `.env.example` menjadi `.env` dan isi URL koneksi, secret JWT, kode pendaftaran guru, serta kredensial akun contoh lokal.
4. Dari folder `backend/`, jalankan:

   ```bash
   bun install
   bun run db:migrate
   bun run db:seed
   bun run dev
   ```

API berjalan di port `4000` secara default. Untuk produksi lokal, gunakan `bun run start`.

## Akun contoh

Seeder membaca akun contoh dari `SEED_TEACHER_EMAIL`, `SEED_TEACHER_PASSWORD`, `SEED_STUDENT_EMAIL`, dan `SEED_STUDENT_PASSWORD` di `.env`. Email contoh pada `.env.example` adalah `teacher@example.test` dan `student@example.test`; password diatur sendiri di `.env` dan tidak disimpan di repositori. Akun guru seeder memiliki kelas `Kelas Demo` dan tugas contoh.

Pendaftaran guru baru memerlukan `TEACHER_REGISTRATION_CODE` serta `className`; pendaftaran siswa memerlukan `classId`. Pendaftaran publik biasa membuat akun siswa. Daftar kelas dapat dibaca melalui `GET /api/classes`.

## Endpoint

Semua respons sukses memakai objek `data`; error memakai `{ "error": { "code", "message", "details?" } }`.

| Method | Endpoint                                            | Akses         | Fungsi                                                                                                                                                      |
| ------ | --------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health`                                       | Publik        | Pemeriksaan API dan koneksi database.                                                                                                                       |
| GET    | `/api/classes`                                      | Publik        | Daftar kelas untuk registrasi siswa.                                                                                                                        |
| GET    | `/api/classes/mine`                                 | Guru          | Daftar kelas milik guru yang sedang login, untuk form tugas.                                                                                                |
| POST   | `/api/auth/register`                                | Publik        | Registrasi siswa; registrasi guru memerlukan kode undangan dan nama kelas pertama.                                                                          |
| POST   | `/api/auth/login`                                   | Publik        | Login; mengembalikan token bearer.                                                                                                                          |
| GET    | `/api/auth/me`                                      | Login         | Profil akun saat ini.                                                                                                                                       |
| GET    | `/api/tasks?search=&status=pending&page=1&limit=10` | Login         | Daftar tugas sesuai peran/kelas, pencarian judul, filter status siswa, dan paginasi. `status` dapat bernilai `pending` atau `completed`; batas `limit` 100. |
| POST   | `/api/tasks`                                        | Guru          | Membuat tugas (`title`, `description`, `dueAt`, `classId`) pada kelas milik guru.                                                                           |
| PATCH  | `/api/tasks/:id`                                    | Guru pemilik  | Mengubah satu atau beberapa field tugas.                                                                                                                    |
| DELETE | `/api/tasks/:id`                                    | Guru pemilik  | Menghapus tugas.                                                                                                                                            |
| PATCH  | `/api/tasks/:id/complete`                           | Siswa sekelas | Menandai tugas selesai; pemanggilan berulang aman/idempoten.                                                                                                |

Kirim token login pada header `Authorization: Bearer <token>`. Password di-hash sebelum disimpan; query database memakai parameter.

## Migrasi, seeder, dan tes

- `bun run db:migrate` menerapkan file SQL migrasi yang belum pernah dijalankan.
- `bun run db:seed` membuat akun, kelas, dan tugas contoh secara idempoten.
- `bun run test` menjalankan tes endpoint dan skema. Script memaksa `NODE_ENV=test` dan mensyaratkan `TEST_DATABASE_URL` ke database terpisah bernama `class_tasks_test`; tes tidak boleh diarahkan ke database aplikasi.
- Dengan Compose, buat database tes terlebih dahulu menggunakan perintah `createdb` di atas. Jalankan tes dari dalam container API dengan `docker compose exec api bun run test`.

## Keputusan desain

- PostgreSQL dipilih sebagai database relasional. Migrasi SQL eksplisit menjaga constraint dan foreign key mudah ditinjau.
- Bun menjalankan TypeScript langsung dan menjadi runtime/package manager; Express tetap menyediakan REST API.
- JWT bearer token digunakan untuk autentikasi API. Password disimpan dengan bcryptjs.
- Siswa hanya melihat tugas kelasnya dan hanya dapat membuat completion miliknya; guru hanya dapat mengelola tugas pada kelas yang diajar.
- Pendaftaran guru memakai kode undangan agar pengguna publik tidak dapat menaikkan peran sendiri tanpa otorisasi.
- Dua nilai tambah yang dipilih: tes otomatis endpoint dan Docker Compose.

## Penggunaan AI

AI membantu menentukan stack dan ruang lingkup aplikasi, app testing, dan juga celah kerentanan

AI membantu menyusun kode pada bagian berikut:

- **Database (`src/db/`)**: migrasi skema, dan seeder.
- **Middleware (`src/middleware/`)**: autentikasi JWT, pemeriksaan peran, validasi request.
