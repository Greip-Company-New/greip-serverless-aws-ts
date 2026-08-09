// Modelos de entrada/salida de usuario-lmb.

export interface CreateUserRequest {
  email: string;
  documentType: 'D' | 'R' | 'C';
  documentNumber: string;
  firstName: string;
  fatherLastName: string;
  motherLastName?: string;
  phone?: string;
  password?: string;
}

export interface UpdateUserRequest {
  userId: string;
  email?: string;
  documentType?: 'D' | 'R' | 'C';
  documentNumber?: string;
  firstName?: string;
  fatherLastName?: string;
  motherLastName?: string;
  phone?: string;
  status?: 'A' | 'I';
}

export interface ListUsersRequest {
  page?: number;
  pageSize?: number;
  status?: string;
  email?: string;
  document?: string;
}

export interface AssignRolesRequest {
  userId: string;
  roles: string[];
}

export interface RemoveRoleRequest {
  userId: string;
  roleId: string;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  roleId: string;
  code?: string;
  name?: string;
  description?: string;
  status?: 'A' | 'I';
}

export interface CreatePermissionRequest {
  code: string;
  name: string;
  description?: string;
}

export interface UpdatePermissionRequest {
  permissionId: string;
  code?: string;
  name?: string;
  description?: string;
  status?: 'A' | 'I';
}

export interface AssignRolePermissionsRequest {
  roleId: string;
  permissions: string[];
}

export interface RemoveRolePermissionRequest {
  roleId: string;
  permissionId: string;
}

export interface CreateTenantRequest {
  code: string;
  name: string;
  status?: 'A' | 'I';
}

export interface DashboardSummaryRequest {
  tenantId?: number;
}
