#!/bin/bash
# Backup diario de PostgreSQL 16 (pg_dump | gzip) hacia S3 para GREIP COMPANY.
#
# El bucket se lee de /etc/greip-backup.env (BUCKET=bk-greip-<env>).
# Si el archivo no existe, usa el default bk-greip-dev.
# Retencion: 7 dias (lifecycle de S3 configurado en infra/storage).
#
# Instalacion en el EC2 (como ec2-user, con sudo):
#   sudo cp greip-pg-backup.sh /usr/local/bin/greip-pg-backup.sh
#   sudo chmod 700 /usr/local/bin/greip-pg-backup.sh
#   echo "BUCKET=bk-greip-dev" | sudo tee /etc/greip-backup.env
#   sudo cp greip-backup.service greip-backup.timer /etc/systemd/system/
#   sudo systemctl daemon-reload
#   sudo systemctl enable --now greip-backup.timer
set -euo pipefail

BUCKET_DEFAULT=bk-greip-dev
if [ -f /etc/greip-backup.env ]; then
  . /etc/greip-backup.env
fi
BUCKET=${BUCKET:-${BUCKET_DEFAULT}}

STAMP=$(date +%Y%m%d_%H%M%S)
FILE="/tmp/greipdb_${STAMP}.sql.gz"

trap 'rm -f "$FILE"' EXIT

echo "==> [$(date '+%Y-%m-%d %H:%M:%S')] Backup greipdb -> s3://${BUCKET}/backups/"
sudo -u postgres pg_dump --no-owner --no-privileges greipdb | gzip -9 > "$FILE"
aws s3 cp "$FILE" "s3://${BUCKET}/backups/" --region us-east-2 --quiet
echo "==> Backup OK: backups/$(basename "$FILE")"
