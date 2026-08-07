# OracleDB Layer for Lambda (GREIP COMPANY)

Layer de Lambda en TypeScript para interactuar con bases de datos Oracle mediante `oracledb`, con integración a AWS Secrets Manager para la gestión segura de credenciales. Adaptada al estándar de GREIP COMPANY (región `us-east-2`, perfil `devGreipCompany`).

## Layer publicada

```text
arn:aws:lambda:us-east-2:918897411288:layer:ly-nodejs-ts-oracledb:1
```

## Características

- Conexión directa a Oracle Database vía `oracledb`
- Obtención automática de credenciales desde AWS Secrets Manager
- Soporte para consultas SELECT, INSERT, UPDATE, DELETE, MERGE
- Ejecución de procedimientos y funciones almacenadas
- Transacciones con control de aislamiento
- Paginación de resultados
- Validación de conexión (health check)
- Despliegue como Lambda Layer (perfil GREIP `devGreipCompany`)

## Instalación y despliegue

```bash
npm install

npm run build          # compila TypeScript
npm run package        # crea el paquete para Lambda Layer
npm run deploy         # perfil por defecto
npm run deploy:dev     # perfil devGreipCompany (us-east-2)
```

## Configuración

### Variables de entorno

| Variable | Descripción | Obligatorio |
|---|---|---|
| `AWS_REGION` | Región de AWS (por defecto: `us-east-2`) | No |
| `ORACLE_SECRET_NAME` | Nombre del secreto en AWS Secrets Manager | Sí |

### Estructura del secreto en AWS Secrets Manager

El secreto debe contener un JSON con la siguiente estructura (`userdb` y `passdb` codificados en base64):

```json
{
  "userdb": "<usuario_en_base64>",
  "passdb": "<contraseña_en_base64>",
  "hostdb": "<host>:<puerto>/<service_name>",
  "externalAuth": false,
  "stmtCacheSize": 30,
  "edition": "",
  "events": false
}
```

## API Reference

### `OracleDatabaseService`

```typescript
import { OracleDatabaseService } from 'ly-nodejs-ts-oracledb';

const db = new OracleDatabaseService('Greip/oracle/database');
```

| Método | Descripción |
|---|---|
| `getConnection()` | Obtiene o reutiliza la conexión (credenciales desde Secrets Manager) |
| `execute<T>(sql, binds?, options?)` | Ejecuta cualquier sentencia (SELECT, INSERT, UPDATE, DELETE, BEGIN/END, funciones, procedimientos) → `QueryResult` |
| `executeOne<T>(sql, binds?, options?)` | Un solo registro (o `null`) |
| `executeUpdate(sql, binds?, autoCommit?)` | DML con `autoCommit: true` → filas afectadas |
| `executeMany(sql, binds, options?)` | Misma sentencia con varios sets de parámetros → total filas |
| `executeTransaction<T>(operations, options?)` | Transacción con COMMIT/ROLLBACK automáticos |
| `close()` | Cierra la conexión |
| `healthCheck()` | `SELECT 1 FROM DUAL` → boolean |
| `callProcedure(name, binds?, options?)` | Ejecuta procedimiento almacenado |
| `callFunction<T>(name, returnType, binds?, options?)` | Ejecuta función almacenada |
| `getScalar<T>(sql, binds?, options?)` | Primera columna del primer registro |
| `exists(sql, binds?, options?)` | `SELECT COUNT(*) FROM ({sql})` → boolean |
| `paginate<T>(sql, countSql, binds, pagination, options?)` | Paginación OFFSET/FETCH → `PaginatedResult` |

## Ejemplo completo

```typescript
import { OracleDatabaseService } from 'ly-nodejs-ts-oracledb';

export const handler = async (event: any) => {
  const db = new OracleDatabaseService(process.env.ORACLE_SECRET_NAME!);

  try {
    const user = await db.executeOne(
      'SELECT nombre, email FROM usuarios WHERE cod_usuario = :id',
      [event.userId]
    );
    return { statusCode: 200, body: user };
  } finally {
    await db.close();
  }
};
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run build` | Compila TypeScript a JS |
| `npm run package` | Crea el paquete para Lambda Layer |
| `npm run deploy` | Despliega a AWS (perfil por defecto) |
| `npm run deploy:dev` | Despliega a AWS (perfil devGreipCompany) |
| `npm run clean` | Limpia `dist` y `nodejs` |
