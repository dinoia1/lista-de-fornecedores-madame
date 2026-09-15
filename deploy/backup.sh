#!/bin/sh
set -eu
umask 077
cd /home/deploy/segredo-madame/current
exec 9>/home/deploy/segredo-madame/shared/backup.lock
flock -n 9 || exit 0
run() { docker compose --env-file /home/deploy/segredo-madame/shared/runtime.env -f deploy/compose.yml run --rm -T backup "$@"; }
run backup /data --host segredo-madame --exclude /data/admin-first-access.txt --exclude '*.tmp'
run check
date -u +%FT%TZ > /home/deploy/segredo-madame/shared/backup-last-success.txt
