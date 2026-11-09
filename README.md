# Manajemen Tugas Kelas

Class Task Tracker: guru membuat dan mengelola tugas kelas, siswa melihat tugas dan menandainya selesai.

## Fitur

- **Guru**: membuat, mengubah, dan menghapus tugas untuk kelas miliknya.
- **Siswa**: melihat tugas di kelasnya, mencari/memfilter tugas, dan menandai tugas selesai.
- **Autentikasi** dengan dashboard sesuai peran (guru/siswa).

## Teknologi

| Bagian   | Stack                                |
| -------- | ------------------------------------ |
| Backend  | Express, TypeScript, Bun, PostgreSQL |
| Frontend | Vite, React, TypeScript              |
| Infra    | Docker Compose                       |

## Struktur repository

Frontend dan backend berada dalam satu repository dan dijalankan bersama oleh satu `docker-compose.yml` di root.

```text
manajemen-tugas-kelas/
├── backend/               # REST API (Express + Bun)
│   ├── .env.example
│   └── README.md
├── frontend/              # Aplikasi web (Vite + React)
│   ├── Dockerfile
│   └── README.md
└── docker-compose.yml     # Menjalankan frontend, api, dan db sekaligus
```

## Status pengerjaan

- [x] Backend REST API
- [x] Migrasi skema dan seeder (akun, kelas, tugas contoh)
- [x] Tes integrasi endpoint dan Docker Compose
- [x] Frontend web dengan autentikasi, dashboard per peran, dan alur tugas

---

## Menjalankan dengan Docker Compose

### Prasyarat

- Git
- Docker Desktop (dengan WSL integration aktif), atau Docker Engine + Docker Compose v2

Bun tidak perlu dipasang di host; semua build dilakukan di dalam container.

### 1. Clone repository

```bash
git clone https://github.com/MomoPi-Dark/manajemen-tugas-kelas.git
cd manajemen-tugas-kelas
```

### 2. Konfigurasi backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

| Variabel                                      | Ketentuan                        |
| --------------------------------------------- | -------------------------------- |
| `JWT_SECRET`                                  | Nilai acak, minimal 32 karakter  |
| `TEACHER_REGISTRATION_CODE`                   | Kode bebas untuk registrasi guru |
| `SEED_TEACHER_EMAIL`, `SEED_TEACHER_PASSWORD` | Akun guru seeder                 |
| `SEED_STUDENT_EMAIL`, `SEED_STUDENT_PASSWORD` | Akun siswa seeder                |

> - Password seed minimal 12 karakter.
> - Nilai ini hanya untuk lingkungan lokal. **Jangan commit `backend/.env`.**

Frontend tidak memerlukan `.env`; konfigurasinya dikirim oleh Compose saat build (lihat [Cara kerja stack](#cara-kerja-stack)).

### 3. Atur password PostgreSQL

Di `docker-compose.yml`, ganti ketiga `<POSTGRES_PASSWORD>` dengan password lokal yang sama.

> - Gunakan huruf dan angka saja (URL-safe), karena password ikut dipakai di URL koneksi database.
> - Jangan commit `docker-compose.yml` dengan password asli. Kembalikan placeholder sebelum commit.

### 4. Build dan jalankan

Dari root repository:

```bash
docker compose up --build
```

Compose membangun image API dan frontend, menarik image PostgreSQL, lalu menjalankan tiga service:

| Service    | Fungsi              | Alamat                    |
| ---------- | ------------------- | ------------------------- |
| `frontend` | Aplikasi web React  | http://localhost:5173     |
| `api`      | REST API Express    | http://localhost:4000/api |
| `db`       | Database PostgreSQL | localhost:5432            |

Biarkan proses tetap berjalan di terminal tersebut.

### 5. Verifikasi

Di terminal lain:

```bash
docker compose ps
```

Atau buka http://localhost:4000/api/health.

---

## Cara kerja stack

**Urutan start**: API menunggu database berstatus sehat, lalu menjalankan migrasi dan seeder sebelum melayani request.

**Frontend** dibangun dari `frontend/Dockerfile`:

1. Dependensi dipasang dengan `bun install --frozen-lockfile` (dari `package.json` dan `bun.lock`).
2. Compose mengirim `VITE_API_URL=http://localhost:4000/api` sebagai build argument. URL ini dipakai **browser** untuk menghubungi API lewat port host `4000`.
3. `bun run build` menghasilkan `dist/`, lalu Nginx menyajikannya di port container `80` (dipetakan ke host `5173`, termasuk fallback untuk route SPA).

> Karena `VITE_API_URL` ditanam saat build, mengubahnya memerlukan build ulang frontend.

---

## Cara menggunakan aplikasi

1. Buka http://localhost:5173.
2. Masuk dengan akun seeder dari `backend/.env`:
   - **Guru**: `SEED_TEACHER_EMAIL` dan `SEED_TEACHER_PASSWORD`
   - **Siswa**: `SEED_STUDENT_EMAIL` dan `SEED_STUDENT_PASSWORD`
3. Untuk mencoba registrasi, pilih menu **Daftar**:
   - **Guru**: perlu `TEACHER_REGISTRATION_CODE`; otomatis membuat kelas pertama.
   - **Siswa**: memilih dari kelas yang sudah ada.

## Perintah sehari-hari

| Tujuan                               | Perintah                                                         |
| ------------------------------------ | ---------------------------------------------------------------- |
| Jalankan di latar belakang           | `docker compose up --build -d`                                   |
| Lihat semua log                      | `docker compose logs -f`                                         |
| Lihat log API / frontend saja        | `docker compose logs -f api` / `... -f frontend`                 |
| Bangun ulang semua setelah ubah kode | `docker compose up --build -d`                                   |
| Bangun ulang frontend saja           | `docker compose build frontend && docker compose up -d frontend` |
| Hentikan (data database tetap ada)   | `docker compose down`                                            |

> ⚠️ **`docker compose down -v` menghapus volume `postgres_data` beserta seluruh data lokal PostgreSQL.** Gunakan hanya jika memang ingin mereset database.

## Dokumentasi lanjutan

- [`backend/README.md`](backend/README.md): daftar endpoint, akun contoh, migrasi, seeder, dan tes.
- [`frontend/README.md`](frontend/README.md): menjalankan frontend secara terpisah dengan Bun (tanpa Docker).
