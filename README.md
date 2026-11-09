# Manajemen Tugas Kelas

Aplikasi Class Task Tracker untuk guru membuat dan mengelola tugas kelas, serta siswa melihat dan menandai tugas selesai.

## Status pengerjaan

- [x] Backend REST API dengan Express, TypeScript, Bun, dan PostgreSQL.
- [x] Migrasi skema dan seeder akun/kelas/tugas contoh.
- [x] Tes integrasi endpoint dan Docker Compose untuk backend/database.
- [ ] Frontend Vite + React belum dikerjakan.

## Backend lokal

Lihat [`backend/README.md`](backend/README.md) untuk setup PostgreSQL lokal atau Docker Compose, variabel environment, akun contoh, dan endpoint.

Ringkasnya:

1. Siapkan Bun dan PostgreSQL.
2. Salin `backend/.env.example` menjadi `backend/.env`, lalu ganti semua nilai placeholder dengan nilai lokal.
3. Buat database `class_tasks` dan `class_tasks_test`.
4. Dari folder `backend/`, jalankan `bun install`, `bun run db:migrate`, `bun run db:seed`, dan `bun run dev`.

Jangan commit file `.env`, password, token, atau API key. Gunakan `.env.example` sebagai template.
