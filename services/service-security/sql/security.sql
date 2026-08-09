-- =========================================================
-- SCHEMA: greip (Seguridad - service-security)
-- GREIP COMPANY - PostgreSQL 16 en EC2 (us-east-2)
--
-- Tablas de seguridad: tenant, person (persona), RBAC
-- (role, permission, user_group y mapeos N:N) y password_policy.
-- El usuario de login y las credenciales viven en DynamoDB
-- (TBL_GREIP_USUARIOS_<ENV>); aqui se guardan los datos
-- maestros de la persona y el control de acceso (RBAC).
--
-- Ejecutar como usuario con privilegios en la instancia (postgres):
--   sudo -u postgres psql -d greipdb -f sql/security.sql
-- =========================================================

CREATE SCHEMA IF NOT EXISTS greip AUTHORIZATION greip_app;

-- ---------- tenant (multitenant) ----------
CREATE TABLE IF NOT EXISTS greip.tenant (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL,
    name        VARCHAR(200) NOT NULL,
    status      CHAR(1)      NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    created_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    created_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    updated_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_tenant_code UNIQUE (code)
);

-- ---------- person (persona) ----------
CREATE TABLE IF NOT EXISTS greip.person (
    id                SERIAL PRIMARY KEY,
    tenant_id         INT         NOT NULL REFERENCES greip.tenant (id),
    first_name        VARCHAR(100) NOT NULL,
    father_last_name  VARCHAR(100) NOT NULL,
    mother_last_name  VARCHAR(100),
    document_type     CHAR(1)     NOT NULL DEFAULT 'D' CHECK (document_type IN ('D', 'R', 'C')),
    document_number   VARCHAR(20) NOT NULL,
    email             VARCHAR(200) NOT NULL,
    phone             VARCHAR(20),
    status            CHAR(1)     NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    created_by        VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by        VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_person_tenant_document UNIQUE (tenant_id, document_type, document_number),
    CONSTRAINT uq_person_tenant_email UNIQUE (tenant_id, email)
);

-- ---------- role (rol) ----------
CREATE TABLE IF NOT EXISTS greip.role (
    id          SERIAL PRIMARY KEY,
    tenant_id   INT         NOT NULL REFERENCES greip.tenant (id),
    code        VARCHAR(50) NOT NULL,
    name        VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    status      CHAR(1)     NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    created_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    created_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    updated_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_tenant_code UNIQUE (tenant_id, code)
);

-- ---------- permission (permiso) ----------
CREATE TABLE IF NOT EXISTS greip.permission (
    id          SERIAL PRIMARY KEY,
    tenant_id   INT         NOT NULL REFERENCES greip.tenant (id),
    code        VARCHAR(100) NOT NULL,
    name        VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    status      CHAR(1)     NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    created_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    created_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    updated_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_permission_tenant_code UNIQUE (tenant_id, code)
);

-- ---------- user_group (grupo de usuarios) ----------
CREATE TABLE IF NOT EXISTS greip.user_group (
    id          SERIAL PRIMARY KEY,
    tenant_id   INT         NOT NULL REFERENCES greip.tenant (id),
    code        VARCHAR(50) NOT NULL,
    name        VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    status      CHAR(1)     NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    created_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    created_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    updated_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_group_tenant_code UNIQUE (tenant_id, code)
);

-- ---------- user_person: vincula userId de DynamoDB con la persona ----------
CREATE TABLE IF NOT EXISTS greip.user_person (
    user_id     UUID PRIMARY KEY,
    person_id   INT  NOT NULL REFERENCES greip.person (id),
    tenant_id   INT  NOT NULL REFERENCES greip.tenant (id),
    created_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    created_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    updated_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- user_role (rol por usuario) ----------
CREATE TABLE IF NOT EXISTS greip.user_role (
    user_id     UUID NOT NULL REFERENCES greip.user_person (user_id) ON DELETE CASCADE,
    role_id     INT  NOT NULL REFERENCES greip.role (id) ON DELETE CASCADE,
    tenant_id   INT  NOT NULL REFERENCES greip.tenant (id),
    created_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    created_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    updated_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_role PRIMARY KEY (user_id, role_id)
);

-- ---------- role_permission (permiso por rol) ----------
CREATE TABLE IF NOT EXISTS greip.role_permission (
    role_id       INT NOT NULL REFERENCES greip.role (id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES greip.permission (id) ON DELETE CASCADE,
    tenant_id     INT NOT NULL REFERENCES greip.tenant (id),
    created_by    VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by    VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_role_permission PRIMARY KEY (role_id, permission_id)
);

-- ---------- user_group_member (miembro de grupo) ----------
CREATE TABLE IF NOT EXISTS greip.user_group_member (
    user_id     UUID NOT NULL REFERENCES greip.user_person (user_id) ON DELETE CASCADE,
    group_id    INT  NOT NULL REFERENCES greip.user_group (id) ON DELETE CASCADE,
    tenant_id   INT  NOT NULL REFERENCES greip.tenant (id),
    created_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    created_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    updated_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_group_member PRIMARY KEY (user_id, group_id)
);

-- ---------- user_group_role (rol otorgado via grupo) ----------
CREATE TABLE IF NOT EXISTS greip.user_group_role (
    group_id    INT NOT NULL REFERENCES greip.user_group (id) ON DELETE CASCADE,
    role_id     INT NOT NULL REFERENCES greip.role (id) ON DELETE CASCADE,
    tenant_id   INT NOT NULL REFERENCES greip.tenant (id),
    created_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    created_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    updated_by_channel VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_group_role PRIMARY KEY (group_id, role_id)
);

-- ---------- password_policy (politica de contrasena por tenant) ----------
CREATE TABLE IF NOT EXISTS greip.password_policy (
    tenant_id          INT PRIMARY KEY REFERENCES greip.tenant (id),
    min_length         INT  NOT NULL DEFAULT 8,
    max_length         INT  NOT NULL DEFAULT 64,
    require_uppercase  BOOLEAN NOT NULL DEFAULT true,
    require_lowercase  BOOLEAN NOT NULL DEFAULT true,
    require_number     BOOLEAN NOT NULL DEFAULT true,
    require_special    BOOLEAN NOT NULL DEFAULT true,
    max_age_days       INT  NOT NULL DEFAULT 90,
    max_reuse          INT  NOT NULL DEFAULT 3,
    created_by         VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by         VARCHAR(200) NOT NULL DEFAULT 'SYSTEM',
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- indices ----------
CREATE INDEX IF NOT EXISTS idx_person_tenant       ON greip.person (tenant_id);
CREATE INDEX IF NOT EXISTS idx_person_document     ON greip.person (tenant_id, document_type, document_number);
CREATE INDEX IF NOT EXISTS idx_person_email        ON greip.person (tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_user_role_user      ON greip.user_role (user_id);
CREATE INDEX IF NOT EXISTS idx_group_member_user   ON greip.user_group_member (user_id);

-- MIGRACION idempotente para entornos ya existentes (DEV).
-- Agrega auditoria (created_by / updated_by), canal (created_by_channel /
-- updated_by_channel) y tenant_id a las tablas que no las tenian.

-- tenant
ALTER TABLE greip.tenant ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.tenant ADD COLUMN IF NOT EXISTS created_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.tenant ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.tenant ADD COLUMN IF NOT EXISTS updated_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';

-- person
ALTER TABLE greip.person ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.person ADD COLUMN IF NOT EXISTS created_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.person ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.person ADD COLUMN IF NOT EXISTS updated_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';

-- role
ALTER TABLE greip.role ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.role ADD COLUMN IF NOT EXISTS created_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.role ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.role ADD COLUMN IF NOT EXISTS updated_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';

-- permission
ALTER TABLE greip.permission ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE greip.permission ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.permission ADD COLUMN IF NOT EXISTS created_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.permission ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.permission ADD COLUMN IF NOT EXISTS updated_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';

-- user_group
ALTER TABLE greip.user_group ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_group ADD COLUMN IF NOT EXISTS created_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_group ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_group ADD COLUMN IF NOT EXISTS updated_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';

-- user_person
ALTER TABLE greip.user_person ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_person ADD COLUMN IF NOT EXISTS created_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_person ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_person ADD COLUMN IF NOT EXISTS updated_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_person ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- user_role
ALTER TABLE greip.user_role ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES greip.tenant (id);
ALTER TABLE greip.user_role ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_role ADD COLUMN IF NOT EXISTS created_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_role ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_role ADD COLUMN IF NOT EXISTS updated_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_role ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- role_permission
ALTER TABLE greip.role_permission ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES greip.tenant (id);
ALTER TABLE greip.role_permission ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.role_permission ADD COLUMN IF NOT EXISTS created_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.role_permission ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.role_permission ADD COLUMN IF NOT EXISTS updated_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.role_permission ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- user_group_member
ALTER TABLE greip.user_group_member ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES greip.tenant (id);
ALTER TABLE greip.user_group_member ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_group_member ADD COLUMN IF NOT EXISTS created_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_group_member ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_group_member ADD COLUMN IF NOT EXISTS updated_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_group_member ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- user_group_role
ALTER TABLE greip.user_group_role ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES greip.tenant (id);
ALTER TABLE greip.user_group_role ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_group_role ADD COLUMN IF NOT EXISTS created_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_group_role ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_group_role ADD COLUMN IF NOT EXISTS updated_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.user_group_role ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- password_policy
ALTER TABLE greip.password_policy ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.password_policy ADD COLUMN IF NOT EXISTS created_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.password_policy ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.password_policy ADD COLUMN IF NOT EXISTS updated_by_channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM';

-- Indices por tenant de las tablas N:N (se crean despues de la migracion,
-- cuando las columnas tenant_id ya existen en entornos preexistentes).
CREATE INDEX IF NOT EXISTS idx_user_role_tenant    ON greip.user_role (tenant_id);
CREATE INDEX IF NOT EXISTS idx_group_member_tenant ON greip.user_group_member (tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_perm_tenant    ON greip.role_permission (tenant_id);
CREATE INDEX IF NOT EXISTS idx_group_role_tenant   ON greip.user_group_role (tenant_id);

-- ---------- seed: tenant GREIP + password_policy default ----------
INSERT INTO greip.tenant (code, name)
VALUES ('GREIP', 'GREIP COMPANY')
ON CONFLICT (code) DO NOTHING;

INSERT INTO greip.password_policy (tenant_id)
SELECT id FROM greip.tenant WHERE code = 'GREIP'
ON CONFLICT (tenant_id) DO NOTHING;

-- ---------- seed: permisos base ----------
INSERT INTO greip.permission (tenant_id, code, name, description)
SELECT t.id, p.code, p.name, p.description
FROM greip.tenant t,
     (VALUES
        ('user.create',  'Crear usuario',   'Permite crear usuarios'),
        ('user.read',    'Leer usuarios',   'Permite consultar usuarios'),
        ('user.update',  'Actualizar usuario', 'Permite modificar usuarios'),
        ('user.delete',  'Eliminar usuario',   'Permite eliminar usuarios'),
        ('role.manage',  'Gestionar roles', 'Permite crear y asignar roles'),
        ('group.manage', 'Gestionar grupos', 'Permite crear y asignar grupos'),
        ('permission.read', 'Leer permisos', 'Permite consultar permisos'),
        ('permission.manage', 'Gestionar permisos', 'Permite crear, modificar y eliminar permisos'),
        ('tenant.manage', 'Gestionar tenants', 'Permite crear y administrar empresas'),
        ('dashboard.read', 'Ver dashboard', 'Permite consultar el resumen de metricas'),
        ('audit.read',   'Leer auditoria',  'Permite consultar la auditoria'),
        ('auth.manage',  'Gestionar auth',  'Permite administrar la autenticacion'),
        ('mfa.manage',   'Gestionar MFA',   'Permite administrar factores MFA')
     ) AS p(code, name, description)
WHERE t.code = 'GREIP'
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ---------- comentarios de tablas y columnas ----------

COMMENT ON TABLE greip.tenant IS 'Tenant (empresa/cliente) del esquema multitenant';
COMMENT ON COLUMN greip.tenant.code IS 'Codigo unico del tenant';
COMMENT ON COLUMN greip.tenant.name IS 'Nombre comercial del tenant';
COMMENT ON COLUMN greip.tenant.status IS 'Estado del tenant (A=activo, I=inactivo)';
COMMENT ON COLUMN greip.tenant.created_by IS 'Usuario/email que creo el registro (SYSTEM si fue automatico)';
COMMENT ON COLUMN greip.tenant.created_by_channel IS 'Canal desde el que se creo el registro (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.tenant.created_at IS 'Fecha de creacion del registro';
COMMENT ON COLUMN greip.tenant.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.tenant.updated_by_channel IS 'Canal desde el que se realizo la ultima actualizacion';
COMMENT ON COLUMN greip.tenant.updated_at IS 'Fecha de ultima actualizacion del registro';

COMMENT ON TABLE greip.person IS 'Datos maestros de la persona vinculada a un usuario';
COMMENT ON COLUMN greip.person.tenant_id IS 'Tenant al que pertenece la persona';
COMMENT ON COLUMN greip.person.first_name IS 'Nombre o nombres de la persona';
COMMENT ON COLUMN greip.person.father_last_name IS 'Apellido paterno de la persona';
COMMENT ON COLUMN greip.person.mother_last_name IS 'Apellido materno de la persona';
COMMENT ON COLUMN greip.person.document_type IS 'Tipo de documento (D=DNI, R=RUC, C=Carnet de extranjeria)';
COMMENT ON COLUMN greip.person.document_number IS 'Numero del documento de identidad';
COMMENT ON COLUMN greip.person.email IS 'Correo electronico de la persona';
COMMENT ON COLUMN greip.person.phone IS 'Telefono de contacto de la persona';
COMMENT ON COLUMN greip.person.status IS 'Estado de la persona (A=activo, I=inactivo)';
COMMENT ON COLUMN greip.person.created_by IS 'Usuario/email que creo el registro';
COMMENT ON COLUMN greip.person.created_by_channel IS 'Canal desde el que se creo el registro (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.person.created_at IS 'Fecha de creacion del registro';
COMMENT ON COLUMN greip.person.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.person.updated_by_channel IS 'Canal desde el que se realizo la ultima actualizacion';
COMMENT ON COLUMN greip.person.updated_at IS 'Fecha de ultima actualizacion del registro';

COMMENT ON TABLE greip.role IS 'Rol del RBAC (conjunto de permisos)';
COMMENT ON COLUMN greip.role.tenant_id IS 'Tenant al que pertenece el rol';
COMMENT ON COLUMN greip.role.code IS 'Codigo unico del rol (ej. ADMIN)';
COMMENT ON COLUMN greip.role.name IS 'Nombre descriptivo del rol';
COMMENT ON COLUMN greip.role.description IS 'Descripcion del rol';
COMMENT ON COLUMN greip.role.status IS 'Estado del rol (A=activo, I=inactivo)';
COMMENT ON COLUMN greip.role.created_by IS 'Usuario/email que creo el registro';
COMMENT ON COLUMN greip.role.created_by_channel IS 'Canal desde el que se creo el registro (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.role.created_at IS 'Fecha de creacion del registro';
COMMENT ON COLUMN greip.role.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.role.updated_by_channel IS 'Canal desde el que se realizo la ultima actualizacion';
COMMENT ON COLUMN greip.role.updated_at IS 'Fecha de ultima actualizacion del registro';

COMMENT ON TABLE greip.permission IS 'Permiso individual del RBAC (accion sobre un recurso)';
COMMENT ON COLUMN greip.permission.tenant_id IS 'Tenant al que pertenece el permiso';
COMMENT ON COLUMN greip.permission.code IS 'Codigo unico del permiso (ej. user.create)';
COMMENT ON COLUMN greip.permission.name IS 'Nombre descriptivo del permiso';
COMMENT ON COLUMN greip.permission.description IS 'Descripcion del permiso';
COMMENT ON COLUMN greip.permission.status IS 'Estado del permiso (A=activo, I=inactivo)';
COMMENT ON COLUMN greip.permission.created_by IS 'Usuario/email que creo el registro';
COMMENT ON COLUMN greip.permission.created_by_channel IS 'Canal desde el que se creo el registro (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.permission.created_at IS 'Fecha de creacion del registro';
COMMENT ON COLUMN greip.permission.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.permission.updated_by_channel IS 'Canal desde el que se realizo la ultima actualizacion';
COMMENT ON COLUMN greip.permission.updated_at IS 'Fecha de ultima actualizacion del registro';

COMMENT ON TABLE greip.user_group IS 'Grupo de usuarios (permite otorgar roles en lote)';
COMMENT ON COLUMN greip.user_group.tenant_id IS 'Tenant al que pertenece el grupo';
COMMENT ON COLUMN greip.user_group.code IS 'Codigo unico del grupo';
COMMENT ON COLUMN greip.user_group.name IS 'Nombre descriptivo del grupo';
COMMENT ON COLUMN greip.user_group.description IS 'Descripcion del grupo';
COMMENT ON COLUMN greip.user_group.status IS 'Estado del grupo (A=activo, I=inactivo)';
COMMENT ON COLUMN greip.user_group.created_by IS 'Usuario/email que creo el registro';
COMMENT ON COLUMN greip.user_group.created_by_channel IS 'Canal desde el que se creo el registro (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.user_group.created_at IS 'Fecha de creacion del registro';
COMMENT ON COLUMN greip.user_group.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.user_group.updated_by_channel IS 'Canal desde el que se realizo la ultima actualizacion';
COMMENT ON COLUMN greip.user_group.updated_at IS 'Fecha de ultima actualizacion del registro';

COMMENT ON TABLE greip.user_person IS 'Vincula el userId (DynamoDB) con la persona (PostgreSQL)';
COMMENT ON COLUMN greip.user_person.user_id IS 'UUID del usuario en DynamoDB (TBL_GREIP_USUARIOS)';
COMMENT ON COLUMN greip.user_person.person_id IS 'Id de la persona en la tabla greip.person';
COMMENT ON COLUMN greip.user_person.tenant_id IS 'Tenant al que pertenece el vinculo';
COMMENT ON COLUMN greip.user_person.created_by IS 'Usuario/email que creo el registro';
COMMENT ON COLUMN greip.user_person.created_by_channel IS 'Canal desde el que se creo el registro (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.user_person.created_at IS 'Fecha de creacion del vinculo';
COMMENT ON COLUMN greip.user_person.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.user_person.updated_by_channel IS 'Canal desde el que se realizo la ultima actualizacion';
COMMENT ON COLUMN greip.user_person.updated_at IS 'Fecha de ultima actualizacion del vinculo';

COMMENT ON TABLE greip.user_role IS 'Roles asignados directamente a un usuario';
COMMENT ON COLUMN greip.user_role.user_id IS 'UUID del usuario (DynamoDB)';
COMMENT ON COLUMN greip.user_role.role_id IS 'Id del rol asignado';
COMMENT ON COLUMN greip.user_role.tenant_id IS 'Tenant del vinculo usuario-rol';
COMMENT ON COLUMN greip.user_role.created_by IS 'Usuario/email que creo el registro';
COMMENT ON COLUMN greip.user_role.created_by_channel IS 'Canal desde el que se creo el registro (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.user_role.created_at IS 'Fecha de asignacion del rol';
COMMENT ON COLUMN greip.user_role.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.user_role.updated_by_channel IS 'Canal desde el que se realizo la ultima actualizacion';
COMMENT ON COLUMN greip.user_role.updated_at IS 'Fecha de ultima actualizacion del vinculo';

COMMENT ON TABLE greip.role_permission IS 'Permisos otorgados a un rol';
COMMENT ON COLUMN greip.role_permission.role_id IS 'Id del rol';
COMMENT ON COLUMN greip.role_permission.permission_id IS 'Id del permiso otorgado';
COMMENT ON COLUMN greip.role_permission.tenant_id IS 'Tenant del vinculo rol-permiso';
COMMENT ON COLUMN greip.role_permission.created_by IS 'Usuario/email que creo el registro';
COMMENT ON COLUMN greip.role_permission.created_by_channel IS 'Canal desde el que se creo el registro (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.role_permission.created_at IS 'Fecha de vinculacion permiso-rol';
COMMENT ON COLUMN greip.role_permission.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.role_permission.updated_by_channel IS 'Canal desde el que se realizo la ultima actualizacion';
COMMENT ON COLUMN greip.role_permission.updated_at IS 'Fecha de ultima actualizacion del vinculo';

COMMENT ON TABLE greip.user_group_member IS 'Miembros de un grupo de usuarios';
COMMENT ON COLUMN greip.user_group_member.user_id IS 'UUID del usuario miembro (DynamoDB)';
COMMENT ON COLUMN greip.user_group_member.group_id IS 'Id del grupo';
COMMENT ON COLUMN greip.user_group_member.tenant_id IS 'Tenant del vinculo usuario-grupo';
COMMENT ON COLUMN greip.user_group_member.created_by IS 'Usuario/email que creo el registro';
COMMENT ON COLUMN greip.user_group_member.created_by_channel IS 'Canal desde el que se creo el registro (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.user_group_member.created_at IS 'Fecha de incorporacion al grupo';
COMMENT ON COLUMN greip.user_group_member.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.user_group_member.updated_by_channel IS 'Canal desde el que se realizo la ultima actualizacion';
COMMENT ON COLUMN greip.user_group_member.updated_at IS 'Fecha de ultima actualizacion del vinculo';

COMMENT ON TABLE greip.user_group_role IS 'Roles otorgados via un grupo de usuarios';
COMMENT ON COLUMN greip.user_group_role.group_id IS 'Id del grupo';
COMMENT ON COLUMN greip.user_group_role.role_id IS 'Id del rol otorgado via el grupo';
COMMENT ON COLUMN greip.user_group_role.tenant_id IS 'Tenant del vinculo grupo-rol';
COMMENT ON COLUMN greip.user_group_role.created_by IS 'Usuario/email que creo el registro';
COMMENT ON COLUMN greip.user_group_role.created_by_channel IS 'Canal desde el que se creo el registro (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.user_group_role.created_at IS 'Fecha de vinculacion rol-grupo';
COMMENT ON COLUMN greip.user_group_role.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.user_group_role.updated_by_channel IS 'Canal desde el que se realizo la ultima actualizacion';
COMMENT ON COLUMN greip.user_group_role.updated_at IS 'Fecha de ultima actualizacion del vinculo';

COMMENT ON TABLE greip.password_policy IS 'Politica de contrasenas por tenant';
COMMENT ON COLUMN greip.password_policy.tenant_id IS 'Tenant al que aplica la politica';
COMMENT ON COLUMN greip.password_policy.min_length IS 'Longitud minima de la contrasena';
COMMENT ON COLUMN greip.password_policy.max_length IS 'Longitud maxima de la contrasena';
COMMENT ON COLUMN greip.password_policy.require_uppercase IS 'Exige al menos una letra mayuscula';
COMMENT ON COLUMN greip.password_policy.require_lowercase IS 'Exige al menos una letra minuscula';
COMMENT ON COLUMN greip.password_policy.require_number IS 'Exige al menos un digito';
COMMENT ON COLUMN greip.password_policy.require_special IS 'Exige al menos un caracter especial';
COMMENT ON COLUMN greip.password_policy.max_age_days IS 'Dias de vigencia maxima de la contrasena';
COMMENT ON COLUMN greip.password_policy.max_reuse IS 'Cuantas contrasenas recientes no se pueden reutilizar';
COMMENT ON COLUMN greip.password_policy.created_by IS 'Usuario/email que creo el registro';
COMMENT ON COLUMN greip.password_policy.created_by_channel IS 'Canal desde el que se creo el registro (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.password_policy.created_at IS 'Fecha de creacion del registro';
COMMENT ON COLUMN greip.password_policy.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.password_policy.updated_by_channel IS 'Canal desde el que se realizo la ultima actualizacion';
COMMENT ON COLUMN greip.password_policy.updated_at IS 'Fecha de ultima actualizacion del registro';
