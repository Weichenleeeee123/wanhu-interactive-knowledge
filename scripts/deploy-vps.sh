#!/usr/bin/env bash
# Run as root on the existing Wanhu VPS. Retains all releases and backups.
set -euo pipefail
archive=${1:?source tar required}
release_id=${2:?release id required}
revision=${3:?git revision required}
[[ "$release_id" =~ ^[0-9]{8}-[0-9]{6}-[a-f0-9]{7,40}$ ]] || exit 2
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 2
release="/opt/wanhu/releases/$release_id"
unit=/etc/systemd/system/wanhu.service
backup="/opt/wanhu/shared/wanhu.service.$release_id.backup"
test ! -e "$release"
mkdir "$release"
tar -xf "$archive" -C "$release"
printf '%s\n' "$revision" > "$release/REVISION"
chown -R wanhu:wanhu "$release"
runuser -u wanhu -- bash -c 'cd "$1" && npm ci --no-audit --no-fund && NEXT_TELEMETRY_DISABLED=1 npm run build' _ "$release"
cp -p "$unit" "$backup"
sed "s|^WorkingDirectory=.*|WorkingDirectory=$release|" "$backup" > "$unit"
systemctl daemon-reload
systemctl restart wanhu
healthy=0
for attempt in {1..20}; do
  if curl --fail --silent http://127.0.0.1:3100/showcase > "$release/showcase-health.html"; then
    healthy=1
    break
  fi
  sleep 2
done
if [[ "$healthy" != 1 ]]; then
  cp -p "$backup" "$unit"
  systemctl daemon-reload
  systemctl restart wanhu
  echo 'Health check failed; restored previous service configuration.' >&2
  exit 1
fi
systemctl is-active wanhu
printf 'Deployed %s to %s\n' "$revision" "$release"
