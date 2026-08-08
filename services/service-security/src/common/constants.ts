// Constantes globales de service-security (GREIP COMPANY).

export const STATUS_ACTIVE = 'A';
export const STATUS_INACTIVE = 'I';

export const DOCUMENT_TYPES = ['D', 'R', 'C'] as const;
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  D: 'DNI',
  R: 'RUC',
  C: 'Carnet de Extranjeria'
};

// Canales MFA soportados
export const MFA_CHANNELS = ['TOTP', 'SMS', 'EMAIL'] as const;
export const TOKEN_TYPE_ACCESS = 'ACCESS';
export const TOKEN_TYPE_MFA = 'MFA';
export const TOKEN_TYPE_RESET = 'RESET';
export const TOKEN_TYPE_REFRESH = 'REFRESH';

// Duraciones (en minutos) de tokens JWT
export const ACCESS_TOKEN_TTL_MIN = 15;
export const MFA_TOKEN_TTL_MIN = 5;
export const RESET_TOKEN_TTL_MIN = 10;

// Sesiones
export const REFRESH_TOKEN_TTL_DAYS = 7;
export const SESSION_TTL_SECONDS = 7 * 24 * 3600;

// OTP / TOTP
export const OTP_TTL_MIN = 5;
export const MAX_OTP_ATTEMPTS = 5;
export const TOTP_STEP_SEG = 30;
export const TOTP_WINDOW = 1;
export const TOTP_DIGITS = 6;

// Intentos de login y bloqueo
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MIN = 15;

// Auditoria
export const AUDIT_RETENTION_DAYS = 90;

// JWT
export const JWT_ALGORITHM = 'RS256';
export const JWT_ISSUER = 'Greip';

// Permisos base del seed de security.sql
export const BASE_PERMISSIONS = [
  'user.create',
  'user.read',
  'user.update',
  'user.delete',
  'role.manage',
  'group.manage',
  'permission.read',
  'audit.read',
  'auth.manage',
  'mfa.manage'
];

// Eventos de auditoria
export const AUDIT_EVENTS = {
  LOGIN_SUCCESS: 'USER_LOGIN',
  LOGIN_FAILED: 'USER_LOGIN_FAILED',
  MFA_VERIFIED: 'USER_MFA_VERIFIED',
  MFA_FAILED: 'USER_MFA_FAILED',
  REFRESH: 'USER_REFRESH',
  LOGOUT: 'USER_LOGOUT',
  LOCKED: 'USER_LOCKED',
  PASSWORD_CHANGED: 'USER_PASSWORD_CHANGED',
  RECOVERY_REQUESTED: 'USER_RECOVERY_REQUESTED',
  PASSWORD_RESET: 'USER_PASSWORD_RESET',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  ROLE_ASSIGNED: 'USER_ROLE_ASSIGNED',
  ROLE_REMOVED: 'USER_ROLE_REMOVED',
  ROLE_CREATED: 'ROLE_CREATED',
  USER_STREAM_INSERT: 'USER_STREAM_INSERT',
  USER_STREAM_MODIFY: 'USER_STREAM_MODIFY',
  USER_STREAM_REMOVE: 'USER_STREAM_REMOVE'
};
