# Manajemen Tugas Kelas

Aplikasi Class Task Tracker untuk guru membuat dan mengelola tugas kelas, serta siswa melihat dan menandai tugas selesai.

## Status pengerjaan

- [x] Backend REST API dengan Express, TypeScript, Bun, dan PostgreSQL.
- [x] Migrasi skema dan seeder akun/kelas/tugas contoh.
- [x] Tes integrasi endpoint dan Docker Compose untuk seluruh stack.
- [x] Frontend web Vite + React + TypeScript dengan autentikasi, dashboard peran, serta alur tugas.

## Menjalankan seluruh aplikasi dengan Docker Compose

1. Salin `backend/.env.example` menjadi `backend/.env`, lalu isi secret dan akun contoh lokal.
2. Ganti placeholder `<POSTGRES_PASSWORD>` di `docker-compose.yml` dengan satu password URL-safe yang sama di ketiga kemunculannya.
3. Dari root repository jalankan `docker compose up --build`. Perintah ini membangun dan menjalankan tiga service: PostgreSQL (`db`), REST API (`api`), dan web frontend (`frontend`) dari `frontend/Dockerfile`.
4. Buka web frontend di `http://localhost:5173`; API berjalan di `http://localhost:4000`.

Lihat [`backend/README.md`](backend/README.md) untuk detail konfigurasi backend, akun contoh, endpoint, dan pengelolaan database. Lihat [`frontend/README.md`](frontend/README.md) untuk cara menjalankan frontend sendiri dengan Bun.
