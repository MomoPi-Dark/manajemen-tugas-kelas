# Ruang Tugas — Frontend

Antarmuka web Class Task Tracker menggunakan Vite, React, TypeScript, dan Bun. Frontend dapat dijalankan bersama API dan PostgreSQL melalui satu Docker Compose dari root repository.

## Menjalankan seluruh aplikasi dengan Docker Compose

1. Pastikan Docker Engine dan Docker Compose tersedia.
2. Salin `backend/.env.example` menjadi `backend/.env`, lalu isi nilai lokal untuk secret JWT, kode registrasi guru, dan akun seeder. Jangan commit file `.env`.
3. Di root repository, ganti setiap placeholder `<POSTGRES_PASSWORD>` di `docker-compose.yml` dengan password PostgreSQL yang sama. Gunakan karakter URL-safe (huruf dan angka) agar URL koneksi tetap valid.
4. Dari root repository jalankan:

   ```bash
   docker compose up --build
   ```

5. Buka frontend di `http://localhost:5173`; API tersedia di `http://localhost:4000/api`.

### Apa yang dilakukan Compose untuk frontend

Service `frontend` dibangun dari `frontend/Dockerfile`; Bun dan Node tidak perlu dipasang di host untuk menjalankan aplikasi dalam container. Build frontend:

1. Menyalin `package.json` dan `bun.lock`, lalu menjalankan `bun install --frozen-lockfile`.
2. Menyediakan `VITE_API_URL=http://localhost:4000/api` sebagai build argument dari `docker-compose.yml`.
3. Menjalankan `bun run build`, lalu menyalurkan hasil `dist/` melalui Nginx pada port container `80`. Konfigurasi Nginx mendukung route SPA.

Port host `5173` dipetakan ke port Nginx `80`; buka `http://localhost:5173`. Tidak perlu membuat `frontend/.env` untuk setup Compose. Jika URL API berubah, ubah `build.args.VITE_API_URL` pada service frontend dan build ulang:

```bash
docker compose build frontend
docker compose up -d frontend
```

Periksa frontend dengan `docker compose ps frontend` dan `docker compose logs -f frontend`. Untuk menghentikan seluruh stack tanpa menghapus data gunakan `docker compose down`. **Jangan gunakan `docker compose down -v` kecuali memang ingin menghapus seluruh data PostgreSQL lokal.**

## Menjalankan frontend tanpa Docker

1. Jalankan backend lebih dahulu mengikuti [`../backend/README.md`](../backend/README.md).
2. Pastikan `VITE_API_URL` menunjuk ke API, misalnya `http://localhost:4000/api`. Salin `.env.example` menjadi `.env` hanya jika perlu mengganti URL default.
3. Dari folder `frontend/`, jalankan:

   ```bash
   bun install
   bun run dev
   ```

4. Buka alamat Vite yang ditampilkan (default `http://localhost:5173`).

## Perintah

- `bun run dev` — server pengembangan.
- `bun run typecheck` — pemeriksaan TypeScript.
- `bun run lint` — lint Oxlint.
- `bun run build` — typecheck dan build produksi ke `dist/`.
- `bun run preview` — pratinjau build produksi.

Token login hanya disimpan pada `sessionStorage` browser. Jangan menambahkan token, password, atau secret ke variabel `VITE_*`; nilainya terekspos ke browser.
