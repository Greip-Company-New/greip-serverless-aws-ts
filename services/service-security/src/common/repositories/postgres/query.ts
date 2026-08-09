// Consultas SQL del repositorio RBAC (schema greip).

export const GET_TENANT_QUERY = `
SELECT id, code, name, status
  FROM greip.tenant
 WHERE code = $1`;

export const GET_PASSWORD_POLICY_QUERY = `
SELECT min_length, max_length, require_uppercase, require_lowercase,
       require_number, require_special, max_age_days, max_reuse
  FROM greip.password_policy
 WHERE tenant_id = $1`;

export const DOCUMENT_EXISTS_QUERY = `
SELECT 1 AS found
  FROM greip.person
 WHERE tenant_id = $1 AND document_type = $2 AND document_number = $3`;

export const EMAIL_EXISTS_QUERY = `
SELECT 1 AS found
  FROM greip.person
 WHERE tenant_id = $1 AND email = $2`;

export const CREATE_PERSON_QUERY = `
INSERT INTO greip.person (tenant_id, first_name, father_last_name, mother_last_name,
                          document_type, document_number, email, phone, status,
                          created_by, created_by_channel, updated_by, updated_by_channel)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $10, $11)
RETURNING id, tenant_id, first_name, father_last_name, mother_last_name,
          document_type, document_number, email, phone, status,
          created_by, created_by_channel, created_at, updated_by, updated_by_channel, updated_at`;

export const CREATE_USER_PERSON_QUERY = `
INSERT INTO greip.user_person (user_id, person_id, tenant_id, created_by, created_by_channel, updated_by, updated_by_channel)
VALUES ($1, $2, $3, $4, $5, $4, $5)`;

export const GET_USER_PERSON_QUERY = `
SELECT up.user_id, up.person_id, up.tenant_id, p.first_name, p.father_last_name,
       p.mother_last_name, p.document_type, p.document_number, p.email,
       p.phone, p.status, p.created_by, p.created_by_channel, p.created_at,
       p.updated_by, p.updated_by_channel, p.updated_at
  FROM greip.user_person up
  JOIN greip.person p ON p.id = up.person_id
 WHERE up.user_id = $1`;

export const UPDATE_PERSON_QUERY = `
UPDATE greip.person p
   SET first_name = COALESCE($2, p.first_name),
       father_last_name = COALESCE($3, p.father_last_name),
       mother_last_name = COALESCE($4, p.mother_last_name),
       document_type = COALESCE($5, p.document_type),
       document_number = COALESCE($6, p.document_number),
       email = COALESCE($7, p.email),
       phone = COALESCE($8, p.phone),
       status = COALESCE($9, p.status),
       updated_by = $10,
       updated_by_channel = $11,
       updated_at = now()
 WHERE p.id = $1
RETURNING p.id, p.tenant_id, p.first_name, p.father_last_name, p.mother_last_name,
          p.document_type, p.document_number, p.email, p.phone, p.status,
          p.created_by, p.created_by_channel, p.created_at, p.updated_by, p.updated_by_channel, p.updated_at`;

export const LIST_ROLES_QUERY = `
SELECT r.id, r.code, r.name, r.description, r.status,
       r.created_by, r.created_by_channel, r.created_at, r.updated_by, r.updated_by_channel, r.updated_at
  FROM greip.role r
 WHERE r.tenant_id = $1
 ORDER BY r.name`;

export const CREATE_ROLE_QUERY = `
INSERT INTO greip.role (tenant_id, code, name, description, status,
                        created_by, created_by_channel, updated_by, updated_by_channel)
VALUES ($1, $2, $3, $4, $5, $6, $7, $6, $7)
RETURNING id, code, name, description, status,
          created_by, created_by_channel, created_at, updated_by, updated_by_channel, updated_at`;

export const GET_ROLE_QUERY = `
SELECT r.id, r.code, r.name, r.description, r.status,
       r.created_by, r.created_by_channel, r.created_at, r.updated_by, r.updated_by_channel, r.updated_at
  FROM greip.role r
 WHERE r.id = $1 AND r.tenant_id = $2`;

export const LIST_PERMISSIONS_QUERY = `
SELECT p.id, p.code, p.name, p.description, p.status,
       p.created_by, p.created_by_channel, p.created_at, p.updated_by, p.updated_by_channel, p.updated_at
  FROM greip.permission p
 WHERE p.tenant_id = $1 AND p.status = 'A'
 ORDER BY p.code`;

export const ASSIGN_ROLE_QUERY = `
INSERT INTO greip.user_role (user_id, role_id, tenant_id, created_by, created_by_channel, updated_by, updated_by_channel)
SELECT $1, $2, r.tenant_id, $3, $4, $3, $4
  FROM greip.role r
 WHERE r.id = $2
ON CONFLICT (user_id, role_id) DO NOTHING`;

export const REMOVE_ROLE_QUERY = `
DELETE FROM greip.user_role
 WHERE user_id = $1 AND role_id = $2`;

export const LINK_PERMISSIONS_TO_ROLE_QUERY = `
INSERT INTO greip.role_permission (role_id, permission_id, tenant_id, created_by, created_by_channel, updated_by, updated_by_channel)
SELECT r.id, p.id, r.tenant_id, $3, $4, $3, $4
  FROM greip.role r
  JOIN greip.permission p ON p.tenant_id = r.tenant_id
 WHERE r.id = $1 AND r.tenant_id = $2 AND p.status = 'A'
ON CONFLICT (role_id, permission_id) DO NOTHING`;

export const USER_ROLES_QUERY = `
SELECT DISTINCT r.id, r.code, r.name, r.description, r.status
  FROM greip.user_person up
  JOIN greip.user_role ur ON ur.user_id = up.user_id
  JOIN greip.role r ON r.id = ur.role_id
 WHERE up.user_id = $1 AND r.status = 'A'
UNION
SELECT DISTINCT r.id, r.code, r.name, r.description, r.status
  FROM greip.user_person up
  JOIN greip.user_group_member ugm ON ugm.user_id = up.user_id
  JOIN greip.user_group_role ugr ON ugr.group_id = ugm.group_id
  JOIN greip.role r ON r.id = ugr.role_id
 WHERE up.user_id = $1 AND r.status = 'A'
 ORDER BY name`;

export const CREATE_TENANT_QUERY = `
INSERT INTO greip.tenant (code, name, status, created_by, created_by_channel, updated_by, updated_by_channel)
VALUES ($1, $2, $3, $4, $5, $4, $5)
RETURNING id, code, name, status,
          created_by, created_by_channel, created_at, updated_by, updated_by_channel, updated_at`;

export const UPDATE_ROLE_QUERY = `
UPDATE greip.role r
   SET name = COALESCE($3, r.name),
       description = COALESCE($4, r.description),
       status = COALESCE($5, r.status),
       updated_by = $6,
       updated_by_channel = $7,
       updated_at = now()
 WHERE r.id = $1 AND r.tenant_id = $2
RETURNING id, tenant_id, code, name, description, status,
          created_by, created_by_channel, created_at, updated_by, updated_by_channel, updated_at`;

export const DELETE_ROLE_QUERY = `
DELETE FROM greip.role
 WHERE id = $1 AND tenant_id = $2`;

export const UPDATE_PERMISSION_QUERY = `
UPDATE greip.permission p
   SET name = COALESCE($3, p.name),
       description = COALESCE($4, p.description),
       status = COALESCE($5, p.status),
       updated_by = $6,
       updated_by_channel = $7,
       updated_at = now()
 WHERE p.id = $1 AND p.tenant_id = $2
RETURNING p.id, p.tenant_id, p.code, p.name, p.description, p.status,
          p.created_by, p.created_by_channel, p.created_at, p.updated_by, p.updated_by_channel, p.updated_at`;

export const DELETE_PERMISSION_QUERY = `
DELETE FROM greip.permission
 WHERE id = $1 AND tenant_id = $2`;

export const CREATE_ROLE_PERMISSION_QUERY = `
INSERT INTO greip.role_permission (role_id, permission_id, tenant_id, created_by, created_by_channel, updated_by, updated_by_channel)
SELECT $1, p.id, $2, $3, $4, $3, $4
  FROM greip.permission p
 WHERE p.id = $5 AND p.tenant_id = $2 AND p.status = 'A'
ON CONFLICT (role_id, permission_id) DO NOTHING
RETURNING role_id, permission_id`;

export const DELETE_ROLE_PERMISSION_QUERY = `
DELETE FROM greip.role_permission
 WHERE role_id = $1 AND permission_id = $2 AND tenant_id = $3`;

export const CREATE_PERMISSION_QUERY = `
INSERT INTO greip.permission (tenant_id, code, name, description, status,
                              created_by, created_by_channel, updated_by, updated_by_channel)
VALUES ($1, $2, $3, $4, 'A', $5, $6, $5, $6)
ON CONFLICT (tenant_id, code) DO NOTHING
RETURNING id, tenant_id, code, name, description, status,
          created_by, created_by_channel, created_at, updated_by, updated_by_channel, updated_at`;

export const GET_ROLE_PERMISSIONS_QUERY = `
SELECT p.id, p.tenant_id, p.code, p.name, p.description, p.status,
       p.created_by, p.created_by_channel, p.created_at, p.updated_by, p.updated_by_channel, p.updated_at
  FROM greip.role_permission rp
  JOIN greip.permission p ON p.id = rp.permission_id
 WHERE rp.role_id = $1 AND rp.tenant_id = $2 AND p.status = 'A'
 ORDER BY p.code`;

export const DASHBOARD_COUNTS_QUERY = `
SELECT
  (SELECT COUNT(*)::int FROM greip.person WHERE tenant_id = $1 AND status = 'A') AS active_people,
  (SELECT COUNT(*)::int FROM greip.person WHERE tenant_id = $1) AS total_people,
  (SELECT COUNT(*)::int FROM greip.role WHERE tenant_id = $1 AND status = 'A') AS active_roles,
  (SELECT COUNT(*)::int FROM greip.role WHERE tenant_id = $1) AS total_roles,
  (SELECT COUNT(*)::int FROM greip.permission WHERE tenant_id = $1 AND status = 'A') AS active_permissions,
  (SELECT COUNT(*)::int FROM greip.permission WHERE tenant_id = $1) AS total_permissions,
  (SELECT COUNT(*)::int FROM greip.product WHERE tenant_id = $1 AND status = 'A') AS active_products,
  (SELECT COUNT(*)::int FROM greip.product WHERE tenant_id = $1) AS total_products,
  (SELECT COUNT(*)::int FROM greip.entity_change_log WHERE tenant_id = $1) AS total_audit,
  (SELECT COUNT(*)::int FROM greip.entity_change_log WHERE tenant_id = $1 AND created_at >= now() - interval '24 hours') AS audit_last_24h`;

export const USER_PERMISSIONS_QUERY = `
SELECT DISTINCT p.code
  FROM greip.user_person up
  JOIN greip.user_role ur ON ur.user_id = up.user_id
  JOIN greip.role_permission rp ON rp.role_id = ur.role_id
  JOIN greip.permission p ON p.id = rp.permission_id
 WHERE up.user_id = $1 AND p.status = 'A'
UNION
SELECT DISTINCT p.code
  FROM greip.user_person up
  JOIN greip.user_group_member ugm ON ugm.user_id = up.user_id
  JOIN greip.user_group_role ugr ON ugr.group_id = ugm.group_id
  JOIN greip.role_permission rp ON rp.role_id = ugr.role_id
  JOIN greip.permission p ON p.id = rp.permission_id
 WHERE up.user_id = $1 AND p.status = 'A'`;

export const LIST_USER_PERSONS_QUERY = `
SELECT up.user_id, p.first_name, p.father_last_name, p.mother_last_name,
       p.document_type, p.document_number, p.email, p.phone, p.status,
       p.created_by, p.created_by_channel, p.created_at, p.updated_by, p.updated_by_channel, p.updated_at
  FROM greip.user_person up
  JOIN greip.person p ON p.id = up.person_id
 WHERE up.tenant_id = $1
 ORDER BY p.father_last_name, p.first_name`;
