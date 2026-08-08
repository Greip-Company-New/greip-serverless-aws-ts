// Modelos de datos de service-security (GREIP COMPANY).

// ---- Usuario (DynamoDB TBL_GREIP_USUARIOS) ----
export interface UsuarioDynamo {
  pk: string;              // USER#<userId>
  sk: string;              // PROFILE
  userId: string;          // UUID
  tenant: string;          // GREIP
  email: string;
  documentKey: string;     // <type>#<number>  (GSI IdxUserDocument)
  documentType: string;
  documentNumber: string;
  firstName: string;
  fatherLastName: string;
  motherLastName?: string;
  phone?: string;
  status: string;          // A | I
  password: string;        // hash scrypt
  passwordHistory: string[];
  failedAttempts: number;
  lockedUntil?: string | null;
  passwordChangedAt?: string | null;
  mfa: Record<string, any>; // configuracion de factores { totp, sms, email }
  createdBy: string;       // email/userId que creo el registro
  createdAt: string;
  updatedBy: string;       // email/userId de la ultima actualizacion
  updatedAt: string;
  lastActionAt?: string;
  lastRequestId?: string;
  lastIdentity?: string;
  [key: string]: any;
}

export interface UsuarioPublico {
  userId: string;
  tenant: string;
  email: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  fatherLastName: string;
  motherLastName?: string;
  phone?: string;
  status: string;
  mfa: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

// ---- Sesion (DynamoDB TBL_GREIP_SEGURIDAD_SESIONES) ----
export interface SesionDynamo {
  pk: string;              // TENANT#<tenant>#USER#<userId>
  sk: string;              // SESSION#<hashRefreshToken>
  tenant: string;          // GREIP
  userId: string;          // UUID
  refreshTokenHash: string;
  userAgent?: string;
  ip?: string;
  createdBy: string;       // email/userId que inicio la sesion
  createdAt: string;
  updatedBy: string;       // email/userId de la ultima actualizacion
  updatedAt: string;
  expiresAt: number;       // TTL epoch seg
}

// ---- Auditoria (DynamoDB TBL_GREIP_SEGURIDAD_AUDITORIA) ----
export interface AuditoriaEvento {
  pk: string;              // TENANT#<tenant>
  sk: string;              // EVENT#<fechaISO>#<eventId>
  eventId: string;
  tenant: string;
  action: string;          // USER_LOGIN, USER_CREATED, ...
  entity: string;          // USER | SESSION | ROLE | MFA | AUDIT
  entityId?: string;
  actor?: string;
  sourceIp?: string;
  userAgent?: string;
  detail?: any;
  createdBy: string;       // email/userId que origino el evento
  date: string;            // ISO
  expiresAt: number;       // TTL epoch seg
}

// ---- MFA (DynamoDB TBL_GREIP_SEGURIDAD_MFA) ----
export interface FactorMfaDynamo {
  pk: string;              // TENANT#<tenant>#USER#<userId>
  sk: string;              // TOTP | SMS | EMAIL | CHALLENGE#<uuid>
  tenant: string;          // GREIP
  userId: string;          // UUID
  channel: string;
  active: boolean;
  verified: boolean;
  secret?: string;         // TOTP: secret base32
  phone?: string;          // SMS: destino
  email?: string;          // EMAIL: destino
  createdBy: string;       // email/userId que registro el factor
  createdAt: string;
  updatedBy: string;       // email/userId de la ultima actualizacion
  updatedAt: string;
}

export interface DesafioDynamo {
  pk: string;              // TENANT#<tenant>#USER#<userId>
  sk: string;              // CHALLENGE#<uuid>
  tenant: string;          // GREIP
  userId: string;          // UUID
  type: string;            // MFA | RESET
  channel: string;         // SMS | EMAIL | TOTP
  codeHash: string;        // sha256 del codigo OTP
  attempts: number;
  expiresAt: string;       // ISO
  createdBy: string;       // email/userId que genero el desafio
  createdAt: string;
  ttl: number;             // TTL epoch seg
}

// ---- RBAC (PostgreSQL schema greip) ----
export interface TenantRow {
  id: number;
  code: string;
  name: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface PersonaRow {
  id: number;
  person_id?: number;
  user_id?: string;
  tenant_id: number;
  first_name: string;
  father_last_name: string;
  mother_last_name: string | null;
  document_type: string;
  document_number: string;
  email: string;
  phone: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface RolRow {
  id: number;
  tenant_id: number;
  code: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface PermisoRow {
  id: number;
  tenant_id: number;
  code: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface PoliticaContrasena {
  min_length: number;
  max_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_special: boolean;
  max_age_days: number;
  max_reuse: number;
}

// ---- Identidad extraida del JWT ----
export interface Identidad {
  sub: string;             // userId
  tenant: string;          // codigo del tenant (ej. GREIP)
  tenantId?: number;       // id numerico del tenant en PostgreSQL
  channel?: string;
  type: string;            // ACCESS | MFA | RESET
  exp?: number;
  permissions?: string[];
  roles?: string[];
  [key: string]: any;
}

export interface ResultadoTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;       // epoch ms
  user: UsuarioPublico;
}

export interface ResultadoMfa {
  requiresMfa: boolean;
  channel?: string;
  challengeId?: string;
  maskedDestination?: string;
  mfaToken?: string;
  expiresAt?: number;
}
