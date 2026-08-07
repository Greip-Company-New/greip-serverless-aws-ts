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
    name         VARCHAR(100)     NOT NULL,
    description  TEXT,
    price        NUMERIC(12, 2)   NOT NULL DEFAULT 0 CHECK (price >= 0),
    currency     CHAR(3)          NOT NULL DEFAULT 'PEN' CHECK (currency IN ('PEN', 'USD')),
    status       CHAR(1)          NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    created_at   TIMESTAMPTZ      NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- Indices para los filtros de listProducts
CREATE INDEX IF NOT EXISTS idx_product_status ON greip.product (status);
CREATE INDEX IF NOT EXISTS idx_product_name ON greip.product (name);

-- ---------- comentarios de tablas y columnas ----------

COMMENT ON TABLE greip.product IS 'Catalogo de productos y servicios de GREIP COMPANY';
COMMENT ON COLUMN greip.product.name IS 'Nombre del producto o servicio';
COMMENT ON COLUMN greip.product.description IS 'Descripcion detallada del producto';
COMMENT ON COLUMN greip.product.price IS 'Precio del producto (hasta 2 decimales)';
COMMENT ON COLUMN greip.product.currency IS 'Moneda del precio (PEN= soles, USD= dolares)';
COMMENT ON COLUMN greip.product.status IS 'Estado del producto (A=activo, I=inactivo)';
COMMENT ON COLUMN greip.product.created_at IS 'Fecha de creacion del registro';
COMMENT ON COLUMN greip.product.updated_at IS 'Fecha de ultima actualizacion del registro';
