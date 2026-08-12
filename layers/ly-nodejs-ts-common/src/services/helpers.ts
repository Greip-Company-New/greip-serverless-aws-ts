import { ResponseFactory } from "src/models/reponse/response-factory.js";
import { decryptAes, encryptAes } from "./aes.js";
import { SecretsManagerService } from "./secretsmanager.js";
import { LambdaService } from "./lambda.js";
import { SQSService } from "./sqs.js";
import { FORMATS, MESSAGES_ERROR } from "src/constants/ConstantCore.js";
import { getDateNowFormat, getNewUuId } from "src/base/util.js";
import { DynamoDBService } from "./dynamodb.js";
import jwt from 'jsonwebtoken';

export interface EntityChangeInput {
  entity: string;
  entityKey: string | number;
  tenant?: string;      // codigo del tenant (ej. GREIP)
  tenantId?: number;    // id numerico del tenant (si ya se conoce)
  changeType?: string;  // CREATE | UPDATE | DELETE | ASSIGN | REMOVE (cambios de datos)
  action?: string;      // USER_LOGIN | USER_CREATED | PASSWORD_CHANGED ... (eventos de seguridad)
  status?: string;      // A | I
  userId?: string;
  channel?: string;
  sourceIp?: string;
  userAgent?: string;
  changes?: Record<string, any>; // { campo: { before, after } } o detalle del evento
}

export class Helpers {
    static obtenerUltimaFechaTrimestral(year: number, month: number) {
        let numMesTrimestrales = [12, 9, 6, 3];
        let i = 0;
        while (i < 4) {
            if (numMesTrimestrales[i] <= month) {
                return new Date(year, numMesTrimestrales[i], 0);
            }
            i++;
        }
        return new Date(year - 1, numMesTrimestrales[0], 0);
    }

    static devolverFechaCompleta(dia: string, mes: number, anio: number) {
        const meses = [
            "Enero",
            "Febrero",
            "Marzo",
            "Abril",
            "Mayo",
            "Junio",
            "Julio",
            "Agosto",
            "Septiembre",
            "Octubre",
            "Noviembre",
            "Diciembre",
        ];
        if (dia == "" || dia == null || dia == undefined) {
            return meses[mes] + " " + anio;
        }
        return dia + " de " + meses[mes] + " " + anio;
    }

    static async encriptarData(data: any, secretEncryption: string = process.env.SM_ENCRIPTACION_GREIP || 'Greip/Encriptacion') {
        const secretManagerService: SecretsManagerService = new SecretsManagerService();
        const configSecret = await secretManagerService.getSecretValue(secretEncryption) || '{}';
        const { algorithm, key, iv } = configSecret;
        return encryptAes(data, algorithm, key, iv).encrypted;
    }

    static async desencriptarData(data: any, secretEncryption: string = process.env.SM_ENCRIPTACION_GREIP || 'Greip/Encriptacion') {
        const secretManagerService: SecretsManagerService = new SecretsManagerService();
        const configSecret = await secretManagerService.getSecretValue(secretEncryption) || '{}';
        const { algorithm, key, iv } = configSecret;
        const result = decryptAes(data, algorithm, key, iv);
        if (result.code !== 200 || result.decrypted === undefined) {
            throw new Error(`Error en desencriptarData: ${result.message || 'Resultado de desencripción vacío'}`);
        }
        return result.decrypted;
    }

    static manejarErrorException(error: any, requestId: string) {
        try {
            const parsed = JSON.parse(error.message);
            if (parsed && typeof parsed.success === 'boolean') {
                parsed.requestId = requestId;
                throw new Error(JSON.stringify(parsed));
            }
        } catch (e: any) {
            if (e.message && e.message.includes('"success":')) {
                throw e;
            }
        }
        let result = ResponseFactory.fromError(error);
        result.requestId = requestId;
        throw new Error(JSON.stringify(result));
    }

    static async validarIdentidadJwt(payload: any): Promise<{ cedula: string; codCuenta: string }> {
        const authHeader = payload.headers['Authorization'] || payload.headers['authorization'] || '';
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Token JWT es obligatorio');
        }
        const token = authHeader.replace('Bearer ', '');

        const secretManagerService: SecretsManagerService = new SecretsManagerService();
        const publicKeyObject = await secretManagerService.getSecretValue(
            process.env.SM_JWT_PUBLIC_KEY || 'Greip/JWT-Public'
        );
        const publicKey = typeof publicKeyObject === 'string' ? publicKeyObject : publicKeyObject.publicKey;

        const decoded = jwt.verify(token, publicKey, {
            algorithms: ['RS256'],
            issuer: 'Greip'
        }) as any;

        const decryptedData = await Helpers.desencriptarData(decoded.data,
            process.env.SM_ENCRIPTACION_TOKEN || 'Greip/Encriptacion/Token');
        const { sub, codCuenta, canal } = JSON.parse(decryptedData);

        const requestCanal = payload.headers['Canal'] || payload.headers['canal'] || '';
        if (canal && requestCanal && canal !== requestCanal) {
            throw new Error('Token no es valido para este canal');
        }

        return {
            cedula: sub,
            codCuenta: codCuenta || ''
        };
    }

    static async validarIdentidad(payload: any): Promise<any> {

        const authHeader = payload.headers['Authorization'] || payload.headers['authorization'] || '';
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const { cedula, codCuenta } = await this.validarIdentidadJwt(payload);
                return ResponseFactory.success({ userIdentity: cedula, codCuenta });
            } catch (error: any) {
                console.log('JWT validation failed, falling back to legacy:', error.message);
            }
        }

        let tokenUserDecrypted = payload.headers['User-Token'] || payload.headers['user-token'] || '';

        if (!tokenUserDecrypted) {
            return ResponseFactory.unauthorized('Token User es obligatorio');
        }

        let userIdentityDecrypted = payload.headers['User-Identity'] || payload.headers['user-identity'] || '';
        let codCuentaDecrypted = payload.headers['Cod-Cuenta'] || payload.headers['cod-cuenta'] || '';

        const lambdaService: LambdaService = new LambdaService();

        const requestValidateTokeUser = {
            origin: 'LAMBDA_EVENT',
            action: 'validateTokeUser',
            payload: {
                tokenUser: tokenUserDecrypted,
                userIdentity: userIdentityDecrypted,
                codCuenta: codCuentaDecrypted
            }
        };


        const responseInvokeLambda = await lambdaService.invokeLambda({
            functionName: process.env.LMB_SEGURIDAD || '',
            payload: requestValidateTokeUser
        });

        const responseInvokeLambdaJson = typeof responseInvokeLambda === 'string' ? JSON.parse(responseInvokeLambda) : responseInvokeLambda;

        const responseValidateTokeUser = JSON.parse(responseInvokeLambdaJson.payload)

        if (!responseValidateTokeUser.payload.success) {
            return ResponseFactory.unauthorized(MESSAGES_ERROR.UNAUTHORIZED);
        } else {
            return ResponseFactory.success({ userIdentity: responseValidateTokeUser.payload.tokenUser.codUsuario, codCuenta: responseValidateTokeUser.payload.tokenUser.codCuenta });
        }

    }

    static async registrarLogger(request: any, response: any, module: string, functionality: string, identity: string, detail: string = '') {
        try {
            response = JSON.parse(response.message);
        } catch (e: any) {
            response = response;
        }

        let loggerPayload = {
            id: getNewUuId(),
            timestamp: getDateNowFormat(FORMATS.FECHA_HORA),
            requestId: request.requestId,
            statusCode: response.statusCode || 500,
            success: response.success || false,
            channel: request.canal,
            module: module,
            functionality: functionality,
            identity: identity,
            message: response.message || 'Error no controlado!',
            detail: detail,
            request: request || {},
            response: response || {}
        }

        const dynamoDBService = new DynamoDBService();
        await dynamoDBService.putItem('TBL_TRANSVERSAL_LOGGER', loggerPayload)
        console.log('LoggerId >>>> ', loggerPayload.id);
    }

    /**
     * Construye el detalle de cambios de una entidad comparando los campos
     * definidos en `fields`. Devuelve { campo: { before, after } } solo para
     * los campos que difieren. Sirve para CREATE (before=null), UPDATE y
     * DELETE (after=null) de forma unificada.
     */
    static buildEntityChanges(before: Record<string, any> | null, after: Record<string, any> | null, fields: string[]): Record<string, any> {
        const cambios: Record<string, any> = {};
        for (const campo of fields) {
            const vAntes = before ? before[campo] : null;
            const vDespues = after ? after[campo] : null;
            if (String(vAntes ?? '') !== String(vDespues ?? '')) {
                cambios[campo] = { before: vAntes, after: vDespues };
            }
        }
        return cambios;
    }

    /**
     * Encola un cambio/evento de entidad para el historico de auditoria.
     * No bloquea el request: envia a la cola SQS (greip-audit-<env>) y la
     * Lambda AUDIT_SYNC_LMB lo persiste en PostgreSQL (entity_change_log).
     */
    static async registerEntityChange(input: EntityChangeInput): Promise<void> {
        const queueUrl = process.env.SQS_AUDIT_QUEUE_URL || 'https://sqs.us-east-2.amazonaws.com/918897411288/greip-audit-dev';
        const sqsService = new SQSService();
        await sqsService.sendMessage({
            queueUrl,
            messageBody: input
        });
    }

}
