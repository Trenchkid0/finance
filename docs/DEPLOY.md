# Deploy Maybe Finance dengan Docker

Panduan ini mengikuti file Docker yang sudah ada di folder ini:
`Dockerfile`, `docker-compose.yml`, `.dockerignore`, `docker/entrypoint.sh`,
dan `.env.docker.example`.

Stack yang akan jalan:

| Service | Image | Fungsi |
|---|---|---|
| `db` | `mysql:8.4` | MySQL persistent dengan volume `maybe-db-data` |
| `migrate` | dari `Dockerfile` (target `builder`) | One-shot: tunggu DB siap → `prisma db push` → exit 0 |
| `app` | dari `Dockerfile` (target `runner`) | Next.js standalone server di port 3000 |

Ketiganya berbagi network internal `maybe-net`. Hanya `app` yang publish port ke host.

---

## 0. Prasyarat

- **Docker Engine** ≥ 24 dan **Docker Compose v2** (perintah `docker compose`, bukan `docker-compose` lama).
- **OpenSSL** atau Node 20+ untuk generate `AUTH_SECRET`.
- Port `3000` di host bebas (atau pakai port lain — lihat langkah 2).

Cek dengan:

```bash
docker --version          # Docker version 24.0.0+
docker compose version    # Docker Compose version v2.20.0+
```

---

## 1. Clone repo dan masuk ke folder app

```bash
git clone <url-repo>
cd maybe-finance
```

Pastikan Anda berada di folder yang sama dengan `Dockerfile` — semua perintah `docker compose` berikutnya dijalankan dari sini.

---

## 2. Buat file `.env.docker`

Salin template:

```bash
cp .env.docker.example .env.docker
```

Lalu edit `.env.docker`. Minimal Anda harus mengisi 4 nilai:

```bash
# --- MySQL credentials -----------------------------------------------
MYSQL_DATABASE=maybe_finance
MYSQL_USER=maybe
MYSQL_PASSWORD=ganti-password-yang-kuat
MYSQL_ROOT_PASSWORD=ganti-root-password-yang-kuat

# --- Connection string yang dipakai container app & migrate ----------
# `db` adalah nama service compose. JANGAN ganti ke localhost.
DATABASE_URL_INTERNAL=mysql://maybe:ganti-password-yang-kuat@db:3306/maybe_finance

# --- NextAuth.js -----------------------------------------------------
AUTH_SECRET=        # generate: openssl rand -base64 32
AUTH_URL=http://localhost:3000

# --- Optional --------------------------------------------------------
DEEPSEEK_API_KEY=   # kosongkan kalau tidak pakai Scan AI

APP_PORT=3000
SEED_ON_STARTUP=false
```

### 2.1 Generate `AUTH_SECRET`

Pilih salah satu:

```bash
openssl rand -base64 32
# atau
npx auth secret
# atau (Node 20+)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Salin nilai yang muncul ke baris `AUTH_SECRET=...`.

### 2.2 Sinkronkan password

`MYSQL_PASSWORD` dan password di `DATABASE_URL_INTERNAL` **harus sama**. Kalau Anda set:

```
MYSQL_PASSWORD=Sup3rR4ndom!
```

Maka:

```
DATABASE_URL_INTERNAL=mysql://maybe:Sup3rR4ndom!@db:3306/maybe_finance
```

> **Karakter khusus**: kalau password mengandung `@`, `:`, `/`, `?`, `#`, atau `&`, encode di URL dengan percent-encoding (mis. `@` → `%40`).

### 2.3 Pilih port host (opsional)

Default `APP_PORT=3000`. Kalau di host port 3000 sudah dipakai, ganti misal `APP_PORT=8080`. Akses jadi `http://localhost:8080`.

---

## 3. Build image dan start stack

```bash
docker compose --env-file .env.docker up -d --build
```

- `--env-file .env.docker` → compose membaca file env yang Anda buat di langkah 2.
- `-d` → jalankan di background (detached).
- `--build` → force rebuild image kalau ada perubahan kode.

Compose akan menjalankan urutan ini secara otomatis:

1. Pull image `mysql:8.4` (sekali saja, ~150MB).
2. Build image `app` dan `migrate` dari `Dockerfile` (~3–5 menit pertama kali).
3. Start `db` → tunggu sampai healthy (`mysqladmin ping` lulus).
4. Start `migrate` → jalankan `prisma db push` → exit 0.
5. Start `app` → siap melayani request di port 3000.

### 3.1 Cek status

```bash
docker compose ps
```

Output yang diharapkan:

```
NAME            STATUS                   PORTS
maybe-db        Up 30s (healthy)
maybe-migrate   Exited (0) 12s ago
maybe-app       Up 8s                    0.0.0.0:3000->3000/tcp
```

`maybe-migrate` **harus** `Exited (0)`. Kalau `Exited (1)` artinya migrasi gagal — lihat bagian Troubleshooting.

### 3.2 Tail log app

```bash
docker compose logs -f app
```

Tunggu sampai muncul:

```
✓ Ready in XXXms
```

Tekan `Ctrl+C` untuk keluar dari log (container tetap jalan).

---

## 4. Verifikasi

Buka `http://localhost:3000` (atau port yang Anda set di `APP_PORT`).

- Halaman login muncul → ✅ stack jalan.
- Klik "Daftar gratis" → buat akun pertama → langsung masuk dashboard.

### 4.1 Atau seed data demo (opsional)

Kalau Anda mau punya data dummy untuk eksplorasi:

```bash
# 1. Edit .env.docker → set SEED_ON_STARTUP=true
# 2. Restart container migrate untuk pickup env baru
docker compose --env-file .env.docker up -d --force-recreate migrate

# 3. Setelah seed sukses, kembalikan SEED_ON_STARTUP=false
#    (supaya restart berikutnya tidak menambah data ganda)
```

Login demo: `demo@maybe.local` / `password123`.

### 4.2 Smoke test API

```bash
# Buat kunci API lewat web (Pengaturan → Kunci API → Buat kunci),
# salin nilai 64-char hex, lalu:
curl http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer <kunci-anda>"
```

Response harus `{ "ok": true, "data": { ... } }`.

---

## 5. Operasi sehari-hari

### Stop semua container

```bash
docker compose down
```

Data MySQL tetap aman di volume `maybe-db-data`.

### Restart tanpa rebuild

```bash
docker compose --env-file .env.docker up -d
```

### Update versi aplikasi

```bash
git pull
docker compose --env-file .env.docker up -d --build
```

`migrate` akan jalan ulang dan menyamakan schema kalau ada perubahan Prisma. Aman karena `prisma db push` idempoten.

### Lihat log spesifik

```bash
docker compose logs -f app          # log Next.js
docker compose logs -f db           # log MySQL
docker compose logs migrate         # log migrasi (one-shot)
```

### Eksekusi perintah di dalam container

```bash
# Buka shell di container app
docker compose exec app sh

# Run prisma studio (port 5555 — perlu publish manual)
docker compose exec migrate npx prisma studio
```

---

## 6. Backup dan restore

### Backup database ke file lokal

```bash
docker compose exec db \
  mysqldump -u maybe -p"$MYSQL_PASSWORD" maybe_finance \
  > backup-$(date +%Y%m%d).sql
```

Saat ditanya password, pakai `MYSQL_PASSWORD` dari `.env.docker`.

### Restore dari file backup

```bash
cat backup-20260523.sql | \
  docker compose exec -T db \
  mysql -u maybe -p"$MYSQL_PASSWORD" maybe_finance
```

`-T` melepas TTY agar pipe stdin bekerja.

### Backup volume secara penuh (snapshot)

```bash
# Export volume ke tarball
docker run --rm \
  -v maybe-finance_maybe-db-data:/data \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/db-volume-$(date +%Y%m%d).tgz -C /data .
```

---

## 7. Production hardening

Sebelum deploy ke server publik, pastikan:

- [ ] `AUTH_SECRET` di-rotate ke nilai random 32+ byte yang **belum pernah** dipakai
- [ ] `AUTH_URL` mengikuti domain HTTPS asli (mis. `https://finance.example.com`)
- [ ] Password MySQL kuat (minimum 16 karakter, mix alfanumerik + simbol)
- [ ] Reverse proxy (nginx/traefik/caddy) di depan `app` untuk TLS termination
- [ ] Backup `mysqldump` rutin via cron + offsite (R2/S3/rsync)
- [ ] `SEED_ON_STARTUP=false` di production (seed hanya untuk demo lokal)
- [ ] Container `app` jalan sebagai user non-root (sudah di-set di `Dockerfile`, jangan diubah)
- [ ] Port MySQL **tidak** dipublish ke host (default `docker-compose.yml` sudah benar — port 3306 hanya di internal network)

### Contoh nginx sederhana di depan `app`

```nginx
server {
  listen 443 ssl http2;
  server_name finance.example.com;

  ssl_certificate     /etc/letsencrypt/live/finance.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/finance.example.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;

    # Next.js streaming + SSE friendly
    proxy_buffering off;
    proxy_read_timeout 300s;
  }
}
```

Pastikan `AUTH_URL=https://finance.example.com` di `.env.docker` agar Auth.js generate redirect URL yang benar.

---

## 8. Troubleshooting

### `migrate` Exited (1) — schema sync gagal

Cek log untuk error spesifik:

```bash
docker compose logs migrate
```

Penyebab umum:

| Pesan log | Solusi |
|---|---|
| `Can't reach database server at db:3306` | Tunggu 10–15 detik lagi (MySQL boot lambat di mesin lambat) lalu `docker compose up -d migrate` |
| `Access denied for user 'maybe'` | `MYSQL_PASSWORD` ≠ password di `DATABASE_URL_INTERNAL`. Cek langkah 2.2 |
| `Unknown database 'maybe_finance'` | `MYSQL_DATABASE` di env ≠ nama DB di URL. Sinkronkan keduanya |

### `app` jalan tapi browser hang / `502`

```bash
docker compose logs --tail 50 app
```

- `Error: Invalid environment variables` → `.env.docker` belum lengkap. Lihat langkah 2.
- `EADDRINUSE 0.0.0.0:3000` → port 3000 sudah dipakai proses lain di host. Ganti `APP_PORT`.
- `PrismaClientInitializationError` → DB belum ready. Lihat poin di atas.

### Port 3000 bentrok dengan proses lain

```bash
# Linux/Mac
lsof -i :3000

# Windows (PowerShell)
netstat -ano | findstr :3000
```

Ubah `APP_PORT` di `.env.docker`, lalu:

```bash
docker compose --env-file .env.docker up -d
```

### Mau wipe semua dan mulai dari nol

> ⚠️ Ini menghapus database secara permanen.

```bash
docker compose down -v          # -v ikut hapus volume
rm -f .env.docker
```

### Image image lama menumpuk

```bash
docker image prune -f                          # buang dangling
docker image prune -a -f --filter until=168h   # buang yang tidak terpakai > 7 hari
```

---

## 9. Struktur file Docker

```
maybe-finance/
├── Dockerfile               # Multi-stage: deps → builder → runner
├── .dockerignore            # File yang TIDAK ikut ke build context
├── docker-compose.yml       # Orkestrasi 3 service (db, migrate, app)
├── .env.docker.example      # Template env, COPY dulu sebelum edit
├── .env.docker              # File env sebenarnya (gitignored)
└── docker/
    └── entrypoint.sh        # Script container migrate (wait DB → push schema)
```

Gambaran multi-stage `Dockerfile`:

| Stage | Tujuan | Image base |
|---|---|---|
| `deps` | `npm ci` cached | `node:22-alpine` |
| `builder` | `prisma generate` + `next build` standalone | `node:22-alpine` |
| `runner` | Hanya `.next/standalone` + static + public | `node:22-alpine` + `tini` |

Image akhir `runner` ~150MB (vs ~500MB+ kalau bawa devDependencies).

---

## 10. Cara cepat (cheat sheet)

```bash
# Setup pertama kali
cp .env.docker.example .env.docker
# edit .env.docker (set AUTH_SECRET + password DB)
docker compose --env-file .env.docker up -d --build

# Lihat status
docker compose ps
docker compose logs -f app

# Restart aja (tanpa rebuild)
docker compose --env-file .env.docker up -d

# Update dari git
git pull && docker compose --env-file .env.docker up -d --build

# Backup DB
docker compose exec db mysqldump -u maybe -p"$MYSQL_PASSWORD" maybe_finance > backup.sql

# Stop
docker compose down

# Wipe semua (HATI-HATI: hapus DB)
docker compose down -v
```
