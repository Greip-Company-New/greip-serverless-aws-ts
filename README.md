# greip-serverless-aws-ts

Monorepo de microservicios AWS Lambda (Serverless Framework + TypeScript) de GREIP COMPANY.

## Structure

```
serverless-compose.yml        # orquesta services/ vía `serverless deploy`
layers/
  ly-nodejs-ts-common/        # capa común compartida (ResponseFactory, bootstrap, Helpers, servicios AWS)
  ly-nodejs-ts-postgresdb/    # capa PostgreSQL (PostgresDatabaseService sobre pg, credenciales vía Secrets Manager)
  ly-nodejs-ts-oracledb/      # capa Oracle (traída por estándar del arquetipo; oracledb + Secrets Manager)
services/
  service-catalogs/           # microservicio de catalogos (catálogo de productos, Postgres en EC2) — nuevo, pendiente de deploy
  service-security/           # microservicio de seguridad (auth, usuarios+RBAC, auditoría; DynamoDB + Postgres) — completo en DEV
  service-cross/               # microservicio transversal (email, SMS, cifrado token) — estructura completa
api-contracts/                # contratos OpenAPI 3.0.3 (validación con npm test)
infra/                        # bootstrap de infraestructura (VPC, IAM, EC2 Postgres, storage DynamoDB/S3)
```

## Capas (layers)

Cada capa vive en `layers/` y se publica en AWS como Lambda Layer. Ver `layers/<capa>/README.md` para build + publicación.

Capas publicadas (DEV, us-east-2, cuenta 918897411288):

```
arn:aws:lambda:us-east-2:918897411288:layer:ly-nodejs-ts-common:1
arn:aws:lambda:us-east-2:918897411288:layer:ly-nodejs-ts-postgresdb:1
arn:aws:lambda:us-east-2:918897411288:layer:ly-nodejs-ts-oracledb:1
```

Versión referenciada en los `serverless-config.yml` de los servicios: `lyCommonNew`, `lyPgNew` y `lyOracleNew`.

Nueva versión de una capa:

```bash
cd layers/ly-nodejs-ts-common && AWS_REGION=us-east-2 bash deploy-layer.sh devGreipCompany
# Registrar el nuevo número de versión en lyCommonNew (idem lyPgNew / lyOracleNew)
```

## Commands

| Comando | Qué hace |
|---------|----------|
| `serverless deploy` | Despliega todos los servicios del compose |
| `npm install` | Instala dependencias del monorepo |

## Conventions

- Stage único por ahora: **DEV** (profile `devGreipCompany`, región `us-east-2`, cuenta `918897411288`).
- TypeScript ES2021 → CommonJS, `strict`, salida `dist/`.
- Serverless v4 con `build: false` (build propio vía `tsc + rsync`).
- No se commitean `package-lock.json` ni `*.lock`.
- **Nomenclatura en inglés**: atributos JSON en camelCase y campos de BD (PostgreSQL/DynamoDB) en inglés (ej. `documentType`, `status`, `created_at`, `documentKey`). Mensajes y documentación dirigidos al usuario final en español.
