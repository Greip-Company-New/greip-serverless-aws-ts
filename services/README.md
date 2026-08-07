# Servicios de GREIP COMPANY

Cada servicio es un proyecto Serverless independiente, orquestado por `serverless-compose.yml` en la raíz.

## Servicios

| Servicio | Dominio | Persistencia | Base path | Estado |
|----------|---------|--------------|-----------|--------|
| `service-catalogs` | Catálogos (productos) | Postgres en EC2 | `/srv-catalogs` | Nuevo (reemplaza a service-core-be); pendiente de deploy |
| `service-security` | Seguridad (auth, usuarios, RBAC, auditoría) | DynamoDB + Postgres en EC2 | `/srv-security` | Estructura completa, build/tests OK en DEV |
| `service-canales` | Canales (usuarios, archivos) | DynamoDB + S3 | `/srv-canales` | Pendiente |
| `service-cross` | Transversal (email, SMS, cifrado token) | Sin persistencia | `/srv-cross` | Estructura completa, build/tests OK |

## Convención de nomenclatura

- **Atributos (JSON)** de request/response en camelCase en **inglés**: `documentType`, `firstName`, `status`, `createdAt`, `page`, `pageSize`, etc.
- **Campos de base de datos** (PostgreSQL y DynamoDB) en **inglés**: `code`, `name`, `status`, `first_name`, `created_at`, `documentKey`, `IdxUserEmail`, etc.
- **Actions** de las lambdas en inglés: `createUser`, `listProducts`, `verifyMfa`, `listAudit`, etc.
- Los mensajes y la documentación dirigidos al usuario final se mantienen en **español** (convención de GREIP COMPANY).

## Integración de las capas

Cada servicio referencia las capas publicadas en `functions.yml` (ver `../layers`):

- `ly-nodejs-ts-common` (ResponseFactory, bootstrap, helpers) — config key `lyCommonNew`
- `ly-nodejs-ts-postgresdb` (acceso a PostgreSQL) — config key `lyPgNew`
- `ly-nodejs-ts-oracledb` (acceso a Oracle, si aplica) — config key `lyOracleNew`

ARNs (us-east-2, cuenta 918897411288):

```
arn:aws:lambda:us-east-2:918897411288:layer:ly-nodejs-ts-common:1
arn:aws:lambda:us-east-2:918897411288:layer:ly-nodejs-ts-postgresdb:1
arn:aws:lambda:us-east-2:918897411288:layer:ly-nodejs-ts-oracledb:1
```

**Ejemplo en `functions.yml` (patrón del arquetipo):**

```yaml
MI_LAMBDA:
    handler: dist/mi-lmb/app.handler
    layers:
      - arn:aws:lambda:${self:provider.region}:${self:custom.config.idAwsAccount.${self:custom.stageDeploy}}:layer:ly-nodejs-ts-common:${self:custom.config.lyCommonNew.${self:custom.stageDeploy}}
      - arn:aws:lambda:${self:provider.region}:${self:custom.config.idAwsAccount.${self:custom.stageDeploy}}:layer:ly-nodejs-ts-postgresdb:${self:custom.config.lyPgNew.${self:custom.stageDeploy}}
```

**4. En `package.json` del servicio** (dependencia `file:` para los tipos en build — la ruta es relativa a `services/<servicio>`):

```json
"devDependencies": {
  "ly-nodejs-ts-common": "file:../../layers/ly-nodejs-ts-common",
  "ly-nodejs-ts-postgresdb": "file:../../layers/ly-nodejs-ts-postgresdb"
}
```

**5. Publicar una nueva versión de una capa** (cuando cambie su `src`):

```bash
cd layers/ly-nodejs-ts-common
AWS_REGION=us-east-2 bash deploy-layer.sh devGreipCompany
# Registrar el nuevo número de versión en lyCommonNew
```
