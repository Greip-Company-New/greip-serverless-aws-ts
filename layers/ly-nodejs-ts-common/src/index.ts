export * from './services/aes.js';
export * from './models/aes.interfaces.js';

export * from './base/app-core.js'
export * from './base/app-exception.js'
export * from './base/authorization-exception.js'
export * from './base/business-exception.js'
export * from './base/exception.js'
export * from './base/handler-exception.js'
export * from './base/http-client.js'
export * from './base/logger.js'
export * from './base/repository-exception.js'
export * from './base/service-exception.js'
export * from './base/timer.js'
export * from './base/util.js'
export * from './base/validation-exception.js'

export * from './constants/ConstantCore.js'

export * from './middleware/api-gateway-event.middleware.js'
export * from './middleware/app-factory.js'
export * from './middleware/lambda-event.middleware.js'
export * from './middleware/auth.middleware.js'

export * from './services/token.service.js'

export * from './models/base/app-core.interface.js'
export * from './models/base/app-exception.interface.js'
export * from './models/base/exception.interface.js'
export * from './models/base/http-client.interface.js'
export * from './models/base/timer.interface.js'
export * from './models/base/util.interface.js'
export * from './models/middleware/api-gateway-event.middleware.interface.js'

export * from './models/reponse/response-factory.js'
export * from './models/reponse/response.dto.js'

export * from './validations/generics.js'

export * from './services/helpers.js'



export { default as ApiGatewayEvent } from './middleware/api-gateway-event.middleware.js';
export { default as AuthMiddleware } from './middleware/auth.middleware.js';
export { verifyToken } from './services/token.service.js';

import { DynamoDBService } from './services/dynamodb.js';
import { S3Service } from './services/s3.js';
import { SQSService } from './services/sqs.js';
import { SNSService } from './services/sns.js';
import { SESService } from './services/ses.js';
import { EventBridgeService } from './services/eventbridge.js';
import { StepFunctionsService } from './services/stepfunctions.js';
import { SecretsManagerService } from './services/secretsmanager.js';
import { ParameterStoreService } from './services/parameterstore.js';
import { ConfigService } from './services/config-service.js';
import { LambdaService } from './services/lambda.js';
import { Logger } from './utils.js';
import { Helpers } from './services/helpers.js';

export * from './types.js';

export {
    DynamoDBService,
    S3Service,
    SQSService,
    SNSService,
    SESService,
    EventBridgeService,
    StepFunctionsService,
    SecretsManagerService,
    ParameterStoreService,
    ConfigService,
    LambdaService,
    Helpers
};

export class CommonUtils {
    public dynamodb: DynamoDBService;
    public s3: S3Service;
    public sqs: SQSService;
    public sns: SNSService;
    public ses: SESService;
    public eventBridge: EventBridgeService;
    public stepFunctions: StepFunctionsService;
    public secretsManager: SecretsManagerService;
    public parameterStore: ParameterStoreService;
    public config: ConfigService;
    public lambda: LambdaService;
    public helpers: Helpers;

    private logger: Logger;

    constructor(options?: {
        secretsCache?: any;
        parametersCache?: any;
        configOptions?: any;
    }) {
        this.logger = new Logger('CommonUtils');

        this.dynamodb = new DynamoDBService();
        this.s3 = new S3Service();
        this.sqs = new SQSService();
        this.sns = new SNSService();
        this.ses = new SESService();
        this.eventBridge = new EventBridgeService();
        this.stepFunctions = new StepFunctionsService();
        this.lambda = new LambdaService();
        this.helpers = new Helpers();

        this.secretsManager = new SecretsManagerService(options?.secretsCache);
        this.parameterStore = new ParameterStoreService(options?.parametersCache);
        this.config = new ConfigService(options?.configOptions);

        this.logger.info('AWSUtils initialized');
    }

    /**
     * Método de conveniencia para logging
     */
    log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
        switch (level) {
            case 'debug':
                this.logger.debug(message, meta);
                break;
            case 'info':
                this.logger.info(message, meta);
                break;
            case 'warn':
                this.logger.warn(message, meta);
                break;
            case 'error':
                this.logger.error(message, meta);
                break;
        }
    }

    /**
     * Limpiar caches de todos los servicios
     */
    clearAllCaches(): void {
        this.secretsManager.clearCache();
        this.parameterStore.clearCache();
        this.config.clearCache();
        this.logger.info('Cleared all caches');
    }
}

// Instancia singleton por defecto
export const commonUtils = new CommonUtils();

// Exportar la instancia por defecto
export default commonUtils;