-- =========================================================
-- MIGRACION: Tenant enhancements + Catalogo de paises
-- GREIP COMPANY - PostgreSQL 16 (us-east-2)
--
-- Agrega: ruc, razon_social, pais_id, idioma, formatos
-- al tenant. Crea el catalogo de paises.
--
-- Ejecutar como postgres/greip_app:
--   psql -h dev.server.greip.com.pe -U greip_app -d greipdb -f sql/migration_001_tenant_enhancements.sql
-- =========================================================

BEGIN;

-- ---------- Nuevas columnas en greip.tenant ----------
ALTER TABLE greip.tenant
  ADD COLUMN IF NOT EXISTS ruc                 VARCHAR(11),
  ADD COLUMN IF NOT EXISTS razon_social        VARCHAR(300),
  ADD COLUMN IF NOT EXISTS pais_id             INT,
  ADD COLUMN IF NOT EXISTS idioma              VARCHAR(5)   NOT NULL DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS formato_fecha       VARCHAR(20)  NOT NULL DEFAULT 'DD/MM/YYYY',
  ADD COLUMN IF NOT EXISTS formato_fecha_hora  VARCHAR(20)  NOT NULL DEFAULT 'DD/MM/YYYY HH:mm',
  ADD COLUMN IF NOT EXISTS formato_decimales   VARCHAR(10)  NOT NULL DEFAULT '#,##0.00';

-- ---------- Catalogo de paises ----------
CREATE TABLE IF NOT EXISTS greip.pais (
    id          SERIAL PRIMARY KEY,
    code_iso2   CHAR(2)      NOT NULL,
    code_iso3   CHAR(3)      NOT NULL,
    name_es     VARCHAR(150) NOT NULL,
    name_en     VARCHAR(150) NOT NULL,
    phone_code  VARCHAR(10),
    status      CHAR(1)      NOT NULL DEFAULT 'A' CHECK (status IN ('A', 'I')),
    CONSTRAINT uq_pais_iso2 UNIQUE (code_iso2),
    CONSTRAINT uq_pais_iso3 UNIQUE (code_iso3)
);

-- FK de tenant.pais_id a pais
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_tenant_pais'
  ) THEN
    ALTER TABLE greip.tenant ADD CONSTRAINT fk_tenant_pais FOREIGN KEY (pais_id) REFERENCES greip.pais(id);
  END IF;
END $$;

-- ---------- Seed de paises ----------
INSERT INTO greip.pais (code_iso2, code_iso3, name_es, name_en, phone_code)
VALUES
  ('AR', 'ARG', 'Argentina', 'Argentina', '+54'),
  ('BO', 'BOL', 'Bolivia', 'Bolivia', '+591'),
  ('BR', 'BRA', 'Brasil', 'Brazil', '+55'),
  ('CA', 'CAN', 'Canadá', 'Canada', '+1'),
  ('CL', 'CHL', 'Chile', 'Chile', '+56'),
  ('CO', 'COL', 'Colombia', 'Colombia', '+57'),
  ('CR', 'CRI', 'Costa Rica', 'Costa Rica', '+506'),
  ('CU', 'CUB', 'Cuba', 'Cuba', '+53'),
  ('DO', 'DOM', 'República Dominicana', 'Dominican Republic', '+1-809'),
  ('EC', 'ECU', 'Ecuador', 'Ecuador', '+593'),
  ('ES', 'ESP', 'España', 'Spain', '+34'),
  ('GT', 'GTM', 'Guatemala', 'Guatemala', '+502'),
  ('HN', 'HND', 'Honduras', 'Honduras', '+504'),
  ('MX', 'MEX', 'México', 'Mexico', '+52'),
  ('NI', 'NIC', 'Nicaragua', 'Nicaragua', '+505'),
  ('PA', 'PAN', 'Panamá', 'Panama', '+507'),
  ('PE', 'PER', 'Perú', 'Peru', '+51'),
  ('PY', 'PRY', 'Paraguay', 'Paraguay', '+595'),
  ('SV', 'SLV', 'El Salvador', 'El Salvador', '+503'),
  ('US', 'USA', 'Estados Unidos', 'United States', '+1'),
  ('UY', 'URY', 'Uruguay', 'Uruguay', '+598'),
  ('VE', 'VEN', 'Venezuela', 'Venezuela', '+58')
ON CONFLICT (code_iso3) DO NOTHING;

-- Comentarios
COMMENT ON COLUMN greip.tenant.ruc IS 'RUC de 11 digitos del tenant (Peru) o tax ID local';
COMMENT ON COLUMN greip.tenant.razon_social IS 'Razon social o nombre legal de la empresa';
COMMENT ON COLUMN greip.tenant.pais_id IS 'FK a greip.pais (pais de residencia fiscal)';
COMMENT ON COLUMN greip.tenant.idioma IS 'Idioma por defecto del tenant (es|en)';
COMMENT ON COLUMN greip.tenant.formato_fecha IS 'Formato de fecha (DD/MM/YYYY | MM/DD/YYYY)';
COMMENT ON COLUMN greip.tenant.formato_fecha_hora IS 'Formato de fecha y hora';
COMMENT ON COLUMN greip.tenant.formato_decimales IS 'Formato de numeros decimales (#,##0.00 | #.##0,00)';

COMMENT ON TABLE greip.pais IS 'Catalogo de paises';
COMMENT ON COLUMN greip.pais.code_iso2 IS 'Codigo ISO 3166-1 alfa-2';
COMMENT ON COLUMN greip.pais.code_iso3 IS 'Codigo ISO 3166-1 alfa-3';
COMMENT ON COLUMN greip.pais.name_es IS 'Nombre del pais en espanol';
COMMENT ON COLUMN greip.pais.name_en IS 'Nombre del pais en ingles';
COMMENT ON COLUMN greip.pais.phone_code IS 'Codigo telefonico internacional';

COMMIT;
