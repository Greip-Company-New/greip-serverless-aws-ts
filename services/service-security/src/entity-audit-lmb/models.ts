export interface EntityChangeRecord {
  entity: string;        // entidad afectada (product, user, role, ...)
  entityKey: string;     // identificador del registro (id, userId, roleId, ...)
  tenantId?: number;     // tenant al que pertenece el cambio
  changeType: string;    // CREATE | UPDATE | DELETE | ASSIGN | REMOVE
  status?: string;       // A | I
  userId?: string;       // usuario que realizo el cambio
  channel?: string;      // canal desde el que se realizo (AppWeb, AppMovil, ...)
  changes?: Record<string, any>; // { campo: { antes, despues } }
}

export interface RegisterEntityChangeRequest {
  entity: string;
  entityKey: string;
  tenantId?: number;
  changeType: string;
  status?: string;
  userId?: string;
  channel?: string;
  changes?: Record<string, any>;
}

export interface EntityChangeLogRow {
  id: string;
  entity: string;
  entity_key: string;
  tenant_id: number;
  change_type: string;
  action?: string | null;
  status: string;
  user_id: string;
  user_first_name?: string | null;
  user_father_last_name?: string | null;
  user_mother_last_name?: string | null;
  channel: string;
  source_ip?: string | null;
  user_agent?: string | null;
  changes: Record<string, any>;
  created_at: string;
}
