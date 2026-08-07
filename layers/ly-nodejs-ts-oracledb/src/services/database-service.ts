// src/services/OracleDatabaseService.ts
import * as oracledb from 'oracledb';
import { AwsSecretsManager } from '../secrets/aws-secrets-manager';
import { BindDirections, OracleConfigDirect, OracleTypes, PaginatedResult, PaginationOptions, QueryResult } from '../types/database.types';

export class OracleDatabaseService {
    private config: OracleConfigDirect | null = null;
    private connection: oracledb.Connection | null = null;
    private secretName: string;

    constructor(secretName: string) {
        this.secretName = secretName;
    }

    /**
     * Obtener conexión
     */
    async getConnection(): Promise<oracledb.Connection> {
        if (this.connection) {
            return this.connection;
        }

        if (!this.secretName) {
            throw new Error('El secretName no puede ser nulo o vacio')
        }

        const secretsManager = new AwsSecretsManager();
        this.config = await secretsManager.getOracleCredentialsDirect(this.secretName);

        this.connection = await oracledb.getConnection({
            user: this.config.userdb,
            password: this.config.passdb,
            connectString: this.config.hostdb,
            externalAuth: this.config.externalAuth,
            stmtCacheSize: this.config.stmtCacheSize,
            edition: this.config.edition,
            events: this.config.events
        });

        return this.connection;
    }

    /**
     * Ejecuta cualquier Sentencia de Oracle (Select, Insert, Update, Delete, Begin/End, Functions, Procedures, etc)
     * @param sql Setencia SQL
     * @param binds Parametros de la Sentencia SQL
     * @param options Opciones de la ejecucion
     * @returns QueryResult
     */
    async execute<T = any>(
        sql: string,
        binds: oracledb.BindParameters = {}, // No puede ser undefined
        options: oracledb.ExecuteOptions = {}
    ): Promise<QueryResult> {

        const connection = await this.getConnection();

        // Configurar opciones por defecto
        const executeOptions: oracledb.ExecuteOptions = {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            autoCommit: false,
            ...options
        };

        const result = await connection.execute(sql, binds, executeOptions);

        return {
            rows: (result.rows as T[]) || [],
            rowsAffected: result.rowsAffected || 0,
            outBinds: result.outBinds || null,
            count: result.rows?.length || 0
        };
    }

    /**
     * Ejecuta una Sentencia Select y devuelve un solo registro
     * @param sql Setencia SQL
     * @param binds Parametros de la Sentencia SQL
     * @param options Opciones de la ejecucion
     * @returns T
     */
    async executeOne<T = any>(
        sql: string,
        binds: oracledb.BindParameters = {},
        options: oracledb.ExecuteOptions = {}
    ): Promise<T | null> {

        const result = await this.execute<T>(sql, binds, {
            ...options,
            maxRows: 1
        });

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Ejecuta una sentencia MML con autocommit=true
     * @param sql Sentencia SQL Insert, Update, Delete, Merge
     * @param binds Objteto Json de parametros requeridos en la consulta SQL.
     * @param autoCommit Se puede solicitar autocomit false.
     * @returns Cantidad de filas afectadas
     */
    async executeUpdate(
        sql: string,
        binds: oracledb.BindParameters = {},
        autoCommit: boolean = true
    ): Promise<number> {

        const result = await this.execute(sql, binds, { autoCommit });
        return result.rowsAffected || 0;
    }

    /**
     * Ejecuta la misma sentencia SQL con varios sets de parametros y de opciones
     * @param sql 
     * @param binds 
     * @param options 
     * @returns 
     */
    async executeMany(
        sql: string,
        binds: any[][],
        options: oracledb.ExecuteManyOptions = {}
    ): Promise<number> {

        const connection = await this.getConnection();

        const executeManyOptions: oracledb.ExecuteManyOptions = {
            batchErrors: true,
            autoCommit: true,
            ...options
        };

        const result = await connection.executeMany(sql, binds, executeManyOptions);

        if (Array.isArray(result.rowsAffected)) {
            return result.rowsAffected.reduce((sum, num) => sum + (num || 0), 0);
        }

        return result.rowsAffected || 0;
    }

    /**
     * Ejecutar en transacción
     */
    async executeTransaction<T>(
        operations: (connection: oracledb.Connection) => Promise<T>,
        options?: {
            autoCommit?: boolean;
            isolationLevel?: 'READ_COMMITTED' | 'SERIALIZABLE';
        }
    ): Promise<T> {

        const connection = await this.getConnection();

        try {
            if (options?.isolationLevel) {
                await connection.execute(
                    `SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`
                );
            }

            const result = await operations(connection);

            if (options?.autoCommit !== false) {
                await connection.commit();
            }

            return result;

        } catch (error) {
            await connection.rollback();
            throw error;
        }
    }

    /**
     * Cierra la conexion de la clase.
     */
    async close(): Promise<void> {
        if (this.connection) {
            try {
                await this.connection.close();
            } catch (error) {
                console.error('Error cerrando conexión:', error);
            } finally {
                this.connection = null;
            }
        }
    }

    /**
     * Valida la conexion a la base de datos
     * @returns boolean true: conexion es valida, false conexion no es valida.
     */
    async healthCheck(): Promise<boolean> {
        try {
            const result = await this.executeOne<{ STATUS: number }>(
                'SELECT 1 as status FROM DUAL',
                {} // binds vacíos explícitos
            );
            console.log("result >>", result)
            return result?.STATUS === 1;
        } catch (error) {
            console.log('error >> ', error)
            return false;
        }
    }

    /**
     * Permite ejecutar un procedimiento almacenado
     * @param procedureName nombre del procedimiento almacenado
     * @param binds parametros del procedimiento almacenado
     * @param options opciones de la ejecucion del procedimiento almacenado
     * @returns 
     */
    async callProcedure(
        procedureName: string,
        binds: oracledb.BindParameters = {},
        options?: oracledb.ExecuteOptions
    ): Promise<QueryResult> {
        const bindNames = Object.keys(binds);
        const placeholders = bindNames.map(name => `:${name}`).join(', ');
        const sql = `BEGIN ${procedureName}(${placeholders}); END;`;

        return this.execute(sql, binds, options);
    }

    async callFunction<T = any>(
        functionName: string,
        returnType: number | oracledb.DbType = OracleTypes.STRING,
        binds: oracledb.BindParameters = {},
        options?: oracledb.ExecuteOptions
    ): Promise<T> {
        const bindNames = Object.keys(binds);
        const placeholders = bindNames.map(name => `:${name}`).join(', ');

        const sql = `BEGIN :result := ${functionName}(${placeholders}); END;`;

        const allBinds = {
            ...binds,
            result: { dir: BindDirections.OUT, type: returnType, maxSize: 4000 }
        };

        const result = await this.execute(sql, allBinds, {
            ...options,
            autoCommit: false
        });

        return result.outBinds?.result?.[0];
    }

    async getScalar<T = any>(
        sql: string,
        binds: oracledb.BindParameters = {},
        options?: oracledb.ExecuteOptions
    ): Promise<T | null> {
        const result = await this.execute<any>(sql, binds, options);
        const row = result.rows[0];

        if (!row) return null;

        if (typeof row === 'object') {
            const keys = Object.keys(row);
            if (keys.length > 0) {
                return row[keys[0]];
            }
        }

        return row;
    }

    async exists(
        sql: string,
        binds: oracledb.BindParameters = {},
        options?: oracledb.ExecuteOptions
    ): Promise<boolean> {
        const countSql = `SELECT COUNT(*) as cnt FROM (${sql})`;
        const result = await this.getScalar<number>(countSql, binds, options);
        return (result || 0) > 0;
    }

    async paginate<T = any>(
        sql: string,
        countSql: string,
        binds: oracledb.BindParameters = {},
        pagination: PaginationOptions,
        options?: oracledb.ExecuteOptions
    ): Promise<PaginatedResult<T>> {
        const { page, pageSize } = pagination;
        const offset = (page - 1) * pageSize;

        const paginatedSql = `${sql} OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`;

        const paginatedBinds = {
            ...binds,
            offset,
            pageSize
        };

        const [dataResult, countResult] = await Promise.all([
            this.execute<T>(paginatedSql, paginatedBinds, options),
            this.execute<{ total: number }>(countSql, binds, options)
        ]);

        const total = countResult.rows[0]?.total || 0;

        return {
            data: dataResult.rows,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }

}