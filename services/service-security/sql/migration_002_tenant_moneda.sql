-- =========================================================
-- MIGRACION: Agrega moneda al tenant
-- GREIP COMPANY - PostgreSQL 16
-- =========================================================

ALTER TABLE greip.tenant
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'PEN';
