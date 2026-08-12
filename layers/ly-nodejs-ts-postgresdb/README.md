# PostgreSQL Layer for Lambda (GREIP COMPANY)

Layer de Lambda en TypeScript para interactuar con bases de datos **PostgreSQL** mediante `node-postgres` (`pg`), con integración a AWS Secrets Manager para la gestión segura de credenciales. Diseñada para los microservicios de GREIP COMPANY (región `us-east-2`, perfil `devGreipCompany`).

## Layer publicada

```text
arn:aws:lambda:us-east-2:918897411288:layer:ly-nodejs-ts-postgresdb:1
```

## Características

- Pool de conexiones PostgreSQL (`pg.Pool`) reutilizable entre invocaciones Lambda
- Obtención automática de credenciales desde AWS Secrets Manager (`Greip/postgres/<STAGE>`)
- Soporte para SELECT, INSERT, UPDATE, DELETE
- Transacciones con control de aislamiento (COMMIT/ROLLBACK automáticos)
- Inserciones masivas (`executeMany`) en una sola transacción
- Paginación LIMIT/OFFSET
- Health check (`SELECT 1`)
- Helper `buildSql` para binds nombrados `:name` → `$n` (estilo Oracle)
- Despliegue como Lambda Layer (perfil GREIP `devGreipCompany`)

## Instalación y despliegue

```bash
npm install

npm run build          # compila TypeScript (dist/)
npm run package        # crea el paquete para Lambda Layer (nodejs/)
npm run deploy         # perfil por defecto
npm run deploy:dev     # perfil devGreipCompany (us-east-2)
```

## Configuración

### Variables de entorno

| Variable | Descripción | Obligatorio |
|---|---|---|
| `AWS_REGION` | Región de AWS (por defecto: `us-east-2`) | No |
| `PG_SECRET_NAME` | Nombre del secret en AWS Secrets Manager | Sí |

### Estructura del secreto en AWS Secrets Manager

El secret debe contener un JSON con la siguiente estructura (la crea `infra/postgres-ec2/deploy.sh`):

```json
{
  "host": "10.0.0.48",
  "port": 5432,
  "db": "greipdb",
  "user": "greip_app",
  "pass": "<password>",
  "ssl": false,
  "poolMax": 5,
  "connectionTimeoutMillis": 5000
}
```

> `host`/`port`/`db`/`user`/`pass` son obligatorios. El resto es opcional. Para el EC2 Postgres de GREIP se usa la IP privada de la VPC.

## API Reference

### `PostgresDatabaseService`

```typescript
import { PostgresDatabaseService } from 'ly-nodejs-ts-postgresdb';

const db = new PostgresDatabaseService('Greip/postgres/DEV');
```

| Método | Descripción |
|---|---|
| `getPool()` | Obtiene (o crea) el pool de conexiones |
| `getClient()` | Obtiene un cliente del pool (para transacciones) |
| `execute<T>(sql, params?)` | Ejecuta cualquier sentencia con placeholders `$1..$n` → `QueryResult` |
| `executeOne<T>(sql, params?)` | Un solo registro (o `null`) |
| `executeUpdate(sql, params?, options?)` | DML → filas afectadas |
| `executeMany(sql, values, options?)` | Misma sentencia con varios sets de parámetros (en transacción) |
| `executeTransaction<T>(operations, options?)` | Transacción con COMMIT/ROLLBACK automáticos |
| `getScalar<T>(sql, params?)` | Primera columna del primer registro |
| `exists(sql, params?)` | → boolean |
| `paginate<T>(sql, countSql, params, pagination)` | Paginación LIMIT/OFFSET → `PaginatedResult` |
| `healthCheck()` | `SELECT 1` → boolean |
| `close()` | Cierra el pool |

### `buildSql` (binds nombrados estilo Oracle)

```typescript
import { buildSql } from 'ly-nodejs-ts-postgresdb';

const { sql, values } = buildSql(
  'SELECT * FROM users WHERE id = :id AND email = :email',
  { id: 1, email: 'a@b.c' }
);
// sql:    'SELECT * FROM users WHERE id = $1 AND email = $2'
// values: [1, 'a@b.c']
```

## Ejemplo completo

```typescript
import { PostgresDatabaseService } from 'ly-nodejs-ts-postgresdb';

export const handler = async (event: any) => {
  const db = new PostgresDatabaseService(process.env.PG_SECRET_NAME ?? 'Greip/postgres/DEV');

  try {
    const user = await db.executeOne(
      'SELECT nombre, email FROM usuarios WHERE cod_usuario = $1',
      [event.userId]
    );

    if (!user) {
      return { statusCode: 404, body: 'Usuario no encontrado' };
    }

    const total = await db.getScalar<number>(
      'SELECT COUNT(*) FROM transacciones WHERE cod_usuario = $1',
      [event.userId]
    );

    return { statusCode: 200, body: { user, totalTransacciones: total } };

  } finally {
    await db.close();
  }
};
```

### Transacción

```typescript
const result = await db.executeTransaction(async (client) => {
  await client.query(
    'UPDATE cuentas SET saldo = saldo - $1 WHERE cod_cuenta = $2',
    [100, cuentaOrigen]
  );
  await client.query(
    'UPDATE cuentas SET saldo = saldo + $1 WHERE cod_cuenta = $2',
    [100, cuentaDestino]
  );
  return { success: true };
}, { isolationLevel: 'READ COMMITTED' });
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run build` | Compila TypeScript a JS |
| `npm run package` | Crea el paquete para Lambda Layer |
| `npm run deploy` | Despliega a AWS (perfil por defecto) |
| `npm run deploy:dev` | Despliega a AWS (perfil devGreipCompany) |
| `npm run clean` | Limpia `dist` y `nodejs` |
