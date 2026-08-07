import * as oracledb from 'oracledb';

export interface OracleConfig {
  userdb: string;
  passdb: string;
  hostdb: string;
  // Configuraciones específicas sin pool
  externalAuth?: boolean;
  privilege?: number;
  stmtCacheSize?: number;
  edition?: string;
  events?: boolean;
  // SSL/TLS
  walletLocation?: string;
  walletPassword?: string;

}

export interface OracleConfigDirect {
  userdb: string;
  passdb: string;
  hostdb: string;
  externalAuth?: boolean;
  stmtCacheSize?: number;
  edition?: string;
  events?: boolean;
}

export interface OracleConnectionConfig {
  userdb: string;
  passdb: string;
  hostdb: string;
  poolMin?: number;
  poolMax?: number;
  poolIncrement?: number;
  poolTimeout?: number;
  queueTimeout?: number;
  poolPingInterval?: number;
  stmtCacheSize?: number;
}

export interface AwsSecretConfig {
  secretName: string;
  region: string;
}

export interface QueryOptions {
  autoCommit?: boolean;
  outFormat?: number;
  fetchArraySize?: number;
  maxRows?: number;
  resultSet?: boolean;
  fetchInfo?: Record<string, { type: number }>;
  batchErrors?: boolean;
  dmlRowCounts?: boolean;
}

export interface BindParameters {
  [key: string]: any;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowsAffected?: number;
  outBinds?: any;
  count?: number;
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

export const OracleTypes = {
  STRING: oracledb.STRING,
  NUMBER: oracledb.NUMBER,
  DATE: oracledb.DATE,
  CLOB: oracledb.CLOB,
  BLOB: oracledb.BLOB,
  BUFFER: oracledb.BUFFER
} as const;

export const BindDirections = {
  IN: oracledb.BIND_IN,
  OUT: oracledb.BIND_OUT,
  INOUT: oracledb.BIND_INOUT
} as const;

export type OraclePool = oracledb.Pool;
export type OracleConnection = oracledb.Connection;
export type OracleResult<T = any> = oracledb.Result<T>;
export type OracleResults = oracledb.Results<any>;