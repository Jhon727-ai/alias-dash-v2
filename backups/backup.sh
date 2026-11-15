#!/bin/bash
# Backup harian alias-dash-v2 — accounts + semua alias per akun. Keep 14 hari.
set -e
DIR="/root/alias-dash-v2/backups"
DATA="/root/alias-dash-v2/data"
mkdir -p "$DIR"
STAMP=$(date +%Y-%m-%d)
TODAY="$DIR/$STAMP"
mkdir -p "$TODAY"
cp "$DATA/accounts.json" "$TODAY/" 2>/dev/null || true
cp -r "$DATA/aliases" "$TODAY/" 2>/dev/null || true
# token TIDAK dibackup (rahasia, regenerable via OAuth)
# hapus backup lebih tua dari 14 hari
find "$DIR" -maxdepth 1 -type d -name "20*" -mtime +14 -exec rm -rf {} \;
