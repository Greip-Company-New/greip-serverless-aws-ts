# service-security

Microservicio de seguridad de GREIP COMPANY: autenticación (login, MFA, refresh, logout, recuperación de contraseña), usuarios + RBAC (roles/permisos) y auditoría. Persistencia híbrida: **DynamoDB** (usuarios, sesiones, MFA, auditoría) + **PostgreSQL en EC2** (schema `greip`: tenant, person, RBAC, password_policy).

## Estado

Estructura completa y desplegable en **DEV** (us-east-2, cuenta 918897411288). Build y tests OK.

> **Atención (renombrado a inglés):** tras el refactor a atributos/campos en inglés se debe volver a aplicar el esquema y las tablas:
> - PostgreSQL: re-ejecutar `sql/security.sql` (columnas `code`, `name`, `status`, `first_name`, `father_last_name`, `document_type`, `document_number`, `created_at`, etc.).
> - DynamoDB: recrear la tabla `TBL_GREIP_USUARIOS_*` (atributo `documentKey`, GSIs `IdxUserEmail` / `IdxUserDocument`) — ver `infra/storage/storage.yml`.

## Estructura

```
serverless.yml            # build:false, plugins (domain-manager, offline), apiKeys + usagePlan, vpc, tracing, tags
serverless-config.yml     # DEV: region us-east-2, profile devGreipCompany, tablas DynamoDB, secret PG, layers
functions.yml             # AUTH_LMB, USUARIO_LMB, AUDIT_LMB, AUDIT_STREAM_LMB, BOOTSTRAP_LMB
config/serverless/        # http-cors.yml, http-response.yml, response.vm
config/serverless/request/src/<lmb>/  # *.vm (mapeo API Gateway -> action + payload)
src/
  auth-lmb/               # login, verifyMfa, refreshToken, logout, changePassword, requestRecovery, resetPassword
  usuario-lmb/            # createUser, updateUser, deleteUser, listUsers, getUser, assignRoles, removeRole, getUserPermissions, createRole, listRoles, listPermissions
  audit-lmb/              # listAudit, getAudit + stream.ts (procesador del DynamoDB Stream de USUARIOS)
  bootstrap/handler.ts    # utilidad manual: crea rol ADMIN con todos los permisos + usuario admin inicial
  common/                 # repos (dynamodb/, postgres/), mfa-service, sesion-service, usuario-service, token, password, totp, audit, middlewares (auth/rbac), constants, models
```

## Endpoints (base path `/srv-security`)

### auth (AUTH_LMB)
| Método | Path | Action |
|--------|------|--------|
| POST | `/auth/login` | `login` |
| POST | `/auth/mfa/verify` | `verifyMfa` |
| POST | `/auth/refresh` | `refreshToken` |
| POST | `/auth/logout` | `logout` |
| POST | `/auth/password/change` | `changePassword` |
| POST | `/auth/password/recovery` | `requestRecovery` |
| POST | `/auth/password/reset` | `resetPassword` |

### usuario (USUARIO_LMB)
| Método | Path | Action |
|--------|------|--------|
| POST | `/user` | `createUser` |
| GET | `/user` | `listUsers` |
| GET | `/user/{userId}` | `getUser` |
| PUT | `/user/{userId}` | `updateUser` |
| DELETE | `/user/{userId}` | `deleteUser` |
| POST | `/user/{userId}/roles` | `assignRoles` |
| DELETE | `/user/{userId}/roles/{roleId}` | `removeRole` |
| GET | `/user/{userId}/permissions` | `getUserPermissions` |
| GET | `/role` | `listRoles` |
| POST | `/role` | `createRole` |
| GET | `/permission` | `listPermissions` |

### auditoria (AUDIT_LMB)
| Método | Path | Action |
|--------|------|--------|
| GET | `/audit` | `listAudit` |
| GET | `/audit/{sk}` | `getAudit` |

Todos los endpoints son `private: true` (API Key + plan). Los de `usuario-lmb` y `audit-lmb` exigen además JWT Bearer y permisos RBAC (`user.*`, `role.manage`, `permission.read`, `audit.read`) resueltos por los middlewares `AuthMiddleware` / `RbacMiddleware`.

## Atributos de usuario (formato camelCase)

`userId`, `tenant`, `email`, `documentType`, `documentNumber`, `firstName`, `fatherLastName`, `motherLastName`, `phone`, `status`, `mfa`, `createdAt`, `updatedAt`.

Datos maestros de la persona en PostgreSQL (snake_case): `first_name`, `father_last_name`, `mother_last_name`, `document_type`, `document_number`, `phone`, `status`.

## Bootstrap (rol ADMIN + usuarios admin)

Sin evento HTTP; se invoca manualmente por CLI con las variables de entorno necesarias:

```bash
# Variables (provider.environment o evento de invocacion):
#   ADMIN_EMAIL, ADMIN_PASSWORD (obligatorio, >= 8 chars),
#   ADMIN_FIRST_NAME, ADMIN_FATHER_LAST_NAME, ADMIN_DOCUMENT_NUMBER
#   INFRA_EMAIL (default infra.cloud@greip.com.pe), INFRA_PASSWORD (obligatorio, >= 8 chars),
#   INFRA_FIRST_NAME, INFRA_FATHER_LAST_NAME, INFRA_DOCUMENT_NUMBER

aws lambda invoke --function-name SRV-SECURITY-LMB-BOOTSTRAP \
  --profile devGreipCompany --region us-east-2 \
  --payload '{}' /tmp/bootstrap-out.json
```

Crea el rol `ADMIN` con todos los permisos activos del tenant y los usuarios administradores por defecto `admin@greip.com.pe` y `infra.cloud@greip.com.pe` (idempotente).

## Bootstrap de infraestructura

Antes del primer deploy: aplicar `sql/security.sql` y `grants.sql` en el EC2 Postgres y crear las tablas DynamoDB con `infra/storage/storage.yml` (ver `../infra/README.md`).

## Configuración pendiente para QA/PROD

En `serverless-config.yml` reemplazar `PENDIENTE` por los outputs reales de los stacks `greip-vpc-{QA,PROD}` (SG + subnets) y completar el ARN de `dynamoStreamUsuarios` (se regenera si la tabla se recrea).
