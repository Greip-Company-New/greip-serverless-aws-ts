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
                          document_type, document_number, email, phone, status)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, tenant_id, first_name, father_last_name, mother_last_name,
          document_type, document_number, email, phone, status`;

export const CREATE_USER_PERSON_QUERY = `
INSERT INTO greip.user_person (user_id, person_id, tenant_id)
VALUES ($1, $2, $3)`;

export const GET_USER_PERSON_QUERY = `
SELECT up.user_id, up.person_id, up.tenant_id, p.first_name, p.father_last_name,
       p.mother_last_name, p.document_type, p.document_number, p.email,
       p.phone, p.status
  FROM greip.user_person up
  JOIN greip.person p ON p.id = up.person_id
 WHERE up.user_id = $1`;

export const LIST_ROLES_QUERY = `
SELECT r.id, r.code, r.name, r.description, r.status
  FROM greip.role r
 WHERE r.tenant_id = $1
 ORDER BY r.name`;

export const CREATE_ROLE_QUERY = `
INSERT INTO greip.role (tenant_id, code, name, description, status)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, code, name, description, status`;

export const GET_ROLE_QUERY = `
SELECT r.id, r.code, r.name, r.description, r.status
  FROM greip.role r
 WHERE r.id = $1 AND r.tenant_id = $2`;

export const LIST_PERMISSIONS_QUERY = `
SELECT p.id, p.code, p.name, p.description, p.status
  FROM greip.permission p
 WHERE p.tenant_id = $1 AND p.status = 'A'
 ORDER BY p.code`;

export const ASSIGN_ROLE_QUERY = `
INSERT INTO greip.user_role (user_id, role_id)
VALUES ($1, $2)
ON CONFLICT (user_id, role_id) DO NOTHING`;

export const REMOVE_ROLE_QUERY = `
DELETE FROM greip.user_role
 WHERE user_id = $1 AND role_id = $2`;

export const LINK_PERMISSIONS_TO_ROLE_QUERY = `
INSERT INTO greip.role_permission (role_id, permission_id)
SELECT r.id, p.id
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
       p.document_type, p.document_number, p.email, p.phone, p.status
  FROM greip.user_person up
  JOIN greip.person p ON p.id = up.person_id
 WHERE up.tenant_id = $1
 ORDER BY p.father_last_name, p.first_name`;
