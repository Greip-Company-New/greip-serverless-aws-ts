-- =========================================================
-- TABLA: greip.entity_change_log (Historico de cambios de entidades)
-- GREIP COMPANY - PostgreSQL 16 en EC2 (us-east-2)
--
-- Registra el historial de cambios (crear/actualizar/eliminar) de
-- cualquier entidad del esquema (products, users, roles, etc.) de forma
-- generica y reutilizable. Se escribe desde la Lambda de auditoria de
-- entidades (ENTITY_AUDIT_LMB) invocada por los servicios.
--
-- Ejecutar como usuario con privilegios en la instancia (postgres):
--   sudo -u postgres psql -d greipdb -f sql/entity_change_log.sql
-- =========================================================

CREATE TABLE IF NOT EXISTS greip.entity_change_log (
    id           BIGSERIAL PRIMARY KEY,
    entity       VARCHAR(100) NOT NULL,
    entity_key   VARCHAR(100) NOT NULL,
    tenant_id    INT          NOT NULL REFERENCES greip.tenant (id),
    change_type  VARCHAR(20)  NOT NULL,
    status       CHAR(1)      NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    user_id      VARCHAR(200) NOT NULL,
    channel      VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    changes      JSONB        NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Indices para consultar el historial por entidad, registro y tenant.
-- El indice compuesto es el principal: cubre la consulta por los 3 campos
-- (entity, entity_key, tenant_id) usada en la API de logs.
CREATE INDEX IF NOT EXISTS idx_entity_change_log_lookup ON greip.entity_change_log (entity, entity_key, tenant_id);
CREATE INDEX IF NOT EXISTS idx_entity_change_log_tenant ON greip.entity_change_log (tenant_id, created_at);

-- El indice por (entity, entity_key) queda cubierto por el compuesto: se elimina
-- en entornos que ya lo tuvieran.
DROP INDEX IF EXISTS greip.idx_entity_change_log_entity;

-- ---------- comentarios de tablas y columnas ----------

COMMENT ON TABLE greip.entity_change_log IS 'Historico de cambios de entidades del esquema (auditoria generica)';
COMMENT ON COLUMN greip.entity_change_log.entity IS 'Entidad afectada (product, user, role, permission, user_group, ...)';
COMMENT ON COLUMN greip.entity_change_log.entity_key IS 'Identificador del registro afectado (id de producto, userId, roleId, ...)';
COMMENT ON COLUMN greip.entity_change_log.tenant_id IS 'Tenant (empresa) al que pertenece el cambio';
COMMENT ON COLUMN greip.entity_change_log.change_type IS 'Tipo de cambio (CREATE, UPDATE, DELETE, ASSIGN, REMOVE)';
COMMENT ON COLUMN greip.entity_change_log.status IS 'Estado resultante del registro (A=activo, I=inactivo)';
COMMENT ON COLUMN greip.entity_change_log.user_id IS 'Usuario (userId) que realizo el cambio';
COMMENT ON COLUMN greip.entity_change_log.channel IS 'Canal desde el que se realizo el cambio (AppWeb, AppMovil, Chatbot, Whatsapp)';
COMMENT ON COLUMN greip.entity_change_log.changes IS 'Detalle de los campos cambiados (JSON): {campo: {antes: ..., despues: ...}}';
COMMENT ON COLUMN greip.entity_change_log.created_at IS 'Fecha y hora en que se realizo el cambio';
