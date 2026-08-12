# Common Layer for Lambda (GREIP COMPANY)

Layer de Lambda en TypeScript con utilidades transversales para los microservicios de GREIP COMPANY (adaptada del proyecto `ly-nodejs-ts-common` de AFP Siembra, licencia MIT). Proporciona servicios AWS, encriptación AES, middleware para API Gateway/Lambda, cliente HTTP, caché, logging estructurado, manejo de excepciones, respuestas estandarizadas y helpers de propósito general.

## Características

- **Servicios AWS**: DynamoDB, S3, SQS, SNS, EventBridge, StepFunctions, Secrets Manager, Parameter Store, Lambda
- **Encriptación AES**: cifrado/descifrado con `crypto` nativo de Node.js
- **Middleware**: decoradores @middy/core para API Gateway REST y Lambda Events
- **Cliente HTTP**: basado en axios con soporte GET, POST, PUT, DELETE, PATCH
- **Excepciones**: jerarquía de excepciones con código, mensajes y error original
- **Response estandarizado**: `ResponseFactory` con soporte para paginación, metadata, timezone RD
- **Helpers**: encriptación/desencriptación vía Secrets Manager, validación de identidad, loggers, fechas, attachments
- **Timer**: medición de tiempo de ejecución con timezone configurable
- **Utilidades**: JSONPath, Velocity templates, UUID, validación de email/teléfono, manipulación de fechas, arrays, objetos
- **CacheManager**: caché en memoria con TTL configurable
- **Retry + timeout**: reintentos exponenciales con jitter

## Instalación

```bash
git clone <repo-url>
cd ly-nodejs-ts-common

npm install

# Build
npm run build

# Crear package para Lambda Layer
npm run package

# Desplegar en AWS
npm run deploy          # perfil por defecto
AWS_REGION=us-east-2 bash deploy-layer.sh devGreipCompany
```

## Uso rápido

```typescript
import { commonUtils } from 'ly-nodejs-ts-common';

// Invocar otra Lambda
const result = await commonUtils.lambda.invokeLambda({
  functionName: 'my-function',
  payload: { action: 'process', data: { id: '123' } }
});

// Obtener un secreto (con caché automático)
const dbCreds = await commonUtils.secretsManager.getSecretValue('prod/database');

// Enviar a SQS
await commonUtils.sqs.sendMessage({
  queueUrl: 'https://sqs.us-east-1.amazonaws.com/123/my-queue',
  messageBody: { event: 'user.created' }
});
```

## API Reference

### Servicios AWS

Los servicios AWS están disponibles tanto como clases individuales como a través de la fachada `CommonUtils`.

| Servicio | Clase | Métodos |
|---|---|---|
| DynamoDB | `DynamoDBService` | `getItem`, `putItem`, `updateItem`, `deleteItem`, `query`, `batchGet`, `batchWrite`, `transactWrite` |
| S3 | `S3Service` | `getObject`, `getObjectAsString`, `getObjectAsBuffer`, `getObjectAsJson`, `putObject`, `putObjectAsJson`, `putObjectAsText`, `deleteObject`, `deleteObjects`, `listObjects`, `listObjectKeys`, `copyObject`, `moveObject`, `objectExists`, `getObjectMetadata`, `getSignedUrl`, `getSignedUploadUrl` |
| SQS | `SQSService` | `sendMessage`, `receiveMessages`, `deleteMessage`, `changeMessageVisibility`, `purgeQueue`, `getQueueAttributes`, `getQueueArn`, `getQueueUrl`, `getApproximateNumberOfMessages`, `sendBatchMessages` (con SendMessageBatchCommand), `processMessages` |
| SNS | `SNSService` | `publishMessage`, `publishToPhone`, `createTopic`, `deleteTopic`, `listSubscriptions`, `subscribe`, `unsubscribe` |
| EventBridge | `EventBridgeService` | `putEvent`, `putEvents`, `putRule`, `putTargets`, `removeTargets`, `deleteRule`, `listRules`, `listTargets` |
| StepFunctions | `StepFunctionsService` | `startExecution`, `describeExecution`, `stopExecution`, `listExecutions`, `sendTaskSuccess`, `sendTaskFailure`, `sendTaskHeartbeat` |
| Secrets Manager | `SecretsManagerService` | `getSecret`, `getSecretValue`, `getCachedSecret`, `createSecret`, `updateSecret`, `putSecretValue`, `deleteSecret`, `restoreSecret`, `rotateSecret`, `cancelRotateSecret`, `describeSecret`, `listSecrets`, `getAllSecrets`, `invalidateCache`, `clearCache` |
| Parameter Store | `ParameterStoreService` | `getParameter`, `getParameterValue`, `getCachedParameter`, `getParameters`, `getParametersByPath`, `getAllParametersByPath`, `putParameter`, `deleteParameter`, `deleteParameters`, `describeParameters`, `searchParameters`, `addTagsToResource`, `removeTagsFromResource`, `labelParameterVersion` |
| Lambda | `LambdaService` | `invokeLambda` |
| Config | `ConfigService` | `loadConfig`, `loadEnvironmentConfig`, `get`, `getMultiple`, `invalidateCache`, `clearCache` |

### CommonUtils (fachada unificada)

```typescript
import { CommonUtils, commonUtils } from 'ly-nodejs-ts-common';

// Instancia propia
const aws = new CommonUtils({
  secretsCache: { ttl: 600000 },
  parametersCache: { ttl: 300000 }
});

// O singleton pre-creado
commonUtils.dynamodb.getItem(...)
commonUtils.s3.putObject(...)
commonUtils.sqs.sendMessage(...)
commonUtils.sns.publishMessage(...)
commonUtils.eventBridge.putEvent(...)
commonUtils.stepFunctions.startExecution(...)
commonUtils.secretsManager.getSecretValue(...)
commonUtils.parameterStore.getParameterValue(...)
commonUtils.lambda.invokeLambda(...)
commonUtils.config.get(...)
commonUtils.helpers.encriptarData(...)

// Logging
commonUtils.log('info', 'Processing order', { orderId: '123' });

// Limpiar todos los caches
commonUtils.clearAllCaches();
```

### LambdaService

```typescript
import { LambdaService } from 'ly-nodejs-ts-common';

const lambda = new LambdaService();

const result = await lambda.invokeLambda({
  functionName: 'my-function',
  payload: { userId: '123' },
  region: 'us-east-1',
  invocationType: 'RequestResponse' // 'Event' | 'RequestResponse' | 'DryRun'
});
// result.statusCode -> number
// result.payload -> any (auto-parseado)
// result.executedVersion -> string
// result.error -> string | undefined
```

### Encriptación AES

```typescript
import { encryptAes, decryptAes, generateRandomKeyAes } from 'ly-nodejs-ts-common';

const key = generateRandomKeyAes(32);   // 256 bits
const iv = generateRandomKeyAes(16);    // 128 bits

const encrypted = encryptAes(
  { userId: '123', email: 'test@test.com' },
  'aes-256-cbc',
  key,
  iv
);
// encrypted.encrypted -> string hex

const decrypted = decryptAes(encrypted.encrypted!, 'aes-256-cbc', key, iv);
// decrypted.decrypted -> string JSON
```

### Helpers

```typescript
import { Helpers } from 'ly-nodejs-ts-common';

// Encriptar/desencriptar usando Secrets Manager
const encrypted = await Helpers.encriptarData(
  { userId: '123' },
  'Greip/Encriptacion'
);
const decrypted = await Helpers.desencriptarData(
  encrypted,
  'Greip/Encriptacion'
);

// Validar identidad (valida token contra Lambda de seguridad)
const identity = await Helpers.validarIdentidad({
  headers: { 'User-Token': '...', 'User-Identity': '...', 'Cod-Cuenta': '...' }
});

// Registrar logger en DynamoDB
await Helpers.registrarLogger(
  request, response, 'ModuloUsuarios', 'crearUsuario', 'user-123'
);

// Manejar error estandarizado
Helpers.manejarErrorException(error, requestId);

// Obtener última fecha trimestral
const fecha = Helpers.obtenerUltimaFechaTrimestral(2024, 11);

// Devolver fecha descriptiva
const fechaStr = Helpers.devolverFechaCompleta('15', 11, 2024);
// "15 de Noviembre 2024"
```

### ResponseFactory & Response DTO

```typescript
import { ResponseFactory, Response } from 'ly-nodejs-ts-common';

// Respuestas exitosas
ResponseFactory.success({ id: '123', name: 'Juan' });
ResponseFactory.created({ id: '123' });
ResponseFactory.updated({ id: '123' });
ResponseFactory.deleted();

// Respuesta paginada
ResponseFactory.paginated(
  [{ id: '1' }, { id: '2' }],
  100,   // total
  1,     // page
  10,    // limit
);

// Respuestas de error
ResponseFactory.badRequest('Datos inválidos');
ResponseFactory.unauthorized('Token expirado');
ResponseFactory.forbidden('Acceso denegado');
ResponseFactory.notFound('Usuario no encontrado');
ResponseFactory.conflict('Registro duplicado');
ResponseFactory.internalServerError('Error inesperado');
ResponseFactory.validationError(['El email es requerido']);

// Desde una excepción
ResponseFactory.fromError(error);

// Response DTO con metadata
const res = new Response({
  success: true,
  data: { id: '123' },
  message: 'Usuario creado',
  statusCode: 201
});
res.setPath('/api/users');
res.setRequestId('req-abc');
res.addMetadata('source', 'lambda');
```

### Middleware (API Gateway y Lambda Events)

```typescript
import middy from '@middy/core';
import ApiGatewayEvent from 'ly-nodejs-ts-common';
import { bootstrap, addMiddleware } from 'ly-nodejs-ts-common';

// Opción 1: Usar bootstrap factory
const handler = bootstrap({
  async getUser(payload) { /* ... */ },
  async createUser(payload) { /* ... */ }
});

// Opción 2: Usar middleware directamente
import LambdaEventMiddleware from 'ly-nodejs-ts-common';

const handler = middy(async (event) => {
  // controller
})
  .use(LambdaEventMiddleware())
  .use(/* otros middlewares */);

// Opción 3: API Gateway Event middleware
import ApiGatewayEventMiddleware from 'ly-nodejs-ts-common';

const handler = middy(async (event) => {
  // controller - recibe { origin, action, payload }
})
  .use(ApiGatewayEventMiddleware());
```

El middleware transforma el evento entrante en `{ origin, action, payload }`:
- `origin`: tipo de evento (`API_GATEWAY_REST_EVENT`, `LAMBDA_EVENT`)
- `action`: nombre de la función a ejecutar
- `payload`: datos del request

En el `after` ejecuta automáticamente `handler.response[action](payload)`.

### Excepciones

Jerarquía de excepciones con soporte para código, httpCode, mensajes y error original:

```typescript
import Exception from 'ly-nodejs-ts-common';
import AppException from 'ly-nodejs-ts-common';
import BusinessException from 'ly-nodejs-ts-common';
import ValidationException from 'ly-nodejs-ts-common';
import AuthorizationException from 'ly-nodejs-ts-common';
import RepositoryException from 'ly-nodejs-ts-common';
import ServiceException from 'ly-nodejs-ts-common';
import HandlerException from 'ly-nodejs-ts-common';
import { AppCore } from 'ly-nodejs-ts-common';

// Lanzar excepción personalizada
AppCore.throwException({
  code: 'ERROR-001',
  messages: ['Recurso no encontrado'],
  exception: error
});

// Excepción directa
throw new BusinessException({
  code: 'ERROR-002',
  messages: ['Regla de negocio violada'],
  httpCode: 422
});

// ValidationException lanza solo si la condición es true
new ValidationException({
  code: 'ECORE-0002',
  messages: ['Validación fallida']
}).throw(!payload.email); // solo lanza si !email
```

### HttpClient

```typescript
import { HttpClient } from 'ly-nodejs-ts-common';

const client = new HttpClient({
  baseUrl: 'https://api.example.com',
  baseHeaders: { 'Authorization': 'Bearer token' }
});

// GET
const getRes = await client.get({ url: '/users', data: { page: 1 } });

// POST
const postRes = await client.post({
  url: '/users',
  data: { name: 'Juan', email: 'juan@test.com' }
});

// PUT, DELETE, PATCH con la misma interfaz

// Manejo de errores
const res = await client.get(
  { url: '/users/123' },
  (error) => { throw new AppException({ /*...*/ }); }
);
```

### Timer

```typescript
import Timer from 'ly-nodejs-ts-common';

const timer = new Timer();
timer.start();

// ... operaciones ...

timer.end();
const diff = timer.getTime();
// diff.hours, diff.minutes, diff.seconds

// Obtener hora en timezone de RD
const rdTime = timer.getTimeZone('America/Santo_Domingo');
```

### Logger

```typescript
import Logger from 'ly-nodejs-ts-common';

Logger.debug('Mensaje debug');
Logger.info({ evento: 'user.created', userId: '123' });
Logger.error(new Error('Error de conexión'));
```

### Utilidades

```typescript
import {
  renameJsonKey, validate, capitalize, formatToCurrency,
  formatFechaDescriptiva, replaceVariables, getObjectAttach,
  getDataAttachments, removeAttrBlankFromObject,
  phoneNumber, telephoneNumber, email, _email, number,
  getDateNow, getDateNowFormat, getNewUuId,
  arrayToString, concatArrays,
  dateIsGreater, dateIsGreaterOrEqual, dateIsLess, dateIsLessOrEqual,
  dateDifferenceInHours, dateDifferenceInMonths,
  asyncForEach, paddingLeft, paddingRight, mergeArraysOfStrings,
  isEmpty
} from 'ly-nodejs-ts-common';

// Validación
isEmpty(null, undefined, '', [], {}); // true
email('test@test.com'); // true
phoneNumber('8095551234'); // true

// Fechas (zona horaria: America/Santo_Domingo)
getDateNow(); // Moment
getDateNowFormat('DD/MM/YYYY h:mm:ss'); // "15/11/2024 3:45:30"
formatFechaDescriptiva(15, 11, 2024); // "15 de noviembre de 2024"

// Strings
capitalize('hola mundo'); // "Hola Mundo"
formatToCurrency(1234567.8); // "1,234,567.80"
paddingLeft('0000', '123'); // "0123"

// Arrays
concatArrays([1, 2], [3, 4]); // [1, 2, 3, 4]
mergeArraysOfStrings(['a', 'b'], ['b', 'c']); // ['a', 'b', 'c']

// Objetos
renameJsonKey({ oldKey: 'value' }, 'oldKey', 'newKey');
removeAttrBlankFromObject({ a: null, b: 'val', c: '' }); // { b: 'val' }

// Adjuntos para email
getObjectAttach({ filename: 'doc.pdf', type: 'url', content: 'https://...' });
getDataAttachments([{ filename: 'img.png', type: 'base64', content: 'data:...' }]);

// Templates Velocity
replaceVariables('Hola $usuario', { usuario: 'Juan' }); // "Hola Juan"

// UUID
getNewUuId(); // "a1b2c3d4-..."

// Async forEach
await asyncForEach([1, 2, 3], async (n) => { await process(n); });
```

### CacheManager

```typescript
import { CacheManager } from 'ly-nodejs-ts-common';

const cache = new CacheManager(500);
cache.set('key', { data: 'value' }, 300000); // TTL 5 min
const val = cache.get('key');
cache.delete('key');
cache.clear();
```

### Constantes

```typescript
import {
  ConstantCore,
  HTTP, HTTP_METHODS, FORMATS, TypeError,
  ENCODER, AppConstant, LOGGING_LEVEL, STAGE,
  NOTIFICATION_TYPES, NOTIFICATION_TEMPLATES, NOTIFICATION_DEFAULT,
  TIMEZONE, CANALES, CRYPTO_LEVEL, AWS_EVENTS, EXCEPTIONS,
  MESSAGES_SUCCESS, MESSAGES_ERROR, MESSAGES_INFO,
  MESSAGES_WARNING, MESSAGES_OPERATION, MESSAGES_CONFIRMATION,
  MESSAGES_VALIDATION
} from 'ly-nodejs-ts-common';

HTTP.OK_STATUS       // { code: 200, description: 'OK' }
HTTP.BAD_REQUEST_STATUS  // { code: 400, description: 'BAD REQUEST' }

EXCEPTIONS.AUTHORIZATION_EXCEPTION // { code: 'ECORE-0011', message: 'Authorization Exception' }

MESSAGES_ERROR.NOT_FOUND       // 'Registro no encontrado'
MESSAGES_SUCCESS.CREATE_SUCCESS // 'Registro creado exitosamente'

STAGE.DEV // 'DEV'

AWS_EVENTS.API_GATEWAY_REST // 'API_GATEWAY_REST_EVENT'
```

## Tipos

```typescript
import type {
  // AWS Services
  S3ObjectParams, S3UploadResult, S3DownloadResult,
  DynamoDBQueryParams, DynamoDBUpdateParams,
  SQSSendParams, SQSReceiveParams, SQSMessage,
  SNSPublishParams,
  EventBridgePutParams, EventBridgeResult,
  StepFunctionsStartParams, StepFunctionsResult,
  SecretsManagerGetParams, SecretsManagerResult,
  ParameterStoreGetParams, ParameterStorePutParams, ParameterStoreResult,
  LambdaInvokeParams, LambdaInvokeResult,
  CacheConfig,

  // Crypto
  CryptoResponseBase,

  // Response
  ApiResponse,

  // HTTP Client
  HttpClientOptions, SendParams, HttpMethod,

  // Timer
  TimeDiff,

  // Util
  AttachInput, AttachOutput, Configuration, GetConfigurationPayload,

  // Middleware
  LambdaEvent, Handler, Identity, IamIdentity,

  // Exceptions
  ExceptionOptions, AppExceptionParams
} from 'ly-nodejs-ts-common';
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run build` | Compila TypeScript a JS con esbuild |
| `npm run package` | Crea el paquete para Lambda Layer |
| `npm run deploy` | Despliega a AWS (perfil por defecto) |
| `npm run deploy:dev` | Despliega a AWS (perfil devGreipCompany) |
| `npm run clean` | Limpia `dist` y `nodejs` |
