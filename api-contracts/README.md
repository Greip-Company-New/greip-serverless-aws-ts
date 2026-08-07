# API Contract - GREIP COMPANY

Contrato OpenAPI 3.0.3 y colección Postman de las APIs de GREIP COMPANY (DEV).

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `openapi.yaml` | Contrato OpenAPI 3.0.3 de `service-security` y `service-catalogs`. |
| `postman/Greip-Company.postman_collection.json` | Colección Postman (25 requests) lista para importar. |

## Flujo de prueba (DEV)

1. **Bootstrap** (una sola vez): invocar `SRV-SECURITY-LMB-BOOTSTRAP` por CLI para crear el rol `ADMIN`, el usuario admin inicial y asignar el rol. Las credenciales se pasan en el `env` del payload (el CLI v2 de AWS requiere el payload en **base64**):
   ```bash
   printf '%s' '{"env":{"ADMIN_EMAIL":"admin@greip.com.pe","ADMIN_PASSWORD":"Tu#Pass2026","ADMIN_FIRST_NAME":"Admin","ADMIN_FATHER_LAST_NAME":"Greip","ADMIN_DOCUMENT_NUMBER":"00000000"}}' \
     | base64 | aws lambda invoke --function-name SRV-SECURITY-LMB-BOOTSTRAP \
     --profile devGreipCompany --region us-east-2 --payload "$(cat)" /tmp/bootstrap-out.json
   cat /tmp/bootstrap-out.json
   ```

2. **Importar la colección** en Postman: `Import` → `postman/Greip-Company.postman_collection.json`.

3. **Configurar variables** de la colección:
   - `api-server` → `https://apidev.greip.com.pe`
   - `ak-service-security` → API Key de `service-security` (ya incluida por defecto)
   - `ak-service-catalogs` → API Key de `service-catalogs` (a definir por el usuario)

   API Keys DEV (recuperadas de API Gateway):
   - `service-security`: `<SECRETO: ver API Gateway / Secrets Manager>`
   - `service-catalogs`: `<SECRETO: ver API Gateway / Secrets Manager>`

   > Estas keys son de DEV. No commitearlas ni usarlas fuera del entorno DEV.

4. **Probar en orden**:
   - `Auth > Login` (guarda el `accessToken` en la variable `token` automáticamente).
   - `User > Create user` (guarda `userId`), `Role > Create role` (guarda `roleId`).
   - `User > Assign roles`, `User > Get user permissions`, etc.
   - `Product > Create product` (guarda `productId`) y el resto de CRUD.

## Formato de respuesta

Todas las Lambdas devuelven el cuerpo envuelto en `payload`:

```json
{
  "payload": {
    "success": true,
    "message": "Proceso completado exitosamente",
    "data": { },
    "statusCode": 200,
    "timestamp": "2026-08-07T14:51:10-04:00",
    "requestId": "6013cc6f-..."
  }
}
```

Los datos paginados incluyen `payload.metadata.pagination` (`page`, `limit`, `total`, `totalPages`, `hasNextPage`, `hasPrevPage`).

## Validar el contrato

```bash
# Parseo del YAML (js-yaml disponible en layers/ly-nodejs-ts-common/node_modules)
NODE_PATH=../layers/ly-nodejs-ts-common/node_modules node -e "
const fs = require('fs'); const yaml = require('js-yaml');
yaml.load(fs.readFileSync('openapi.yaml','utf8'));
console.log('openapi.yaml OK');"
```

Para una validación estructural completa (reglas OpenAPI) se puede usar `@apidevtools/swagger-cli` o `redocly`.

## Convención de nomenclatura

- Rutas y atributos en **inglés**: `/user`, `/role`, `/permission`, `/audit`, `/product`, `documentType`, `firstName`, `status`, `page`, `pageSize`, etc.
- Mensajes y descripciones al usuario final en **español**.
