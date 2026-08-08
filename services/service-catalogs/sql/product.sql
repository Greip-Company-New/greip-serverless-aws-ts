-- =========================================================
-- SCHEMA: greip.product (Catalogo de productos - service-catalogs)
-- GREIP COMPANY - PostgreSQL 16 en EC2 (us-east-2)
--
-- Ejecutar como usuario con privilegios en la instancia (postgres):
--   sudo -u postgres psql -d greipdb -f sql/product.sql
-- =========================================================

CREATE SCHEMA IF NOT EXISTS greip AUTHORIZATION greip_app;

CREATE TABLE IF NOT EXISTS greip.product (
    id           SERIAL PRIMARY KEY,
    tenant_id    INT            NOT NULL REFERENCES greip.tenant (id),
    name         VARCHAR(100)   NOT NULL,
    description  TEXT,
    price        NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    currency     CHAR(3)        NOT NULL DEFAULT 'PEN' CHECK (currency IN ('PEN', 'USD')),
    status       CHAR(1)        NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    created_by   VARCHAR(200)   NOT NULL DEFAULT 'SYSTEM',
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_by   VARCHAR(200)   NOT NULL DEFAULT 'SYSTEM',
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_product_tenant_name UNIQUE (tenant_id, name)
);

-- Indices para los filtros de listProducts
CREATE INDEX IF NOT EXISTS idx_product_tenant ON greip.product (tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_status ON greip.product (status);
CREATE INDEX IF NOT EXISTS idx_product_name ON greip.product (name);

-- =========================================================
-- MIGRACION idempotente para entornos ya existentes (DEV).
-- Agrega tenant_id y auditoria (created_by / updated_by).
-- =========================================================
ALTER TABLE greip.product
    ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES greip.tenant (id);
ALTER TABLE greip.product
    ADD COLUMN IF NOT EXISTS created_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE greip.product
    ADD COLUMN IF NOT EXISTS updated_by VARCHAR(200) NOT NULL DEFAULT 'SYSTEM';

-- Backfill de tenant_id para productos existentes (tenant GREIP por defecto).
UPDATE greip.product p
   SET tenant_id = t.id
  FROM greip.tenant t
 WHERE t.code = 'GREIP' AND p.tenant_id IS NULL;

-- ---------- comentarios de tablas y columnas ----------

COMMENT ON TABLE greip.product IS 'Catalogo de productos y servicios de GREIP COMPANY';
COMMENT ON COLUMN greip.product.tenant_id IS 'Tenant (empresa) al que pertenece el producto';
COMMENT ON COLUMN greip.product.name IS 'Nombre del producto o servicio';
COMMENT ON COLUMN greip.product.description IS 'Descripcion detallada del producto';
COMMENT ON COLUMN greip.product.price IS 'Precio del producto (hasta 2 decimales)';
COMMENT ON COLUMN greip.product.currency IS 'Moneda del precio (PEN= soles, USD= dolares)';
COMMENT ON COLUMN greip.product.status IS 'Estado del producto (A=activo, I=inactivo)';
COMMENT ON COLUMN greip.product.created_by IS 'Usuario/email que creo el registro';
COMMENT ON COLUMN greip.product.created_at IS 'Fecha de creacion del registro';
COMMENT ON COLUMN greip.product.updated_by IS 'Usuario/email de la ultima actualizacion';
COMMENT ON COLUMN greip.product.updated_at IS 'Fecha de ultima actualizacion del registro';
