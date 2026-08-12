export interface PostgresConfig {
  host: string;
  port: number;
  db: string;
  user: string;
  pass: string;
  /** Habilitar SSL: true, false u objeto { rejectUnauthorized }. El secret puede incluirlo (p.ej. con Let's Encrypt). */
  ssl?: boolean | { rejectUnauthorized?: boolean };
  poolMax?: number;
  poolMin?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statementTimeout?: number;
}

export interface PostgresPoolConfig {
  poolMax?: number;
  poolMin?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statementTimeout?: number;
}

export interface AwsSecretConfig {
  secretName: string;
  region: string;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command?: string;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
