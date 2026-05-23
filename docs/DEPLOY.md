# Deploy Maybe Finance dengan Docker

Panduan ini mengikuti file Docker yang sudah ada:
`Dockerfile`, `docker-compose.yml`, `docker-compose.bundled-db.yml`,
`.dockerignore`, `docker/entrypoint.sh`, dan `.env.docker.example`.

Default `docker-compose.yml` mengasumsikan **MySQL berada di luar Docker**
(native di host, atau di server lain). Kalau Anda mau MySQL ikut bundled,
ada overlay `docker-compose.bundled-db.yml` — opt-in lewat `-f`.

| Service | Image | Fungsi |
|---|---|---|
| `migrate` | dari `Dockerfile` (target `builder`) | One-shot: tunggu DB siap → `prisma db push` → exit 0 |
| `app` | dari `Dockerfile` (target `runner`) | Next.js standalone di port 3000 |
| `db` *(opsional)* | `mysql:8.4` | Aktif **hanya** kalau pakai overlay bundled-db |

---

## 0. Prasyarat

- **Docker Engine** ≥ 24 dan **Docker Compose v2** (`docker compose`, bukan `docker-compose` legacy)
- **OpenSSL** atau Node 20+ untuk generate `AUTH_SECRET`
- Port `3000` di host bebas (atau pakai port lain — lihat langkah 2)
- **MySQL 8.x** sudah jalan dan accessible **kalau Anda pakai skenario A atau B**

Cek versi:

```bash
docker --version
docker compose version
```

---

## 1. Pilih skenario koneksi database

Lihat tabel ini, lalu lompat ke section yang relevan.

| | Database location | Hostname dari container | Setup butuh |
|---|---|---|---|
| **A** | MySQL native di **host yang sama** dengan Docker | `host.docker.internal` | MySQL listen di all interfaces, user dengan host `%` atau IP bridge |
| **B** | MySQL native di **host lain** (LAN/VPN/cloud) | IP atau FQDN target | Routing + firewall mengizinkan port 3306 |
| **C** | MySQL **ikut compose** (bundled) | `db` | Tidak perlu MySQL terinstal |

---

## 2. Skenario A — MySQL di host yang sama

### 2.1 Konfigurasi MySQL host

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf` (atau `my.cnf`):

```ini
[mysqld]
bind-address = 0.0.0.0
```

> Default Ubuntu/Debian: `bind-address = 127.0.0.1` — ini tidak bisa diakses
> dari container Docker. Set ke `0.0.0.0` (semua interface) atau IP bridge
> docker spesifik (mis. `172.17.0.1`).

Restart MySQL:

```bash
sudo systemctl restart mysql
```

Buat database + user (dari shell MySQL):

```sql
CREATE DATABASE maybe_finance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Wildcard host '%' supaya container Docker bisa connect dari IP berapapun
-- di docker bridge network (172.17.x.x by default).
CREATE USER 'maybe'@'%' IDENTIFIED BY 'GANTI-PASSWORD-INI';
GRANT ALL PRIVILEGES ON maybe_finance.* TO 'maybe'@'%';
FLUSH PRIVILEGES;
```

### 2.2 Buka firewall (jika ada)

Linux native dengan UFW:

```bash
# Izinkan koneksi dari docker bridge ke port MySQL host
sudo ufw allow from 172.17.0.0/16 to any port 3306
sudo ufw reload
```

> Bridge default Docker biasanya `172.17.0.0/16`. Cek dengan
> `docker network inspect bridge` kalau Anda pakai jaringan custom.

### 2.3 Konfigurasi `.env.docker`

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker`:

```bash
DATABASE_URL_INTERNAL=mysql://maybe:GANTI-PASSWORD-INI@host.docker.internal:3306/maybe_finance
DB_HOST=host.docker.internal
DB_PORT=3306

AUTH_SECRET=                     # generate: openssl rand -base64 32
AUTH_URL=http://localhost:3000

DEEPSEEK_API_KEY=                # opsional
APP_PORT=3000
SEED_ON_STARTUP=false
```

### 2.4 Start

```bash
docker compose --env-file .env.docker up -d --build
```

Compose akan:
1. Build image `app` dan `migrate`
2. Run `migrate` → TCP probe ke `host.docker.internal:3306` → `prisma db push` → exit 0
3. Start `app` di port 3000

**Skip ke section 6** untuk verifikasi.

---

## 3. Skenario B — MySQL di server lain (LAN / VPN / cloud)

### 3.1 Pastikan koneksi reachable

Dari mesin tempat Docker jalan:

```bash
# TCP probe (butuh nc atau telnet)
nc -zv 192.168.18.5 3306
# Connection to 192.168.18.5 3306 port [tcp/mysql] succeeded!
```

Kalau timeout / refused:
- MySQL di server tujuan listen di `0.0.0.0` atau IP yang reachable
- Firewall server tujuan mengizinkan port 3306 dari IP Docker host
- Routing LAN/VPN benar

### 3.2 Konfigurasi MySQL server tujuan

Sama seperti 2.1, plus pastikan user terikat ke IP source yang benar.
Untuk safety, batasi ke IP host Docker (bukan wildcard `%`):

```sql
CREATE USER 'maybe'@'192.168.x.y' IDENTIFIED BY 'GANTI-PASSWORD-INI';
GRANT ALL PRIVILEGES ON maybe_finance.* TO 'maybe'@'192.168.x.y';
FLUSH PRIVILEGES;
```

### 3.3 Konfigurasi `.env.docker`

```bash
DATABASE_URL_INTERNAL=mysql://maybe:GANTI-PASSWORD-INI@192.168.18.5:3306/maybe_finance
DB_HOST=192.168.18.5
DB_PORT=3306

AUTH_SECRET=
AUTH_URL=http://localhost:3000
APP_PORT=3000
```

### 3.4 Start

```bash
docker compose --env-file .env.docker up -d --build
```

**Skip ke section 6** untuk verifikasi.

### Cloud-managed MySQL (PlanetScale / RDS / Aiven / dll)

Kalau pakai TLS connection (umumnya wajib di managed cloud):

```bash
# PlanetScale style
DATABASE_URL_INTERNAL="mysql://user:pass@aws.connect.psdb.cloud:3306/maybe_finance?ssl={\"rejectUnauthorized\":true}"

# Generic dengan SSL CA
DATABASE_URL_INTERNAL="mysql://user:pass@db.example.com:3306/maybe_finance?ssl-mode=REQUIRED"
```

Format query string SSL spesifik per provider — cek dokumentasi mereka.

---

## 4. Skenario C — MySQL bundled di compose

Pakai ini **hanya** kalau Anda tidak punya MySQL terinstal di mana pun.

### 4.1 Konfigurasi `.env.docker`

Edit `.env.docker`, pakai konfigurasi Skenario C:

```bash
DATABASE_URL_INTERNAL=mysql://maybe:passwordmu@db:3306/maybe_finance
DB_HOST=db
DB_PORT=3306

# WAJIB ada saat overlay bundled-db aktif
MYSQL_DATABASE=maybe_finance
MYSQL_USER=maybe
MYSQL_PASSWORD=passwordmu
MYSQL_ROOT_PASSWORD=root-password-yang-kuat

AUTH_SECRET=
AUTH_URL=http://localhost:3000
```

### 4.2 Start dengan overlay

Tambahkan flag `-f docker-compose.bundled-db.yml`:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.bundled-db.yml \
  --env-file .env.docker \
  up -d --build
```

Compose akan tambahkan service `db` (mysql:8.4) ke stack, dan
`migrate` + `app` otomatis menunggu `db` healthy sebelum start.

> Setiap kali Anda menjalankan compose untuk stack ini, ikutkan kedua
> flag `-f`. Tanpa overlay, service `db` tidak akan diketahui dan
> compose akan coba connect ke `host.docker.internal` (Skenario A)
> yang kemungkinan bukan yang Anda inginkan.

Untuk menyederhanakan, tambahkan alias di shell profile:

```bash
alias maybe="docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml --env-file .env.docker"
maybe up -d --build
maybe ps
maybe logs -f app
```

---

## 5. Generate `AUTH_SECRET`

Pilih salah satu:

```bash
openssl rand -base64 32
# atau
npx auth secret
# atau (Node 20+)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Salin nilai ke baris `AUTH_SECRET=` di `.env.docker`.

---

## 6. Verifikasi

```bash
docker compose ps
```

Output yang diharapkan (Skenario A/B):

```
NAME             STATUS                   PORTS
maybe-migrate    Exited (0) 12s ago
maybe-app        Up 8s                    0.0.0.0:3000->3000/tcp
```

`maybe-migrate` **harus** `Exited (0)`. Kalau `Exited (1)` → migrasi gagal,
lihat **Troubleshooting**.

Tail log:

```bash
docker compose logs -f app
```

Tunggu sampai muncul `✓ Ready in XXXms`, lalu buka
`http://localhost:3000` (atau `APP_PORT` yang Anda set).

---

## 7. Operasi sehari-hari

```bash
# Stop semua container
docker compose down

# Restart tanpa rebuild
docker compose --env-file .env.docker up -d

# Update versi aplikasi
git pull
docker compose --env-file .env.docker up -d --build

# Tail log spesifik
docker compose logs -f app
docker compose logs migrate
```

> Untuk Skenario C (bundled), selalu ikutkan flag `-f docker-compose.yml -f docker-compose.bundled-db.yml`.

---

## 8. Backup dan restore

### Skenario A & B (MySQL native)

Pakai tool MySQL langsung di host:

```bash
# Backup
mysqldump -u maybe -p maybe_finance > backup-$(date +%Y%m%d).sql

# Restore
mysql -u maybe -p maybe_finance < backup-20260523.sql
```

### Skenario C (bundled)

```bash
# Backup
docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml \
  exec db mysqldump -u maybe -p"$MYSQL_PASSWORD" maybe_finance \
  > backup-$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml \
  exec -T db mysql -u maybe -p"$MYSQL_PASSWORD" maybe_finance
```

---

## 9. Production hardening

- [ ] `AUTH_SECRET` random 32+ byte yang **belum pernah** dipakai
- [ ] `AUTH_URL` mengikuti domain HTTPS asli (mis. `https://finance.example.com`)
- [ ] Password MySQL kuat (16+ karakter, alfanumerik + simbol)
- [ ] Reverse proxy (nginx/traefik/caddy) di depan `app` dengan TLS termination
- [ ] Backup `mysqldump` rutin via cron + offsite (R2/S3/rsync)
- [ ] `SEED_ON_STARTUP=false` setelah seed pertama (atau selalu false di production)
- [ ] Container `app` jalan sebagai user non-root (sudah di-set di `Dockerfile`)
- [ ] **Skenario A/B**: MySQL **tidak** listen di public interface kalau host punya IP publik. Bind ke `127.0.0.1` + bridge IP, atau pakai VPN/SSH tunnel
- [ ] **Skenario A/B**: User MySQL terikat ke IP source spesifik, bukan wildcard `%`

### Contoh nginx di depan `app`

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

    proxy_buffering off;
    proxy_read_timeout 300s;
  }
}
```

Pastikan `AUTH_URL=https://finance.example.com` di `.env.docker`.

---

## 10. Troubleshooting

### A. `migrate` Exited (1) — TCP probe gagal

Log mirip:

```
✗ Database tidak ready setelah 60s pada host.docker.internal:3306.
  Cek:
  - MySQL listen di alamat yang benar (bukan hanya 127.0.0.1)
  - Firewall mengizinkan port 3306 dari subnet docker
  - DATABASE_URL_INTERNAL host = host.docker.internal
```

Sebab umum:

| Kondisi | Solusi |
|---|---|
| MySQL `bind-address = 127.0.0.1` | Edit ke `0.0.0.0`, restart MySQL |
| `host.docker.internal` tidak resolve di Linux native | Cek bahwa `extra_hosts` di `docker-compose.yml` ter-set ke `host-gateway` (sudah di-set default) |
| UFW/iptables blokir docker bridge | `sudo ufw allow from 172.17.0.0/16 to any port 3306` |
| MySQL listen di port custom | Set `DB_PORT=` ke port yang benar di `.env.docker` |

Test manual dari container:

```bash
docker compose exec migrate sh -c "nc -zv host.docker.internal 3306"
```

### B. `migrate` lewat TCP probe tapi `prisma db push` gagal

```
Authentication failed against database server
```

→ password di `DATABASE_URL_INTERNAL` salah, atau user belum di-grant
ke host yang benar. Re-run grant SQL di section 2.1.

```
Unknown database 'maybe_finance'
```

→ Database belum ada. Jalankan `CREATE DATABASE maybe_finance...` di
MySQL dulu (Prisma `db push` membuat tabel tapi tidak membuat database).

### C. Skenario C: `db` tidak start

```bash
docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml \
  logs db
```

Penyebab umum: `MYSQL_PASSWORD` atau `MYSQL_ROOT_PASSWORD` belum di-set
di `.env.docker`. Compose akan refuse start dengan pesan eksplisit.

### D. `app` jalan tapi browser hang / `502`

```bash
docker compose logs --tail 50 app
```

- `Error: Invalid environment variables` → `.env.docker` belum lengkap
- `EADDRINUSE 0.0.0.0:3000` → port 3000 dipakai. Ganti `APP_PORT`
- `PrismaClientInitializationError` → DB tidak reachable runtime. Cek
  bahwa `app` masih bisa connect ke `DB_HOST` (firewall / DNS)

### E. Wipe semua dan mulai dari nol

> ⚠️ Skenario C: ini menghapus database secara permanen.

```bash
# Skenario A/B
docker compose down
rm -f .env.docker

# Skenario C (ikut hapus volume database)
docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml down -v
rm -f .env.docker
```

---

## 11. Cheat sheet

```bash
# === Skenario A/B (MySQL eksternal) ===
docker compose --env-file .env.docker up -d --build
docker compose ps
docker compose logs -f app
docker compose down

# === Skenario C (MySQL bundled) ===
docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml \
  --env-file .env.docker up -d --build

# Test koneksi DB dari container
docker compose exec migrate sh -c "nc -zv $DB_HOST $DB_PORT"

# Run prisma studio (sementara)
docker compose exec migrate npx prisma studio

# Backup (Skenario A/B - lewat host)
mysqldump -h <DB_HOST> -u maybe -p maybe_finance > backup.sql

# Backup (Skenario C - lewat compose)
docker compose -f docker-compose.yml -f docker-compose.bundled-db.yml \
  exec db mysqldump -u maybe -p"$MYSQL_PASSWORD" maybe_finance > backup.sql
```
