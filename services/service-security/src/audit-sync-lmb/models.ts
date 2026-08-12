export interface AuditSyncMessage {
  entity: string;
  entityKey: string | number;
  tenant?: string;
  tenantId?: number;
  changeType?: string;
  action?: string;
  status?: string;
  userId?: string;
  channel?: string;
  sourceIp?: string;
  userAgent?: string;
  changes?: Record<string, any>;
}
