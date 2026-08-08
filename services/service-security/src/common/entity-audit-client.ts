// Cliente reutilizable del microservicio de auditoria de entidades.
// Invoca por Lambda-to-Lambda la funcion ENTITY_AUDIT_LMB para persistir
// el historial de cambios de cualquier entidad.
import { LambdaService } from 'ly-nodejs-ts-common';

export interface EntityChangeInput {
  entity: string;
  entityKey: string | number;
  tenantId?: number;
  changeType: string;   // CREATE | UPDATE | DELETE | ASSIGN | REMOVE
  status?: string;      // A | I
  userId?: string;
  channel?: string;
  changes?: Record<string, any>; // { campo: { antes, despues } }
}

let lambdaService: LambdaService | null = null;

function getLambdaService(): LambdaService {
  if (!lambdaService) {
    lambdaService = new LambdaService();
  }
  return lambdaService;
}

export async function registerEntityChange(input: EntityChangeInput): Promise<void> {
  const functionName = process.env.LMB_ENTITY_AUDIT || 'SRV-SECURITY-LMB-ENTITY-AUDIT';
  const result = await getLambdaService().invokeLambda({
    functionName,
    payload: {
      origin: 'LAMBDA_EVENT',
      action: 'registerChange',
      payload: input
    }
  });
  const raw = typeof result.payload === 'string' ? JSON.parse(result.payload) : result.payload;
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const inner = data?.payload;
  if (!inner || inner.success === false) {
    throw new Error(`Error registrando auditoria de ${input.entity}: ${inner?.message || 'respuesta invalida'}`);
  }
}
