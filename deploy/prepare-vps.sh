#!/bin/sh
# Executado somente depois de conferir VPS, redes e diretório de destino.
set -eu
umask 077
base=/home/deploy/segredo-madame
release="$base/releases/20260915-security"
test -d "$release/deploy"
mkdir -p "$base/shared/data" "$base/shared/backups"
chmod 700 "$base/shared" "$base/shared/data" "$base/shared/backups"
if ! test -f "$base/shared/backup-password"; then
    openssl rand -hex 32 > "$base/shared/backup-password"
fi
if ! test -f "$base/shared/runtime.env"; then
    cp "$release/deploy/.env.example" "$base/shared/runtime.env"
    sed -i 's/IMAGE_TAG=release-version/IMAGE_TAG=20260915-security/' "$base/shared/runtime.env"
fi
chmod 600 "$base/shared/runtime.env" "$base/shared/backup-password"
if ! docker network inspect segredo-madame-edge >/dev/null 2>&1; then
    docker network create --internal --subnet 172.28.50.0/24 segredo-madame-edge
fi
cd "$release"
docker compose --env-file "$base/shared/runtime.env" -f deploy/compose.yml config --quiet
docker compose --env-file "$base/shared/runtime.env" -f deploy/compose.yml build app
docker compose --env-file "$base/shared/runtime.env" -f deploy/compose.yml up -d --wait --wait-timeout 60 app
if ! test -e "$base/shared/backups/config"; then
    docker compose --env-file "$base/shared/runtime.env" -f deploy/compose.yml run --rm -T backup init
fi
ln -sfn "$release" "$base/current"
sh "$base/current/deploy/backup.sh"
