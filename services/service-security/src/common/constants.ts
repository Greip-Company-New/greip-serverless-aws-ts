// Constantes globales de service-security (GREIP COMPANY).

export const STATUS_ACTIVE = 'A';
export const STATUS_INACTIVE = 'I';

export const DOCUMENT_TYPES = ['D', 'R', 'C'] as const;
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  D: 'DNI',
  R: 'RUC',
  C: 'Carnet de Extranjeria'
};

// Campos de la entidad User que se auditan en el historico de cambios.
// Usan el nombre camelCase que devuelve el perfil (getUser).
export const USER_AUDIT_FIELDS = [
  'email',
  'firstName',
  'fatherLastName',
  'motherLastName',
  'documentType',
  'documentNumber',
  'phone',
  'status'
];

// Canales MFA soportados
export const MFA_CHANNELS = ['TOTP', 'SMS', 'EMAIL'] as const;
export const TOKEN_TYPE_ACCESS = 'ACCESS';
export const TOKEN_TYPE_MFA = 'MFA';
export const TOKEN_TYPE_REFRESH = 'REFRESH';

// Duraciones (en minutos) de tokens JWT
export const ACCESS_TOKEN_TTL_MIN = 60;
export const MFA_TOKEN_TTL_MIN = 5;

// Sesiones
export const REFRESH_TOKEN_TTL_DAYS = 7;
export const SESSION_TTL_SECONDS = 7 * 24 * 3600;

// OTP / TOTP
export const OTP_TTL_MIN = 5;
export const MAX_OTP_ATTEMPTS = 5;
export const TOTP_STEP_SEG = 30;
export const TOTP_WINDOW = 1;
export const TOTP_DIGITS = 6;

// Recuperacion de contrasena (OTP por email/SMS)
export const RECOVERY_OTP_LENGTH = 6;
export const RECOVERY_OTP_TTL_MIN = 10;

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
  'permission.manage',
  'audit.read',
  'auth.manage',
  'mfa.manage',
  'tenant.manage',
  'dashboard.read',
  'notify.config.read',
  'notify.config.manage'
];

// Catalogo de permisos base (mismo contenido del seed de security.sql).
export const BASE_PERMISSIONS_CATALOG: Record<string, { name: string; description: string }> = {
  'user.create': { name: 'Crear usuario', description: 'Permite crear usuarios' },
  'user.read': { name: 'Leer usuarios', description: 'Permite consultar usuarios' },
  'user.update': { name: 'Actualizar usuario', description: 'Permite modificar usuarios' },
  'user.delete': { name: 'Eliminar usuario', description: 'Permite eliminar usuarios' },
  'role.manage': { name: 'Gestionar roles', description: 'Permite crear y asignar roles' },
  'group.manage': { name: 'Gestionar grupos', description: 'Permite crear y asignar grupos' },
  'permission.read': { name: 'Leer permisos', description: 'Permite consultar permisos' },
  'permission.manage': { name: 'Gestionar permisos', description: 'Permite crear, modificar y eliminar permisos' },
  'audit.read': { name: 'Leer auditoria', description: 'Permite consultar la auditoria' },
  'auth.manage': { name: 'Gestionar auth', description: 'Permite administrar la autenticacion' },
  'mfa.manage': { name: 'Gestionar MFA', description: 'Permite administrar factores MFA' },
  'tenant.manage': { name: 'Gestionar tenants', description: 'Permite crear y administrar empresas' },
  'dashboard.read': { name: 'Ver dashboard', description: 'Permite consultar el resumen de metricas' },
  'notify.config.read': { name: 'Leer config de notificaciones', description: 'Permite consultar la configuracion de proveedores de notificacion del tenant' },
  'notify.config.manage': { name: 'Gestionar config de notificaciones', description: 'Permite registrar y modificar los parametros de notificacion del tenant' }
};

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
  RECOVERY_FAILED: 'USER_RECOVERY_FAILED',
  PASSWORD_RESET: 'USER_PASSWORD_RESET',
  EMAIL_VERIFIED: 'USER_EMAIL_VERIFIED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  ROLE_ASSIGNED: 'USER_ROLE_ASSIGNED',
  ROLE_REMOVED: 'USER_ROLE_REMOVED',
  ROLE_CREATED: 'ROLE_CREATED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  ROLE_DELETED: 'ROLE_DELETED',
  ROLE_PERMISSIONS_ASSIGNED: 'ROLE_PERMISSIONS_ASSIGNED',
  ROLE_PERMISSION_REMOVED: 'ROLE_PERMISSION_REMOVED',
  PERMISSION_CREATED: 'PERMISSION_CREATED',
  PERMISSION_UPDATED: 'PERMISSION_UPDATED',
  PERMISSION_DELETED: 'PERMISSION_DELETED',
  TENANT_CREATED: 'TENANT_CREATED',
  TENANT_UPDATED: 'TENANT_UPDATED',
  TENANT_DEACTIVATED: 'TENANT_DEACTIVATED',
  USER_STREAM_INSERT: 'USER_STREAM_INSERT',
  USER_STREAM_MODIFY: 'USER_STREAM_MODIFY',
  USER_STREAM_REMOVE: 'USER_STREAM_REMOVE'
};
