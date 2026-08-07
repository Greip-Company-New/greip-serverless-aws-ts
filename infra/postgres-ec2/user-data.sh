#!/bin/bash
# Bootstrap de PostgreSQL 16 en Amazon Linux 2023 (GREIP COMPANY)
# El placeholder __DB_PASS__ se reemplaza en deploy.sh
# El acceso externo (5432/SSH) lo controla el SG del stack greip-vpc (OpenToInternet/OfficeIp).
exec > /var/log/user-data.log 2>&1
set -eux

# Instalacion de PostgreSQL 16 (repositorio oficial de Amazon Linux 2023)
dnf install -y postgresql16-server

# Inicializar el datastore si no existe (AL2023: postgresql-setup + unit postgresql)
postgresql-setup --initdb || true

# Habilitar e iniciar el servicio
systemctl enable postgresql
systemctl start postgresql

DB_USER=greip_app
DB_PASS='__DB_PASS__'
DB_NAME=greipdb
DATA_DIR=/var/lib/pgsql/data

# Crear rol de aplicacion (idempotente)
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}'"
fi

# Crear base de datos (idempotente)
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O ${DB_USER} ${DB_NAME}
fi

# Escuchar en todas las interfaces
sed -i "s/^#\?listen_addresses.*/listen_addresses = '*'/" ${DATA_DIR}/postgresql.conf

# pg_hba.conf: acceso externo con scram-sha-256 (la seguridad real la da el SG del VPC)
cat > ${DATA_DIR}/pg_hba.conf <<EOF
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
host    all             all             10.0.0.0/16             scram-sha-256
host    all             all             0.0.0.0/0               scram-sha-256
EOF
chown postgres:postgres ${DATA_DIR}/pg_hba.conf

# Reiniciar para aplicar configuracion
systemctl restart postgresql

echo "PostgreSQL 16 listo en GREIP COMPANY (host privado de la VPC)"
