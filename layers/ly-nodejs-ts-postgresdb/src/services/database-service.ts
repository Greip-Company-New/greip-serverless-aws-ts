// src/services/PostgresDatabaseService.ts
import { Pool, PoolClient, PoolConfig, QueryResultRow } from 'pg';
import { AwsSecretsManager } from '../secrets/aws-secrets-manager';
import { PaginatedResult, PaginationOptions, PostgresConfig, PostgresPoolConfig, QueryResult } from '../types/database.types';

export class PostgresDatabaseService {
    private pool: Pool | null = null;
    private secretName: string;
    private poolConfig: PostgresPoolConfig;

    /**
     * @param secretName Nombre del secret en Secrets Manager con {host, port, db, user, pass}
     *                   (p.ej. 'Greip/postgres/DEV')
     * @param poolConfig Overrides de configuracion del pool de conexiones
     */
    constructor(secretName: string, poolConfig: PostgresPoolConfig = {}) {
        this.secretName = secretName;
        this.poolConfig = poolConfig;
    }

    /**
     * Obtiene las credenciales desde Secrets Manager (una sola vez, el pool se cachea).
     */
    private async getConfig(): Promise<PostgresConfig> {
        if (!this.secretName) {
            throw new Error('El secretName no puede ser nulo o vacio');
        }
        const secretsManager = new AwsSecretsManager();
        return secretsManager.getPostgresCredentials(this.secretName);
    }

    /**
     * Obtiene (o crea) el pool de conexiones PostgreSQL.
     * En Lambda conviene reutilizar el pool entre invocaciones (conexiones warm).
     */
    async getPool(): Promise<Pool> {
        if (this.pool) {
            return this.pool;
        }

        const config = await this.getConfig();

        const poolConfig: PoolConfig = {
            host: config.host,
            port: config.port,
            database: config.db,
            user: config.user,
            password: config.pass,
            ssl: config.ssl,
            max: this.poolConfig.poolMax ?? config.poolMax ?? 5,
            min: this.poolConfig.poolMin ?? config.poolMin ?? 0,
            idleTimeoutMillis: this.poolConfig.idleTimeoutMillis ?? config.idleTimeoutMillis ?? 30000,
            connectionTimeoutMillis: this.poolConfig.connectionTimeoutMillis ?? config.connectionTimeoutMillis ?? 5000,
            statement_timeout: this.poolConfig.statementTimeout ?? config.statementTimeout,
            application_name: 'greip-postgres-layer'
        };

        // Descartar claves undefined para no romper la validacion de pg
        (Object.keys(poolConfig) as (keyof PoolConfig)[]).forEach((key) => {
            const value = poolConfig[key];
            if (value === undefined || value === null) {
                delete poolConfig[key];
            }
        });

        this.pool = new Pool(poolConfig);
        return this.pool;
    }

    /**
     * Obtiene un cliente del pool (para transacciones). Liberalo con client.release().
     */
    async getClient(): Promise<PoolClient> {
        const pool = await this.getPool();
        return pool.connect();
    }

    /**
     * Ejecuta cualquier sentencia SQL (SELECT, INSERT, UPDATE, DELETE) con parametros posicionales $1, $2, ...
     * @param sql Sentencia SQL con placeholders $1, $2, ...
     * @param params Valores posicionales de los placeholders
     * @returns QueryResult { rows, rowCount, command }
     */
    async execute<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
        const pool = await this.getPool();
        const result = await pool.query<T>(sql, params);
        return {
            rows: result.rows,
            rowCount: result.rowCount ?? 0,
            command: result.command
        };
    }

    /**
     * Ejecuta una consulta SELECT y devuelve un solo registro (o null si no hay resultados).
     */
    async executeOne<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<T | null> {
        const result = await this.execute<T>(sql, params);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Ejecuta una sentencia DML (INSERT, UPDATE, DELETE) y retorna las filas afectadas.
     * @param statementTimeout Opcional: timeout de la sentencia en milisegundos
     */
    async executeUpdate(sql: string, params: any[] = [], options?: { statementTimeout?: number }): Promise<number> {
        const client = await this.getClient();
        try {
            if (options?.statementTimeout) {
                await client.query('SET statement_timeout = $1', [options.statementTimeout]);
            }
            const result = await client.query(sql, params);
            return result.rowCount ?? 0;
        } finally {
            client.release();
        }
    }

    /**
     * Ejecuta la misma sentencia SQL con multiples sets de parametros (inserciones masivas),
     * en una sola transaccion. Retorna el total de filas afectadas.
     */
    async executeMany(sql: string, values: any[][], options?: { chunkSize?: number }): Promise<number> {
        const client = await this.getClient();
        const chunkSize = options?.chunkSize ?? 1000;
        let total = 0;
        try {
            await client.query('BEGIN');
            for (let i = 0; i < values.length; i += chunkSize) {
                const chunk = values.slice(i, i + chunkSize);
                for (const row of chunk) {
                    const result = await client.query(sql, row);
                    total += result.rowCount ?? 0;
                }
            }
            await client.query('COMMIT');
            return total;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Ejecuta operaciones dentro de una transaccion.
     * Si ocurre un error se ejecuta rollback automaticamente; por defecto hace commit al finalizar.
     */
    async executeTransaction<T>(
        operations: (client: PoolClient) => Promise<T>,
        options?: { isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE' }
    ): Promise<T> {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            if (options?.isolationLevel) {
                await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
            }
            const result = await operations(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Ejecuta una consulta y retorna el valor de la primera columna del primer registro.
     */
    async getScalar<T = any>(sql: string, params: any[] = []): Promise<T | null> {
        const result = await this.execute<any>(sql, params);
        const row = result.rows[0];
        if (!row) {
            return null;
        }
        const values = Object.values(row);
        return values.length > 0 ? (values[0] as T) : null;
    }

    /**
     * Verifica si existe al menos un registro que cumpla la condicion.
     */
    async exists(sql: string, params: any[] = []): Promise<boolean> {
        const result = await this.execute<any>(sql, params);
        return result.rows.length > 0;
    }

    /**
     * Ejecuta una consulta paginada (LIMIT/OFFSET).
     * @param countSql Consulta COUNT que use los mismos placeholders posicionales que sql
     */
    async paginate<T extends QueryResultRow = any>(
        sql: string,
        countSql: string,
        params: any[] = [],
        pagination: PaginationOptions,
        options?: { statementTimeout?: number }
    ): Promise<PaginatedResult<T>> {
        const { page, pageSize } = pagination;
        const offset = (page - 1) * pageSize;

        const paginatedSql = `${sql} LIMIT ${pageSize} OFFSET ${offset}`;

        const [dataResult, countResult] = await Promise.all([
            this.execute<T>(paginatedSql, params),
            this.execute<{ total: number }>(countSql, params)
        ]);

        const total = Number(countResult.rows[0]?.total) || 0;

        return {
            data: dataResult.rows,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }

    /**
     * Valida la conexion a la base de datos (SELECT 1).
     */
    async healthCheck(): Promise<boolean> {
        try {
            const result = await this.execute<{ status: number }>('SELECT 1 as status');
            return result.rows[0]?.status === 1;
        } catch (error) {
            console.error('Error en health check de PostgreSQL:', error);
            return false;
        }
    }

    /**
     * Cierra el pool de conexiones de la clase.
     */
    async close(): Promise<void> {
        if (this.pool) {
            try {
                await this.pool.end();
            } catch (error) {
                console.error('Error cerrando pool de PostgreSQL:', error);
            } finally {
                this.pool = null;
            }
        }
    }
}

/**
 * Convierte parametros nombrados ':name' en la sentencia SQL a placeholders posicionales $1, $2, ...
 * Util para quien viene de Oracle y prefiere binds nombrados.
 *
 * @example
 * const { sql, values } = buildSql('SELECT * FROM users WHERE id = :id AND email = :email', { id: 1, email: 'a@b.c' });
 * // sql: 'SELECT * FROM users WHERE id = $1 AND email = $2'   values: [1, 'a@b.c']
 */
export function buildSql(sql: string, params: Record<string, any>): { sql: string; values: any[] } {
    const values: any[] = [];
    const keys: string[] = [];

    const replaced = sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, key: string) => {
        if (!keys.includes(key)) {
            keys.push(key);
            values.push(params[key]);
        }
        return `$${keys.indexOf(key) + 1}`;
    });

    return { sql: replaced, values };
}
