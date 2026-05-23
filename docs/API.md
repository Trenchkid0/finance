# Maybe Finance — REST API v1

API publik untuk akses programatik (bot Telegram, script otomasi, integrasi
spreadsheet, dll.). Semua endpoint berada di bawah `/api/v1/*` dan
membutuhkan autentikasi Bearer API key.

> Hasil endpoint selalu dibungkus `{ ok: boolean, data?, error? }`.
> Field uang (`amount`, `balance`) berupa angka rupiah (whole IDR).

## 1. Membuat API key

1. Login ke web app, buka **Pengaturan** (`/settings`).
2. Pada kartu **Kunci API**, klik **Buat kunci** dan beri nama deskriptif.
3. Salin kunci hex 64-karakter yang muncul — hanya ditampilkan sekali.

Maksimal 10 kunci aktif per akun. Kunci dapat dicabut atau dihapus kapan saja.

## 2. Autentikasi

Sertakan header berikut di setiap request:

```
Authorization: Bearer bc90e40a7e761514ee9eba70f009689269e7e3bce8925f5df2bd9269bdcca9a1
```

Jika kunci tidak valid atau telah dicabut, response `401`:

```json
{
  "ok": false,
  "error": {
    "code": "invalid_api_key",
    "message": "Kunci API tidak valid atau sudah dicabut."
  }
}
```

## 3. Endpoint

### `GET /api/v1/me`

Smoke test — mengembalikan user yang memiliki kunci.

```bash
curl https://your-host/api/v1/me \
  -H "Authorization: Bearer bc90e40a7e76..."
```

```json
{
  "ok": true,
  "data": {
    "id": "clx...",
    "name": "Demo User",
    "email": "demo@maybe.local",
    "createdAt": "2026-04-01T08:00:00.000Z"
  }
}
```

### `GET /api/v1/accounts`

Daftar akun keuangan. Default hanya yang aktif.

Query params:
- `includeInactive` — `true` untuk semua

```json
{
  "ok": true,
  "data": [
    {
      "id": "clx...",
      "name": "BCA",
      "type": "bank",
      "balance": 5_400_000,
      "currency": "IDR",
      "icon": null,
      "color": null,
      "isActive": true,
      "createdAt": "2026-04-01T08:00:00.000Z"
    }
  ]
}
```

### `GET /api/v1/categories`

Daftar kategori (default sistem + kustom user).

Query params:
- `type` — `income` atau `expense`

### `GET /api/v1/transactions`

List transaksi dengan filter dan pagination.

Query params:
- `type` — `income` | `expense` | `transfer`
- `accountId` — filter ke akun (mencakup transfer ke/dari akun ini)
- `categoryId` — id kategori, atau `none` untuk transaksi tanpa kategori
- `startDate`, `endDate` — `YYYY-MM-DD`
- `q` — substring pada description / note
- `limit` — 1..100, default 50
- `offset` — default 0

Response:

```json
{
  "ok": true,
  "data": {
    "items": [ /* transaction[] */ ],
    "pagination": {
      "total": 124,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### `POST /api/v1/transactions`

Buat transaksi baru. Saldo akun ter-rekonsiliasi otomatis (untuk transfer,
saldo dua akun ikut diupdate).

Body:

```json
{
  "type": "expense",
  "accountId": "clx...",
  "categoryId": "clx...",
  "amount": 87500,
  "date": "2026-05-23",
  "description": "Kopi pagi",
  "note": "Starbucks"
}
```

Untuk transfer, gunakan `transferToId` (bukan `categoryId`):

```json
{
  "type": "transfer",
  "accountId": "clx-bca",
  "transferToId": "clx-gopay",
  "amount": 200000,
  "date": "2026-05-23"
}
```

Response `201` berisi transaksi yang baru dibuat.

### `GET /api/v1/transactions/:id`

Ambil satu transaksi.

### `PATCH /api/v1/transactions/:id`

Update transaksi. Saldo akun dikoreksi otomatis (revert lama → apply baru).
Body sama dengan POST.

### `DELETE /api/v1/transactions/:id`

Hapus transaksi. Saldo akun dikoreksi otomatis.

```json
{ "ok": true, "data": { "id": "clx...", "deleted": true } }
```

### `GET /api/v1/summary`

Snapshot keuangan untuk widget bot.

```json
{
  "ok": true,
  "data": {
    "netWorth": 12_500_000,
    "currentMonth": {
      "start": "2026-05-01T00:00:00.000Z",
      "income": 8_500_000,
      "expense": 3_200_000,
      "net": 5_300_000
    },
    "previousMonth": { /* ... */ },
    "topExpenseCategories": [
      { "categoryId": "clx...", "name": "Makanan", "icon": "🍔", "amount": 1_250_000 }
    ]
  }
}
```

### `POST /api/v1/ai/scan`

Parse teks bebas (struk, SMS bank, notifikasi) ke kandidat transaksi.
Tidak menyimpan ke DB — caller dapat menyusulkan `POST /api/v1/transactions`
setelahnya.

Membutuhkan `DEEPSEEK_API_KEY` di server. Jika tidak diset, endpoint
mengembalikan `503`.

Body:

```json
{ "text": "BCA m-BCA Pembayaran QRIS Rp 87.500 di Starbucks 23/05" }
```

Response:

```json
{
  "ok": true,
  "data": {
    "type": "expense",
    "amount": 87500,
    "date": "2026-05-23",
    "description": "QRIS Starbucks",
    "accountId": "clx-bca",
    "transferToId": null,
    "categoryId": "clx-makanan",
    "confidence": 0.86,
    "reasoning": "Pembayaran QRIS di Starbucks via BCA"
  }
}
```

## 4. Format error

Status code:
- `400` — body atau query tidak valid
- `401` — kunci tidak ada / tidak valid / dicabut
- `404` — resource tidak ditemukan
- `422` — validasi field gagal (`fieldErrors` berisi rincian per field)
- `503` — fitur belum dikonfigurasi (mis. AI scan tanpa DEEPSEEK_API_KEY)

```json
{
  "ok": false,
  "error": {
    "code": "validation_failed",
    "message": "Input tidak valid",
    "fieldErrors": {
      "amount": ["Jumlah harus lebih dari 0"]
    }
  }
}
```

## 5. Contoh integrasi bot Telegram (Node.js)

```javascript
const API = "https://your-host/api/v1";
const KEY = process.env.MAYBE_API_KEY;

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
      ...(init.headers ?? {}),
    },
  });
  return res.json();
}

// User kirim "Beli kopi 25rb di Starbucks"
const scan = await api("/ai/scan", {
  method: "POST",
  body: JSON.stringify({ text: messageFromUser }),
});

if (scan.ok && scan.data.confidence >= 0.6) {
  const tx = await api("/transactions", {
    method: "POST",
    body: JSON.stringify({
      type: scan.data.type,
      accountId: scan.data.accountId,
      categoryId: scan.data.categoryId,
      amount: scan.data.amount,
      date: scan.data.date ?? new Date().toISOString().slice(0, 10),
      description: scan.data.description,
    }),
  });
  // tx.data berisi transaksi yang baru dibuat
}
```
