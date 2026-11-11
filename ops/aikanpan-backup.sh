#!/usr/bin/env bash
# Aikanpan daily backup -> /data/backups (tar.gz, integrity-checked, RETAIN generations).
# Production data is file-based (userdata/ + json + .env); dsa.db is an empty shell.
set -euo pipefail
SRC=/opt/dsa-mp
DEST=/data/backups
RETAIN=30
TS=$(date -u +%Y%m%dT%H%M%SZ)
ART="$DEST/aikanpan-$TS.tar.gz"
mkdir -p "$DEST"
chmod 700 "$DEST"
trap 'echo "{\"ok\": false, \"at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$DEST/status.json"' ERR
tar czf "$ART" -C "$SRC" \
  .env users.json alipay_orders.json membership_codes.json \
  membership_code_store.json transactions.json subs.json \
  feedback.json alerts.json positions.json analytics.json \
  membership_reminders.json retention_reminders.json userdata data
# integrity check: the archive must be fully listable
tar tzf "$ART" >/dev/null
BYTES=$(stat -c%s "$ART")
# prune old generations, keep the newest RETAIN
ls -1t "$DEST"/aikanpan-*.tar.gz | tail -n +$((RETAIN + 1)) | while read -r old; do rm -f "$old"; done
printf '{"ok": true, "at": "%s", "file": "%s", "bytes": %s, "retained": %s}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$ART" "$BYTES" "$RETAIN" > "$DEST/status.json"
echo "backup ok: $ART ($BYTES bytes)"
