export const LIST_PRODUCTS_QUERY: string = `
SELECT id, name, description, price, currency, status, created_at, updated_at
  FROM greip.product
 WHERE ($1::text IS NULL OR status = $1)
   AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%')
 ORDER BY id DESC`;

export const LIST_PRODUCTS_COUNT_QUERY: string = `
SELECT COUNT(*)::int AS total
  FROM greip.product
 WHERE ($1::text IS NULL OR status = $1)
   AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%')`;

export const GET_PRODUCT_QUERY: string = `
SELECT id, name, description, price, currency, status, created_at, updated_at
  FROM greip.product
 WHERE id = $1`;

export const INSERT_PRODUCT_QUERY: string = `
INSERT INTO greip.product (name, description, price, currency, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, name, description, price, currency, status, created_at, updated_at`;

export const UPDATE_PRODUCT_QUERY: string = `
UPDATE greip.product
   SET name = $2,
       description = $3,
       price = $4,
       currency = $5,
       status = $6,
       updated_at = now()
 WHERE id = $1
RETURNING id, name, description, price, currency, status, created_at, updated_at`;

export const DELETE_PRODUCT_QUERY: string = `
DELETE FROM greip.product
 WHERE id = $1
RETURNING id`;
