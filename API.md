# Alias Dash v2 — API Documentation

Base URL: `https://alias.casa.web.id`

REST API untuk mengelola alias Gmail multi-akun: daftar alias, generate dot-trick/plus alias, baca inbox per alias, dan kelola akun Gmail. Semua response JSON.

---

## Authentication

Semua endpoint (kecuali yang tercantum di bawah) membutuhkan autentikasi via API key pada header `Authorization`:

```
Authorization: Bearer <API_KEY>
```

API key dibuat lewat dashboard: **Settings → API Keys → + Bikin Key**. Plaintext key hanya ditampilkan **satu kali** saat pembuatan — simpan segera. Jika hilang, revoke dan buat baru.

Format key: `ak_` diikuti 48 karakter hex.

### Header opsional

| Header | Deskripsi |
|---|---|
| `Authorization: Bearer <key>` | **Wajib.** API key. |
| `X-Account: <email>` | Opsional. Pilih akun Gmail aktif untuk request ini (mis. `budiwoe029@gmail.com`). Tanpa header ini, dipakai akun connected pertama. |
| `Content-Type: application/json` | Wajib untuk method POST/DELETE dengan body. |

### Endpoint tanpa auth

| Endpoint | Keterangan |
|---|---|
| `GET /api/health` | Health check |
| `POST /api/login` | Login dashboard (browser session) |
| `POST /api/logout` | Logout |
| `GET /api/gmail/callback` | OAuth redirect target (browser) |

### Error responses

| Status | Arti |
|---|---|
| `401` | Key tidak ada / salah / sudah di-revoke |
| `400` | Parameter tidak lengkap / tidak valid |
| `404` | Resource tidak ditemukan (akun/alias) |
| `500` | Error internal atau Gmail API (cek field `error`) |

Error body selalu berbentuk `{"error": "pesan"}`.

---

## Rate limits

- Login password: 5 kegagalan per IP → blokir 10 menit (tidak memengaruhi API key).
- Gmail API: kuota di sisi Google. Scan besar beruntun bisa memicu `Quota exceeded ... Units per minute per user` — tunggu ±1 menit lalu ulangi.
- Disarankan maksimal 1 request scan (`/api/inbox/all`) per menit per akun.

---

## Endpoints

### 1. Status & daftar akun

```http
GET /api/status
```

Contoh:

```bash
curl -H "Authorization: Bearer $KEY" https://alias.casa.web.id/api/status
```

Response:

```json
{
  "accounts": [
    { "email": "maztel85@gmail.com", "label": "utama", "connected": true,
      "added_at": "2026-11-14T06:02:26.870Z", "last_used_at": "2026-11-14T06:12:57.180Z" }
  ],
  "active_account": "maztel85@gmail.com",
  "master": "maztel85@gmail.com",
  "password_set": true
}
```

> `active_account` pada response ini hanya fallback untuk keperluan tampilan — request via API key tidak bergantung padanya. Gunakan header `X-Account` untuk memilih akun.

---

### 2. Daftar alias

```http
GET /api/aliases
```

```bash
curl -H "Authorization: Bearer $KEY" \
     -H "X-Account: maztel85@gmail.com" \
     https://alias.casa.web.id/api/aliases
```

Response:

```json
{
  "account": "maztel85@gmail.com",
  "aliases": [
    { "alias": "maztel85+shopee", "label": "belanja", "kind": "plus",
      "created_at": "2026-11-13T17:44:31.707Z", "last_used_at": "2026-11-14T00:01:59.000Z" },
    { "alias": "m.aztel85", "label": "", "kind": "dot", "created_at": "..." }
  ]
}
```

| Field | Keterangan |
|---|---|
| `kind` | `dot` = dot-trick, `plus` = plus-addressing |
| `last_used_at` | `null` jika alias belum pernah menerima email |

---

### 3. Generate alias

```http
POST /api/aliases
```

Body:

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `mode` | string | ya | `"dot"` atau `"plus"` |
| `local` | string | tidak | Local part target. Default: local part akun aktif. |
| `tag` | string | mode `plus` | Tag untuk plus alias (mis. `shopee`). Dibersihkan otomatis, hanya `a-zA-Z0-9._-` |
| `label` | string | tidak | Label bebas |

Dot mode menghasilkan semua kombinasi titik yang belum ada (maks. 500 per request). Local part 8 karakter = 128 kombinasi; kombinasi habis → `added: 0`.

```bash
# dot trick
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
     -d '{"mode":"dot","label":"utama"}' \
     https://alias.casa.web.id/api/aliases

# plus alias
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
     -d '{"mode":"plus","tag":"tokopedia","label":"belanja"}' \
     https://alias.casa.web.id/api/aliases
```

Response:

```json
{ "account": "maztel85@gmail.com", "added": 3, "aliases": [ ... ], "total": 133 }
```

---

### 4. Hapus alias

```http
DELETE /api/aliases?alias=<alias>
```

```bash
curl -X DELETE -H "Authorization: Bearer $KEY" \
     "https://alias.casa.web.id/api/aliases?alias=m.aztel85"
```

Response: `{ "ok": true, "remaining": 132 }`

---

### 5. Inbox satu alias

```http
GET /api/inbox?alias=<alias>&max=<1-50>
```

| Param | Default | Maks |
|---|---|---|
| `alias` | — (wajib) | |
| `max` | 20 | 50 |

```bash
curl -H "Authorization: Bearer $KEY" \
     "https://alias.casa.web.id/api/inbox?alias=maztel85%2Bshopee&max=10"
```

> URL-encode alias pada query string (`+` menjadi `%2B`).

Response:

```json
{
  "account": "maztel85@gmail.com",
  "alias": "maztel85+shopee",
  "count": 4,
  "messages": [
    { "id": "18f0a1b2c3d4e5f6",
      "from": "Tokopedia <no-reply@tokopedia.com>",
      "subject": "Pesanan dikonfirmasi",
      "date": "Sat, 14 Nov 2026 09:12:00 +0700",
      "snippet": "Halo, pesanan kamu sudah..." }
  ]
}
```

---

### 6. Isi lengkap satu email

```http
GET /api/inbox/message?id=<message_id>
```

`id` diambil dari field `id` pada response `/api/inbox`.

```bash
curl -H "Authorization: Bearer $KEY" \
     "https://alias.casa.web.id/api/inbox/message?id=18f0a1b2c3d4e5f6"
```

Response:

```json
{
  "id": "18f0a1b2c3d4e5f6",
  "from": "Tokopedia <no-reply@tokopedia.com>",
  "subject": "Pesanan dikonfirmasi",
  "date": "...",
  "snippet": "...",
  "body": "Isi email plain-text. HTML di-strip otomatis."
}
```

---

### 7. Scan semua alias sekaligus

Satu query Gmail untuk semua alias akun aktif. Mengembalikan statistik per alias dan memperbarui `last_used_at` di server.

```http
GET /api/inbox/all?max=<1-200>&track=true
```

| Param | Default | Maks |
|---|---|---|
| `max` | 100 | 200 |
| `track` | `true` | `false` = tidak update `last_used_at` |

```bash
curl -H "Authorization: Bearer $KEY" -H "X-Account: budiwoe029@gmail.com" \
     "https://alias.casa.web.id/api/inbox/all?max=200"
```

Response:

```json
{
  "account": "budiwoe029@gmail.com",
  "scanned": 124,
  "matched_aliases": 1,
  "stats": {
    "budiwoe029": { "count": 1, "last_date": "2026-11-14T06:40:00.000Z" }
  }
}
```

> Ini endpoint paling "mahal" terhadap kuota Gmail. Server sudah menjalankan auto-scan per jam; panggil manual hanya saat perlu data segar.

---

### 8. Kelola akun Gmail

```http
GET    /api/accounts              # daftar akun
POST   /api/accounts              # daftarkan akun baru
DELETE /api/accounts?email=<email>  # hapus akun + token + aliasnya
```

POST body: `{ "email": "akun@gmail.com", "label": "opsional" }`

> Mendaftarkan akun belum menghubungkan Gmail. Koneksi token memerlukan OAuth via browser (lihat `/api/gmail/authurl`) — tidak bisa diotomasi penuh via API.

---

### 9. Kelola API keys

Key bisa dikelola via session dashboard **atau** key lain yang valid.

```http
GET    /api/apikeys               # daftar (tanpa plaintext)
POST   /api/apikeys               # buat key baru -> plaintext SEKALI di response
DELETE /api/apikeys?id=<id>       # revoke (id atau name)
```

```bash
# buat
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
     -d '{"name":"bot-telegram"}' \
     https://alias.casa.web.id/api/apikeys

# revoke by name
curl -X DELETE -H "Authorization: Bearer $KEY" \
     "https://alias.casa.web.id/api/apikeys?id=bot-telegram"
```

---

## Contoh alur lengkap

Pantau OTP yang masuk ke alias tertentu:

```bash
#!/bin/bash
KEY="ak_xxx"
BASE="https://alias.casa.web.id"
ALIAS="maztel85%2Botp"

# poll tiap 5 detik, tunggu email baru
while true; do
  COUNT=$(curl -s -H "Authorization: Bearer $KEY" "$BASE/api/inbox?alias=$ALIAS&max=1" \
          | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('count',0))")
  if [ "$COUNT" -gt 0 ]; then
    ID=$(curl -s -H "Authorization: Bearer $KEY" "$BASE/api/inbox?alias=$ALIAS&max=1" \
         | python3 -c "import sys,json; print(json.load(sys.stdin)['messages'][0]['id'])")
    curl -s -H "Authorization: Bearer $KEY" "$BASE/api/inbox/message?id=$ID" \
         | python3 -c "import sys,json,re; print(re.search(r'\b\d{6}\b', json.load(sys.stdin)['body']).group())"
    break
  fi
  sleep 5
done
```

---

## Keamanan

- Key disimpan sebagai SHA-256 hash — kebocoran database tidak membocorkan key.
- Revoke instan tanpa restart server.
- Header `X-Account` hanya menerima email yang terdaftar; email asing diabaikan (fallback ke default).
- Semua traffic lewat HTTPS (Cloudflare). Key jangan pernah dikirim via query string.
