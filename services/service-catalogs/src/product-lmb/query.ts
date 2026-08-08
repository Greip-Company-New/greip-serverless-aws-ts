export const LIST_PRODUCTS_QUERY: string = `
SELECT id, tenant_id, name, description, price, currency, status,
       created_by, created_by_channel, created_at, updated_by, updated_by_channel, updated_at
  FROM greip.product
 WHERE ($1::int IS NULL OR tenant_id = $1)
   AND ($2::text IS NULL OR status = $2)
   AND ($3::text IS NULL OR name ILIKE '%' || $3 || '%')
 ORDER BY id DESC`;

export const LIST_PRODUCTS_COUNT_QUERY: string = `
SELECT COUNT(*)::int AS total
  FROM greip.product
 WHERE ($1::int IS NULL OR tenant_id = $1)
   AND ($2::text IS NULL OR status = $2)
   AND ($3::text IS NULL OR name ILIKE '%' || $3 || '%')`;

export const GET_PRODUCT_QUERY: string = `
SELECT id, tenant_id, name, description, price, currency, status,
       created_by, created_by_channel, created_at, updated_by, updated_by_channel, updated_at
  FROM greip.product
 WHERE id = $1 AND ($2::int IS NULL OR tenant_id = $2)`;

export const INSERT_PRODUCT_QUERY: string = `
INSERT INTO greip.product (tenant_id, name, description, price, currency, status,
                           created_by, created_by_channel, updated_by, updated_by_channel)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8)
RETURNING id, tenant_id, name, description, price, currency, status,
          created_by, created_by_channel, created_at, updated_by, updated_by_channel, updated_at`;

export const UPDATE_PRODUCT_QUERY: string = `
UPDATE greip.product
   SET name = $2,
       description = $3,
       price = $4,
       currency = $5,
       status = $6,
       updated_by = $7,
       updated_by_channel = $8,
       updated_at = now()
 WHERE id = $1 AND ($9::int IS NULL OR tenant_id = $9)
RETURNING id, tenant_id, name, description, price, currency, status,
          created_by, created_by_channel, created_at, updated_by, updated_by_channel, updated_at`;

export const DELETE_PRODUCT_QUERY: string = `
DELETE FROM greip.product
 WHERE id = $1 AND ($2::int IS NULL OR tenant_id = $2)
RETURNING id`;
