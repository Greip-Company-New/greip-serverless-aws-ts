# service-catalogs

Microservicio de catálogos de GREIP COMPANY (catálogo de productos) sobre **PostgreSQL en EC2** (db `greipdb`, esquema `greip`, usuario `greip_app`).

## Estado

Servicio nuevo: reemplaza a `service-core-be`. Las APIs de productos ahora viven en este servicio (base path `/srv-catalogs`). Aún **no desplegado**.

> ⚠️ Al desplegar: eliminar el stack `service-core-be-DEV` y crear el custom domain / base path `/srv-catalogs` (ver `infra/README.md` - Dominios). El esquema `greip.product` en Postgres no cambia.

## Estructura

```
serverless.yml            # build:false, plugins (domain-manager, offline), apiKeys + usagePlan, vpc, tracing, tags
serverless-config.yml     # DEV: region us-east-2, profile devGreipCompany, subnets/SG, lyCommonNew + lyPgNew
functions.yml             # PRODUCT_LMB con 5 endpoints http private:true
config/serverless/        # http-cors.yml, http-response.yml, resources.yml, response.vm
config/serverless/request/src/product-lmb/  # *.vm (mapeo API Gateway -> action + payload)
src/product-lmb/          # app.ts, controller.ts, service.ts, repository.ts, query.ts, validate.ts, models.ts, constants.ts
test/product-lmb/         # constants, validate, controller, service specs
sql/                      # product.sql (schema + tabla), grants.sql
```

## Endpoints (base path `/srv-catalogs`)

| Método | Path                 | Action              |
|--------|----------------------|---------------------|
| GET    | `/product`           | `listProducts`      |
| GET    | `/product/{productId}` | `getProduct`      |
| POST   | `/product`           | `createProduct`     |
| PUT    | `/product/{productId}` | `updateProduct`   |
| DELETE | `/product/{productId}` | `deleteProduct`   |

Query params de `listProducts`: `page`, `pageSize` (max 100), `status` (`A`/`I`), `name` (filtro ILIKE).

Atributos del producto: `productId`, `name`, `description`, `price`, `currency`, `status`, `createdAt`, `updatedAt` (columna de tabla `greip.product`).

## Mensajes de respuesta

Las respuestas son explícitas por operación:

- **Éxito:** `Listado de productos obtenido exitosamente`, `Producto obtenido exitosamente (id=X)`, `Producto creado exitosamente (id=X)`, `Producto actualizado exitosamente (id=X)`, `Producto eliminado exitosamente (id=X)`.
- **Validación (400):** `Error de validación: <detalle Joi>` con `error.errors` = lista de mensajes de campo (ej. `"name is required"`).
- **No encontrado (404):** `Producto no encontrado (id=X)`.
- **Error interno (500):** `Error al <operación>: <mensaje>` (el detalle de la excepción queda en `error`).

## Credenciales

La Lambda lee el secret **`Greip/postgres/<STAGE>`** (Secrets Manager) vía `PG_SECRET_DB`:

```yaml
# provider.environment (serverless.yml)
PG_SECRET_DB: ${self:custom.config.secretDataBase.${self:custom.stageDeploy}}  # Greip/postgres/dev
```

## Capas

```yaml
# functions.yml
layers:
  - arn:aws:lambda:${self:provider.region}:${self:custom.config.idAwsAccount.${self:custom.stageDeploy}}:layer:ly-nodejs-ts-common:${self:custom.config.lyCommonNew.${self:custom.stageDeploy}}
  - arn:aws:lambda:${self:provider.region}:${self:custom.config.idAwsAccount.${self:custom.stageDeploy}}:layer:ly-nodejs-ts-postgresdb:${self:custom.config.lyPgNew.${self:custom.stageDeploy}}
```

- `ly-nodejs-ts-common` → `ResponseFactory`, `MESSAGES_*`, `HTTP`, `bootstrap`, `addMiddleware`, `ApiGatewayEvent`, `CANALES`
- `ly-nodejs-ts-postgresdb` → `PostgresDatabaseService` (pool cacheado), `buildSql`

## Deploy (DEV)

```bash
cd ../../services/service-catalogs
npm install
npm run build        # tsc + rsync -> dist/
npm test             # jest

# Flujo custom domain (ver infra/README.md - Dominios)
npx serverless create_domain --stage DEV              # crea el dominio con base path /srv-catalogs
npx serverless deploy --stage DEV                     # requiere profile devGreipCompany
```

Antes del deploy: crear la tabla con `sql/product.sql` en el EC2 Postgres (aplicado en DEV vía SSM) y eliminar el stack `service-core-be-DEV`.

> **Troubleshooting**: si el Lambda da timeout (28s), verificar el interface endpoint de VPC de **Secrets Manager** (`infra/vpc/vpc.yml`): la subred privada no tiene NAT, así que el acceso a Secrets Manager exige el endpoint creado en el stack `greip-vpc` (sin él, `GetSecretValue` cuelga).

## Configuración pendiente para QA/PROD

En `serverless-config.yml` reemplazar `PENDIENTE` por los outputs reales de los stacks `greip-vpc-{QA,PROD}` (SG + subnets) y verificar `domains`, `bucketDeploy` y `profile`.
