# Alias Dash v2

Self-hosted web dashboard untuk mengelola **alias Gmail multi-akun**: generate alias dot-trick & plus-addressing, baca inbox per alias, scan semua alias sekaligus, dan sediakan REST API (API key) untuk otomasi.

**Demo arsitektur:** Next.js standalone (Node.js) + Gmail API (OAuth 2.0, scope readonly) + storage JSON flat-file. Tidak butuh database.

---

## Fitur

- **Multi-akun Gmail** — daftarkan N akun, switch akun aktif dari navbar
- **Alias dot-trick** — Gmail mengabaikan titik di local part → `m.aztel85@gmail.com` = `maztel85@gmail.com`. Generate semua kombinasi yang belum terpakai (maks 500/request)
- **Plus-addressing** — `maztel85+shopee@gmail.com` untuk tagging per layanan
- **Inbox per alias** — baca email yang masuk ke alias tertentu, dengan body lengkap (HTML di-strip)
- **Bulk scan** — 1 query Gmail untuk semua alias akun aktif, update `last_used_at` per alias
- **REST API + API key** — Bearer token auth untuk bot/otomasi (Telegram bot, script polling OTP, dll)
- **Auto-scan cron** — scan tiap jam via crontab (update statistik last_used)
- **Dashboard web** — dark theme monospace, mobile friendly
- **Public docs page** — `https://domain-anda/docs` render dokumentasi API tanpa login

---

## Cara Setting (Dari Nol)

### Prasyarat

- VPS/server dengan Node.js ≥ 20 (dites di Node 24, Debian/Parrot)
- Domain + Cloudflare (opsional tapi disarankan — HTTPS otomatis + DDoS protection)
- Akun Google untuk Gmail API credentials

### Langkah 1 — Gmail API credentials

1. Buka [console.cloud.google.com](https://console.cloud.google.com) → buat project baru
2. Menu **APIs & Services → Library** → cari **Gmail API** → **Enable**
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** (untuk akun pribadi)
   - Isi app name + email
   - **Scopes**: tambahkan `https://www.googleapis.com/auth/gmail.readonly`
   - **Test users**: tambahkan semua akun Gmail yang mau dikelola
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: isi sesuai kebutuhan, mis. `https://alias.casa.web.id/api/gmail/callback`
     (kalau testing lokal, boleh `urn:ietf:wg:oauth:2.0:oob` / paste manual)
5. Download JSON client secret → simpan sebagai `client_secret.json` di folder project

### Langkah 2 — Install project

```bash
git clone https://github.com/Jhon727-ai/alias-dash-v2.git
cd alias-dash-v2

# letakkan client_secret.json dari langkah 1
mv ~/Downloads/client_secret.json .

npm install        # butuh akses npm registry (deps lokal juga ada, lihat package.json)
```

> **Catatan offline/air-gapped:** dua dependency (`@googleapis/gmail`, `google-auth-library`) di-install dari tgz lokal (`file:../../tmp/...`). Kalau tidak ada file itu, hapus `file:` prefix-nya di `package.json` agar npm fetch dari registry.

### Langkah 3 — Environment

Buat file `.env` di root project:

```bash
# password login dashboard (WAJIB, kuat!)
DASH_PASSWORD=password-super-aman-anda

# email utama (fallback akun aktif)
MASTER_EMAIL=akunanda@gmail.com

# path client secret (default: ./client_secret.json)
GMAIL_CLIENT_SECRET=/root/alias-dash-v2/client_secret.json

# redirect URI default untuk OAuth (harus sama dengan yang terdaftar di Google Console)
OAUTH_REDIRECT_URI=https://alias.casa.web.id/api/gmail/callback

# port server
PORT=3210
```

```bash
chmod 600 .env client_secret.json
```

### Langkah 4 — Build & jalanin

```bash
npm run build

# PENTING: standalone build perlu static files disalin manual
cp -r .next/static .next/standalone/.next/static

# pastikan API.md ikut (untuk halaman /docs)
ls .next/standalone/API.md

# jalanin
cd .next/standalone && source ../../.env && PORT=$PORT HOSTNAME=0.0.0.0 node server.js
```

Server jalan di `http://localhost:3210`. Test:

```bash
curl http://localhost:3210/api/health   # → {"ok":true,...}
```

### Langkah 5 — Expose ke internet (Cloudflare)

Cara paling gampang: Cloudflare Tunnel (gak perlu buka port, gak perlu IP publik):

```bash
# install cloudflared, lalu:
cloudflared tunnel login
cloudflared tunnel create alias-dash
cloudflared tunnel route dns alias-dash alias.casa.web.id

# config.yml tunnel:
# tunnel: <id>
# credentials-file: /root/.cloudflared/<id>.json
# ingress:
#   - hostname: alias.casa.web.id
#     service: http://localhost:3210
#   - service: http_status:404

cloudflared tunnel run alias-dash
```

Alternatif: reverse proxy nginx/caddy → `proxy_pass http://localhost:3210`.

### Langkah 6 — Pakai dashboard

1. Buka `https://domain-anda/login` → masukkan `DASH_PASSWORD`
2. **Settings → Tambah Akun** → masukkan alamat Gmail
3. **Settings → Connect Gmail** → buka auth URL → approve → copy code/redirect URL → paste di form → **Exchange**
4. Ulangi untuk tiap akun tambahan
5. **Dashboard** → generate alias (dot/plus), **Inbox** → baca email per alias

### Langkah 7 — Cron auto-scan (opsional tapi disarankan)

```bash
crontab -e
```

Tambahkan:

```cron
# scan semua akun tiap jam :07 — update last_used_at per alias
7 * * * * cd /root/alias-dash-v2 && /usr/bin/env -i HOME=/root PATH=/usr/local/bin:/usr/bin:/bin /usr/bin/node scripts/scan-all.js >> /root/alias-dash-v2/data/scan.log 2>&1

# backup harian 04:30 (alias + accounts, keep 14 hari)
30 4 * * * /root/alias-dash-v2/backups/backup.sh
```

---

## Cara Pakai

### Dashboard web

| Halaman | Fungsi |
|---|---|
| `/login` | Login pakai `DASH_PASSWORD` |
| `/dashboard` | Generate & kelola alias (dot-trick + plus), cari/copy alias |
| `/inbox` | Baca email per alias, klik alias untuk detail, tombol "Scan All" |
| `/settings` | Kelola akun Gmail (add/connect/disconnect), kelola API keys |
| `/docs` | Dokumentasi API publik (render `API.md`) |

### Generate alias

- **Dot mode**: klik "Generate Dot" → server bikin semua kombinasi titik yang belum ada (maks 500/request)
- **Plus mode**: isi `tag` (mis. `tokopedia`) → alias jadi `email+tokopedia@gmail.com`
- Semua alias otomatis masuk daftar + dilacak `last_used_at`-nya oleh scan

### REST API (untuk bot/otomasi)

Dokumentasi lengkap: **`/docs`** atau [API.md](./API.md). Ringkasannya:

```bash
# bikin API key dulu (via dashboard: Settings → API Keys → Bikin Key)
KEY="ak_xxx..."
BASE="https://domain-anda"

# daftar alias
curl -H "Authorization: Bearer $KEY" $BASE/api/aliases

# generate plus alias
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
     -d '{"mode":"plus","tag":"shopee","label":"belanja"}' $BASE/api/aliases

# cek inbox alias
curl -H "Authorization: Bearer $KEY" "$BASE/api/inbox?alias=email%2Bshopee&max=10"

# multi-akun: pilih akun via header
curl -H "Authorization: Bearer $KEY" -H "X-Account: akun2@gmail.com" $BASE/api/status
```

Contoh polling OTP (bash) ada di [API.md § Contoh alur lengkap](./API.md).

---

## Keamanan (yang sudah built-in)

- Password login: timing-safe compare + rate limit 5 gagal/IP/10 menit
- Session cookie: HMAC-SHA256, httpOnly + secure + sameSite=lax, TTL 7 hari
- API key: disimpan sebagai SHA-256 hash, reveal sekali saat create, revoke instan
- `X-Account` header: hanya menerima email terdaftar
- Token OAuth per akun: file permission 600
- File storage: atomic write (tmp + rename), promise queue anti race condition
- Gmail fetch: bounded concurrency 8 (hemat kuota 250 units/detik)
- Cache headers: HTML `no-cache` (gak ada 404 pasca deploy), static chunks `immutable`

## Struktur Project

```
app/
  api/              # route handlers (REST API)
    aliases/ inbox/ accounts/ apikeys/ status/ login/ logout/ gmail/...
  dashboard/        # UI kelola alias
  inbox/            # UI baca email
  settings/         # UI akun + API keys
  docs/             # public docs (render API.md)
  login/
lib/
  accounts.js       # multi-akun + OAuth state + alias storage (queue + atomic write)
  gmail.js          # Gmail client multi-akun + refresh singleflight
  auth.js           # session + API key verify
  apikeys.js        # API key store (cache + queue)
  dots.js           # dot-trick & plus generator
  mapLimit.js       # bounded concurrency helper
scripts/
  scan-all.js       # cron scan semua akun
  migrate-v1.js     # migrasi data dari alias-dash v1
backups/
  backup.sh         # backup harian (keep 14 hari)
API.md              # dokumentasi REST API lengkap
```

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `Quota exceeded` dari Gmail | Sudah dibatesin (concurrency 8). Kalau masih, tunggu ±1 menit; kurangi `max` |
| Chunks 404 setelah deploy | Pastikan `cp -r .next/static .next/standalone/.next/static` sebelum start |
| OAuth `redirect_uri_mismatch` | `OAUTH_REDIRECT_URI` di `.env` harus identik dengan yang terdaftar di Google Console |
| `NO_TOKEN:<email>` | Akun belum di-connect Gmail (Settings → Connect) |
| 401 di API | Key salah/revoke — buat baru di Settings |
| Login 429 | 5x gagal → block 10 menit per IP |

## Lisensi

MIT — bebas dipakai, dimodifikasi, di-deploy ulang.
