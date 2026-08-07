-- =========================================================
-- Grants para el usuario de aplicacion greip_app
-- (service-catalogs - catalogo de productos)
--
-- El esquema greip lo crea sql/producto.sql con AUTHORIZATION
-- greip_app; si el esquema lo crea otro usuario (ej. postgres),
-- ejecutar estos grants:
--   sudo -u postgres psql -d greipdb -f grants.sql
-- =========================================================

GRANT USAGE ON SCHEMA greip TO greip_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA greip TO greip_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA greip TO greip_app;

-- Aplicar tambien a tablas futuras del esquema
ALTER DEFAULT PRIVILEGES IN SCHEMA greip GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greip_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA greip GRANT USAGE, SELECT ON SEQUENCES TO greip_app;
