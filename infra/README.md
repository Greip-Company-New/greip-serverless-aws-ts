# Infraestructura de GREIP COMPANY

Infraestructura AWS para los microservicios serverless de GREIP COMPANY.
Cuenta `918897411288` · Región `us-east-2` · Profile `devGreipCompany`.

## Multi-entorno (DEV / QA / PROD)

Toda la infraestructura se parametriza por `ENVIRONMENT`. **DEV conserva los nombres de stack legacy** (para no tumbar la infra ya desplegada); QA/PROD usan sufijo:

| Recurso | DEV (legacy) | QA | PROD |
|---------|--------------|----|------|
| Stack VPC | `greip-vpc` | `greip-vpc-QA` | `greip-vpc-PROD` |
| Stack IAM compartido | `greip-iam` (global, se despliega **una sola vez**) | igual | igual |
| Stack IAM backup | `greip-iam-backup` | `greip-iam-backup-QA` | `greip-iam-backup-PROD` |
| Stack Storage | `greip-storage` | `greip-storage-QA` | `greip-storage-PROD` |
| Bucket S3 | `bk-greip-dev` | `bk-greip-qa` | `bk-greip-prod` |
| Tablas DynamoDB | `TBL_GREIP_USUARIOS_DEV` / `..._ARCHIVOS_DEV` | `..._QA` | `..._PROD` |
| Secret (credenciales BD) | `Greip/postgres/dev` | `Greip/postgres/qa` | `Greip/postgres/prod` |
| EC2 Postgres | `GREIP-POSTGRES-DEV` | `GREIP-POSTGRES-QA` | `GREIP-POSTGRES-PROD` |
| VPC | 10.0.0.0/16 | 10.0.0.0/16 (VPC separada) | 10.0.0.0/16 (VPC separada) |

Cada entorno vive en su **propia VPC** y con **nombres únicos por entorno**, así pueden coexistir en la misma cuenta. El rol `lambda-vpc-role` es global de la cuenta y por eso es compartido.

## Stack por carpeta

| Carpeta | Stack CFN / recurso | Qué crea |
|---------|--------------------|----------|
| `vpc/` | `greip-vpc[-<ENV>]` | VPC 10.0.0.0/16, subred pública (EC2) + privada (Lambda), IGW, gateway endpoints DynamoDB/S3 (gratis), interface endpoints CloudWatch Logs y Secrets Manager (~US$7/mes c/u), SGs (Lambda, Postgres, endpoints) |
| `iam/` | `greip-iam` | Rol `lambda-vpc-role` (ENI + logs + X-Ray + DynamoDB/S3/SSM/SecretsManager) — global, una sola vez |
| `iam/` | `greip-iam-backup[-<ENV>]` | Rol + instance profile `greip-ec2-backup[-<ENV>]` (S3 `bk-greip-<suffix>/backups/*` + SSM core) para los backups de Postgres |
| `storage/` | `greip-storage[-<ENV>]` | `TBL_GREIP_USUARIOS_<ENV>`, `TBL_GREIP_ARCHIVOS_<ENV>` (PAY_PER_REQUEST, PITR, TTL) y bucket `bk-greip-<suffix>` (CORS, versionado) |
| `postgres-ec2/` | EC2 `GREIP-POSTGRES-<ENV>` | `t3.micro` AL2023 con PostgreSQL 16 (user-data: `postgresql-setup --initdb`, unit `postgresql`, data dir `/var/lib/pgsql/data`), credenciales en **Secrets Manager** |

## Arquitectura de red

```
                       ┌──────────── VPC 10.0.0.0/16 ────────────┐
 Cliente ─ HTTPS ─ API Gateway ─ Lambda ─┬─ DynamoDB (gateway ep) │
                                        ├─ S3       (gateway ep) │
                                        ├─ CloudWatch (interface)│
                                        ├─ Secrets Mgr (interface)│
                                        └─ EC2 Postgres 5432     │
                                            (subred pública, SG  │
                                             abierto a 0.0.0.0/0)│
 └──────────────────────────────────────┴────────────────────────┘
```

- **Sin NAT Gateway** (~US$32/mes ahorrados): las Lambdas (subred privada) alcanzan DynamoDB/S3 por gateway endpoints, CloudWatch Logs y Secrets Manager por interface endpoints.
- **EC2 en subred pública** (decisión de DEV): la instancia usa el IGW para instalar PostgreSQL (dnf/yum).
- **Acceso a internet abierto (DEV)**: el SG del EC2 permite **PostgreSQL 5432 y SSH 22 desde `0.0.0.0/0`** (cualquier IP). Lo controla el parámetro `OpenToInternet=true` del stack `greip-vpc` (ver Despliegue). En PROD se recomienda SG restringido a la oficina + subred privada + NAT.
- La autenticación de Postgres es **scram-sha-256** (nunca trust) vía `pg_hba.conf`, que permite conexiones desde `0.0.0.0/0`, `10.0.0.0/16` y localhost. La contraseña es obligatoria.
- Las Lambdas se conectan a Postgres por **IP privada** de la VPC (ruta local, sin salir a internet).

## Credenciales y acceso (DEV)

| Qué | Cómo |
|-----|------|
| **PostgreSQL desde cualquier IP** | `psql -h dev.server.greip.com.pe -p 5432 -U greip_app -d greipdb` (o directo a `3.15.50.19`) |
| **Usuario BD** | `greip_app` |
| **Password BD** | `<SECRETO: ver Secrets Manager Greip/postgres/dev>` |
| **IDE (DataGrip/DBeaver/TablePlus)** | Host `dev.server.greip.com.pe` · Puerto `5432` · Base `greipdb` · Usuario `greip_app` · Password arriba · **SSL mode: `disable`** |
| **Ver desde Secrets Manager** | `aws secretsmanager get-secret-value --secret-id Greip/postgres/dev --query SecretString --output text --region us-east-2 --profile devGreipCompany` (JSON `{host,port,db,user,pass}`) |
| **Rotar password** | Genera uno nuevo, `ALTER ROLE greip_app PASSWORD '...'` en el EC2 y `aws secretsmanager put-secret-value --secret-id Greip/postgres/dev --secret-string '{"host":"...","port":5432,"db":"greipdb","user":"greip_app","pass":"..."}' ...` (mismos pasos que `postgres-ec2/deploy.sh`) |
| **SSH desde cualquier IP** | `ssh -i ~/.ssh/greip-dev-key.pem ec2-user@dev.server.greip.com.pe` (o directo a `3.15.50.19`; key pair `greip-dev-key`) |
| **Datos actuales** | Instancia `i-081821d65c625a7e8` · privada `10.0.0.48` · pública **`3.15.50.19` (Elastic IP `eipalloc-0663ec951a85e5da7`)** · PostgreSQL 16.14 |

> ⚠️ DEV: acceso abierto a internet. No usar el mismo password ni la misma exposición en PROD.
> La IP pública es una **Elastic IP** → ya **no cambia** si la instancia se detiene/arranca.

### SSL en PostgreSQL (pendiente)

- **Estado**: PostgreSQL **NO tiene SSL habilitado** → las conexiones viajan en texto plano. Los IDEs deben usar **SSL mode `disable`** (o `prefer`).
- **Por qué no se usó el certificado ACM**: ACM solo permite exportar la llave privada de certificados de **CA privada**; los certificados públicos de ACM (como `*.greip.com.pe`) **no son exportables** — solo pueden usarse en servicios de AWS (API Gateway, CloudFront, ALB).
- **Plan recomendado (pendiente de ejecutar)**: instalar **Let's Encrypt** con `certbot` en el EC2 para `dev.server.greip.com.pe`:
  1. Abrir el puerto **80** en el SG de Postgres (HTTP-01 challenge).
  2. `dnf install certbot` → `sudo certbot certonly --standalone -d dev.server.greip.com.pe`.
  3. Configurar `ssl=on` en `/var/lib/pgsql/data/postgresql.conf` (`ssl_cert_file`, `ssl_key_file`) y `systemctl reload postgresql`.
  4. Renovación automática con timer de certbot + hook de reload de Postgres.
- Es gratis, certificado público confiable, y no rompe a los clientes sin SSL (Postgres acepta ambos hasta que se restrinja en `pg_hba.conf`).

## Dominios (custom domains)

DNS del dominio `greip.com.pe` está en **Cloudflare** (NS `osmar/mona.ns.cloudflare.com`), no en Punto.pe ni Route53. Por eso los registros DNS se crean a mano en Cloudflare (Dashboard) y NO se usa `createRoute53Record: true`.

### Mapa de subdominios

| Subdominio | Uso | Registro DNS en Cloudflare | Estado |
|------------|-----|----------------------------|--------|
| `apidev.greip.com.pe` | APIs Dev | CNAME → target regional API Gateway (hoy `d-p10l06xuj6.execute-api.us-east-2.amazonaws.com` del stack `service-core-be` legacy; al desplegar `service-catalogs` apuntará al nuevo target de `/srv-catalogs`) | Custom domain creado en API GW; **CNAME pendiente en Cloudflare** |
| `apiqa.greip.com.pe` | APIs QA | CNAME → target regional API Gateway | Pendiente |
| `api.greip.com.pe` | APIs Prod | CNAME → target regional API Gateway | Pendiente |
| `dev.server.greip.com.pe` | EC2 Postgres (SSH + 5432) | **A record** → `3.15.50.19` (Elastic IP), **DNS-only (nube gris)** — nunca proxied, o SSH falla | ✅ Creado y verificado (SSH + 5432 OK) |

> Nota: si tras cambiar un registro de proxied → DNS-only los puertos TCP se cuelgan localmente, limpiar la cache DNS del SO:
> `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder` (macOS)

### Certificado ACM (una vez por cuenta/región)

- **`*.greip.com.pe`** (wildcard: cubre apidev, apiqa, api y dev.server) en **us-east-2** (los custom domains regionales requieren el cert en la misma región que la API).
- ARN: `arn:aws:acm:us-east-2:918897411288:certificate/606bea7a-80f8-413e-8242-0d8664c357f9`
- **Estado: `ISSUED`** ✓ (validación DNS completada el 2026-08-07).
  - Registro de validación usado: `CNAME` `_a8b230abae623d44510843f42a623dc5.greip.com.pe` → `_277b546372e50eed4440da2335201075.jkddzztszm.acm-validations.aws.`
- ACM y custom domains de API Gateway (regional) son **gratis**.

### Configuración en los servicios (serverless-domain-manager)

```yaml
custom:
  customDomain:
    domainName: ${self:custom.config.domains.${self:custom.stageDeploy}}
    basePath: ${self:custom.path}
    stage: ${self:custom.stageDeploy}
    createRoute53Record: false        # DNS está en Cloudflare
    certificateArn: arn:aws:acm:us-east-2:918897411288:certificate/606bea7a-80f8-413e-8242-0d8664c357f9
    endpointType: 'regional'
    securityPolicy: tls_1_2
    apiType: rest
    autoDomain: false
```

Y en `serverless-config.yml`:

```yaml
domains:
    DEV: 'apidev.greip.com.pe'
    QA: 'apiqa.greip.com.pe'
    PROD: 'api.greip.com.pe'
```

Flujo por servicio: `sls create_domain --stage DEV` → crear CNAME en Cloudflare apuntando al target que imprime el plugin → `sls deploy --stage DEV`.

### Costos de dominios

Custom domain API Gateway (regional) y certificado ACM: **US$0**. Elastic IP (asociada a una instancia en ejecución): **US$0**. Solo pagarías Route53 (US$0.50/mes) si movieras la zona a Route53 — no es el caso.

## Despliegue

```bash
# DEV (stack names legacy):
bash infra/deploy-all.sh                          # VPC + IAM + Storage + IAM backup + Postgres (solo VPC privada, sin acceso externo)
bash infra/deploy-all.sh devGreipCompany us-east-2 '181.65.19.105'        # + acceso 5432/SSH solo desde tu IP
bash infra/deploy-all.sh devGreipCompany us-east-2 '181.65.19.105' true   # + ABRE 5432/SSH a 0.0.0.0/0 (cualquier IP)

# QA/PROD (VPCs separadas, mismo stack de IAM compartido):
ENVIRONMENT=QA   bash infra/deploy-all.sh devGreipCompany us-east-2 '181.65.19.105' false
ENVIRONMENT=PROD bash infra/deploy-all.sh devGreipCompany us-east-2 '181.65.19.105' false

# o paso a paso (DEV):
bash infra/vpc/deploy.sh devGreipCompany us-east-2 '' true                # greip-vpc (OpenToInternet=true)
bash infra/iam/deploy.sh            # greip-iam (solo la primera vez; el deploy-all lo omite si ya existe)
bash infra/storage/deploy.sh        # greip-storage
bash infra/iam/deploy-backup.sh     # greip-iam-backup
bash infra/postgres-ec2/deploy.sh devGreipCompany us-east-2 '' greip-dev-key   # EC2 + SSM
```

Cada script respeta `ENVIRONMENT` (default `DEV`). `OpenToInternet` (stack `greip-vpc`): `true` abre PostgreSQL 5432 y SSH 22 a `0.0.0.0/0`; `false` (default) no abre nada salvo el tráfico Lambda→Postgres por SG. `OfficeIp` sigue disponible para abrir solo a una IP (acepta IP plana y le agrega `/32`, o un CIDR completo). `OpenToInternet=true` está pensado **solo para DEV**.

Key pair para SSH (crear una sola vez):

```bash
aws ec2 create-key-pair --key-name greip-dev-key --query KeyMaterial --output text --region us-east-2 --profile devGreipCompany > ~/.ssh/greip-dev-key.pem
chmod 600 ~/.ssh/greip-dev-key.pem
```

## Post-deploy

1. **Secret en Secrets Manager** (uno por entorno):
   - `Greip/postgres/<STAGE>` (JSON) → `{host, port, db, user, pass}`
   - Lo leen las Lambdas con `secretsmanager:GetSecretValue` (policy `lambda-vpc-role` ya lo permite vía `secret:Greip/*`).
   - **Costo**: US$0.40/secret/mes (~US$1.20/mes los 3 entornos). No usa rotación automática (Postgres auto-gestionado; la rotación manual es `put-secret-value` + `ALTER ROLE`).
2. **Verificar PostgreSQL desde cualquier IP** (puerto 5432 abierto a `0.0.0.0/0`):
   ```bash
   psql -h dev.server.greip.com.pe -U greip_app -d greipdb -c "select version();"
   ```
3. **Verificar SSH desde cualquier IP** (puerto 22 abierto a `0.0.0.0/0`):
   ```bash
   ssh -i ~/.ssh/greip-dev-key.pem ec2-user@dev.server.greip.com.pe 'sudo systemctl is-active postgresql && sudo cat /var/log/user-data.log'
   ```
4. **Endpoint VPC a usar en los servicios** (serverless-config.yml):
   - `vpcSecurityGroupId` → output `LambdaSecurityGroupId`
   - `vpcSubnetId1/2` → output `PrivateSubnetId`
   - `role` → `arn:aws:iam::918897411288:role/lambda-vpc-role`
   - `lyCommonNew` → versión de la capa `ly-nodejs-ts-common` (ver `../layers`)
   - `lyPgNew` → versión de la capa `ly-nodejs-ts-postgresdb` (PostgreSQL: ARN `arn:aws:lambda:us-east-2:918897411288:layer:ly-nodejs-ts-postgresdb:1`)
   - `lyOracleNew` → versión de la capa `ly-nodejs-ts-oracledb` (Oracle, si algún día aplica: ARN `arn:aws:lambda:us-east-2:918897411288:layer:ly-nodejs-ts-oracledb:1`)

## Operación: apagar/encender y backups

### Apagar/encender la EC2 (stop/start)

**No cambia nada de IPs ni DNS** porque la instancia tiene Elastic IP:

| Recurso | Al apagar | Al encender |
|---------|-----------|-------------|
| IP pública `3.15.50.19` (EIP) | Se mantiene | Igual |
| IP privada `10.0.0.48` | Se mantiene | Igual (Lambdas y SSM intactos) |
| `dev.server.greip.com.pe` | Sigue resolviendo (la BD no responde) | Funciona |
| Datos (EBS 20GB) | Se conservan | Igual |

**Costo real mientras está apagada** (economiza poco):

| Concepto | Corriendo | Apagada |
|----------|-----------|---------|
| Cómputo t3.micro | ~US$7/mes | **US$0** |
| Elastic IP desasociada | US$0 | **~US$3.60/mes** |
| Disco EBS 20GB gp3 | ~US$1.60/mes | ~US$1.60/mes |
| Endpoint CloudWatch Logs | ~US$7/mes | ~US$7/mes |
| Endpoint Secrets Manager | ~US$7/mes | ~US$7/mes |
| **Neto** | | **ahorro ~US$2/mes** |

> ⚠️ **NUNCA usar `terminate`**: elimina el disco EBS (pierdes Postgres y la data), la IP privada cambia (SSM y Lambdas quedan obsoletos) y la Elastic IP queda cobrando huérfana. Para ahorrar de verdad: `stop` + liberar la EIP + borrar el A record; al volver, reasociar/recrear.

### Backups automáticos (pg_dump → S3)

- **Qué**: `pg_dump` de `greipdb` comprimido, cada **02:30 UTC** vía **systemd timer** (`greip-backup.timer`, `Persistent=true` → si la instancia estaba apagada, corre al encender).
- **Dónde**: `s3://bk-greip-<env>/backups/greipdb_YYYYMMDD_HHMMSS.sql.gz`
- **Retención**: **7 días** (lifecycle rule `GreipBackupsRetention` en el bucket, incluye versiones no actuales).
- **Permisos**: instance profile `greip-ec2-backup-profile[-<ENV>]` (rol `greip-ec2-backup[-<ENV>]`, solo S3 `bk-greip-<env>/backups/*`) — definido en `infra/iam/ec2-backup-role.yml` (stack `greip-iam-backup[-<ENV>]`).
- **Script**: `/usr/local/bin/greip-pg-backup.sh` en el EC2 (usa `sudo -u postgres pg_dump`, no necesita password). **La versión del repo** está en `infra/postgres-ec2/greip-pg-backup.sh` + units `greip-backup.{service,timer}`; el bucket se configura en `/etc/greip-backup.env` (`BUCKET=bk-greip-<env>`).
- El rol también incluye `AmazonSSMManagedInstanceCore` (permite usar Session Manager si se quiere).

> **QA/PROD**: al desplegar un EC2 nuevo, asociar el instance profile del entorno y ejecutar la instalación:
> `echo "BUCKET=bk-greip-qa" | sudo tee /etc/greip-backup.env` (+ copiar script y units, ver comentarios del script).

**Restaurar un backup**:

```bash
aws s3 cp s3://bk-greip-dev/backups/greipdb_<fecha>.sql.gz - --region us-east-2 --profile devGreipCompany | gunzip | psql -h dev.server.greip.com.pe -U greip_app -d greipdb
```

**Ver logs / probar manualmente**:

```bash
ssh -i ~/.ssh/greip-dev-key.pem ec2-user@dev.server.greip.com.pe \
  'sudo systemctl list-timers greip-backup.timer && sudo journalctl -u greip-backup.service -n 5'
```

## Costo estimado (DEV)

| Recurso | Mes |
|---------|-----|
| EC2 t3.micro (24/7) | ~US$7 |
| Interface endpoint CloudWatch Logs | ~US$7 |
| Interface endpoint Secrets Manager | ~US$7 |
| Secrets Manager (`Greip/postgres/dev`) | ~US$0.40 |
| DynamoDB / S3 / Lambda / API Gateway (uso dev) | ~US$0–2 |
| **Total** | **~US$23/mes** |
