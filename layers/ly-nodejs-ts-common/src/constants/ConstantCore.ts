export const APPLICATION_NAME = 'GREIP-BACKEND';

export const SECRET = 'Greip/Postgres';

export const FORMATS = {
  FECHA: 'DD/MM/YYYY',
  FECHA_HORA: 'DD/MM/YYYY h:mm:ss',
  FECHA_HORAPM: 'DD/MM/YYYY h:mm:ss A',
}

export const TypeError = {
  VENCIMIENTO_TIEMPO_CONFIRMACION: 'E01',
  ERROR_EN_LECTURA_DE_ARCHIVO: 'E02',
  ERROR_EN_CARGA_DE_ARCHIVO: 'E03',
  ERROR_EN_DESCARGA_DE_RESPUESTA: 'E04',
  OTROS_ERRORES: 'E05',
  CAMPO_NULO: 'E06',
  ERROR_AL_CREAR_ARCHIVO: 'E07',
  ERROR_SFTP: 'E08',
  EXITO: 'E00',
  ERROR_FILE_EMPTY: 'E10',
  ERROR_NO_ENCRYPT: 'E11',
  ERROR_NO_LOCAL_DATA: 'E12'
}

export const HTTP = {
  OK_STATUS: { code: 200, description: 'OK' },
  CREATED_STATUS: { code: 201, description: 'CREATED' },
  NO_CONTENT_STATUS: { code: 204, description: 'NO CONTENT' },
  VALIDATION_RULES: { code: 220, description: 'Validation Rule' },
  BAD_REQUEST_STATUS: { code: 400, description: 'BAD REQUEST' },
  UNAUTHORIZED_STATUS: { code: 401, description: 'UNAUTHORIZED' },
  FORBIDDEN_STATUS: { code: 403, description: 'FORBIDDEN' },
  NOT_FOUND_STATUS: { code: 404, description: 'NOT FOUND' },
  UNPROCESSABLE_ENTITY_STATUS: { code: 422, description: 'UNPROCESSABLE ENTITY' },
  INTERNAL_SERVER_ERROR_STATUS: { code: 500, description: 'INTERNAL SERVER ERROR' },
  BAD_GATEWAY_STATUS: { code: 502, description: 'BAD GATEWAY' },
  GATEWAY_TIMEOUT_STATUS: { code: 504, description: 'GATEWAY TIMEOUT' },
  ERROR_PERSISTENCE: { code: 520, description: 'Persistence Error' },
  ERROR_SERVICE: { code: 530, description: 'Service Error' },
  ERROR_HANDLER: { code: 540, description: 'Handler Error' },
  HTTP_CLIENT_EXCEPTION: { code: 550, description: 'Error invoke http client' }
};

export const HTTP_METHODS = {
  GET: 'get',
  DELETE: 'delete',
  HEAD: 'head',
  OPTIONS: 'options',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  PURGE: 'purge',
  LINK: 'link',
  UNLINK: 'unlink'
}

export const ENCODER = {
  BINARY: 'binary',
  BASE64: 'base64',
  UTF8: 'utf8',
  HEXADECIMAL: 'HEX',
  ASCII: 'ascii',
  UTF16LE: 'utf16le',
  UCS2: 'ucs2',
  LATIN1: 'latin1'
};

export const AppConstant = {
  REQUEST_LMB_CONSUMER: 'LMB',
  REQUEST_AWS_CONSUMER: 'AWS',
  TRACE_START_MESSAGE: 'TRACE START:',
  TRACE_END_MESSAGE: 'TRACE END:',
  DB_ERROR: { code: 'ERROR-0001', message: 'Persistent Layer' },
  SERVICE_ERROR: { code: 'ERROR-0050', message: 'Service Layer' },
  SERVICE_WARNING: { code: '200', message: 'Validation Rules' },
  REQUEST_BODY_ERROR: { code: 'ERROR-0002', message: 'Request Structure Body Error' },
  VALIDATION_ERROR: { code: 'ERROR-0003', description: 'Data Validation Error' },
  REQUEST_HANDLER_ERROR: { code: 'ERROR-0004', description: 'Request Handler Error' },
  UNHANDLED_ERROR: { code: 'ERROR-0005', description: 'Unhandled Error' },
  SEND_EMAIL_ERROR: { code: 'ERROR-0006', description: 'Send Email Error' },
  INTERNAL_ERROR: { code: 'ERROR-0007', description: 'Internal Error' },
  IDENTITY_NOT_FOUND: { code: 'ERROR-0008', description: 'Identity Not Found' },
  ID_CLIENT_NOT_FOUND: { code: 'ERROR-0009', description: 'Id Client Not Found' },
  USER_SESSION_NOT_FOUND: { code: 'ERROR-0010', description: 'User Session Not Found' },
  USER_SESSION_EXPIRED: { code: 'ERROR-0011', description: 'User Session Expired' },
  DUPLICATED_SESSION_ERROR: { code: 'ERROR-0012', description: 'Duplicated Session Error' },
  REQUEST_LAMBDA_ERROR: { code: 'ERROR-0013', description: 'Request Lambda Error' },
  TIMER_DATES_VALIDATION: { code: 'ERROR-0014', description: 'Start Date and End Date must have value' },
  DB_TIMEOUT_ERROR: { code: 'ERROR-0015', message: 'Database Timeout Error' },
};

export const LOGGING_LEVEL = 'DEBUG';

export const STAGE = {
  DEV: 'DEV',
  QA: 'QA',
  TEST: 'TEST',
  PROD: 'PROD'
}

export const NOTIFICATION_TYPES = {
  SMS: 'SMS',
  EMAIL_SES: 'SES',
  EMAIL_NODEMAILER: 'EMAIL'
}

export const NOTIFICATION_TEMPLATES = {
  SES: 'SES',
  SNS: 'SNS'
}

export const NOTIFICATION_DEFAULT = {
  COUNTRY_CODE: '+51',
  BCC: 'admin@greip.com.pe',
  NAME: 'GREIP COMPANY',
  FROM_TITLE: 'GREIP-COMPANY-NOTIFICATIONS',
  FROM: 'admin@greip.com.pe'
}

export const TIMEZONE = 'America/Lima';

export const DYNAMODB_ACTIONS = {
  GET: 'get',
  PUT: 'put'
}

export const CODIGO_TELEFONO_PAIS = {
  PERU: '+51'
}

export const CANALES = [
  'Web',
  'Portal',
  'App',
  'AppWeb',
  'AppMovil',
  'Chatbot',
  'Whatsapp'
]

export const CRYPTO_LEVEL = {
  SOFT: 'SOFT',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
};

export const AWS_EVENTS = {
  API_GATEWAY_REST: 'API_GATEWAY_REST_EVENT',
  API_GATEWAY_SOCKET: 'API_GATEWAY_SOCKET_EVENT',
  API_GATEWAY_HTTP: 'API_GATEWAY_HTTP_EVENT',
  LAMBDA: 'LAMBDA_EVENT',
  S3: 'S3_EVENT',
}

export const EXCEPTIONS = {
  REQUEST_STRUCTURE_EXCEPTION: { code: 'ECORE-0001', message: 'Request Structure Exception' },
  VALIDATION_EXCEPTION: { code: 'ECORE-0002', message: 'Validation Exception' },
  REQUEST_HANDLER_EXCEPTION: { code: 'ECORE-0003', message: 'Request Handler Exception' },
  UNHANDLED_EXCEPTION: { code: 'ECORE-0004', message: 'Unhandled Exception' },
  IDENTITY_NOT_FOUND_EXCEPTION: { code: 'ECORE-0005', message: 'Identity Not Found' },
  ID_CLIENT_NOT_FOUND_EXCEPTION: { code: 'ECORE-0006', message: 'Id Client Not Found' },
  NOT_FOUND_SESSION_EXCEPTION: { code: 'ECORE-0007', message: 'User Session Not Found' },
  EXPIRED_SESSION_EXCEPTION: { code: 'ECORE-0008', message: 'User Session Expired' },
  DUPLICATED_SESSION_EXCEPTION: { code: 'ECORE-0009', message: 'Duplicated User Session Exception' },
  AUTHENTICATION_EXCEPTION: { code: 'ECORE-0010', message: 'Authentication Exception' },
  AUTHORIZATION_EXCEPTION: { code: 'ECORE-0011', message: 'Authorization Exception' },
}

export const MESSAGES_SUCCESS = {
  // Operaciones CRUD
  CREATE_SUCCESS: 'Registro creado exitosamente',
  UPDATE_SUCCESS: 'Registro actualizado exitosamente',
  DELETE_SUCCESS: 'Registro eliminado exitosamente',
  READ_SUCCESS: 'Registro(s) obtenido(s) exitosamente',

  // Operaciones específicas
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Cierre de sesión exitoso',
  UPLOAD_SUCCESS: 'Archivo subido exitosamente',
  DOWNLOAD_SUCCESS: 'Archivo descargado exitosamente',
  IMPORT_SUCCESS: 'Importación completada exitosamente',
  EXPORT_SUCCESS: 'Exportación completada exitosamente',
  READ_FILE_SUCCESS: 'Archivo encontrado exitosamente',

  // Operaciones transaccionales
  TRANSACTION_SUCCESS: 'Transacción completada exitosamente',
  PAYMENT_SUCCESS: 'Pago procesado exitosamente',
  ORDER_SUCCESS: 'Pedido procesado exitosamente',

  // Operaciones de validación
  VALIDATION_SUCCESS: 'Validación exitosa',
  VERIFICATION_SUCCESS: 'Verificación completada exitosamente',

  // Mensajes genéricos
  OPERATION_SUCCESS: 'Operación completada exitosamente',
  SAVE_SUCCESS: 'Cambios guardados exitosamente',
  PROCESS_SUCCESS: 'Proceso completado exitosamente',
}

export const MESSAGES_ERROR = {
  // Errores de base de datos/CRUD
  CREATE_ERROR: 'Error al crear el registro',
  UPDATE_ERROR: 'Error al actualizar el registro',
  DELETE_ERROR: 'Error al eliminar el registro',
  READ_ERROR: 'Error al obtener el(los) registro(s)',
  NOT_FOUND: 'Registro no encontrado',
  DUPLICATE_ENTRY: 'Registro duplicado',

  // Errores de validación
  VALIDATION_ERROR: 'Error de validación',
  REQUIRED_FIELD: 'Campo obligatorio',
  INVALID_FORMAT: 'Formato inválido',
  INVALID_EMAIL: 'Correo electrónico inválido',
  INVALID_PASSWORD: 'Contraseña inválida',
  PASSWORD_MISMATCH: 'Las contraseñas no coinciden',
  MIN_LENGTH: 'Debe tener al menos {min} caracteres',
  MAX_LENGTH: 'No debe exceder los {max} caracteres',
  BAD_REQUEST: 'Solicitud incorrecta',

  // Errores de autenticación/autorización
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'Acceso prohibido',
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  SESSION_EXPIRED: 'Sesión expirada',
  TOKEN_EXPIRED: 'Token expirado',
  TOKEN_INVALID: 'Token inválido',

  // Errores de servidor
  SERVER_ERROR: 'Error interno del servidor',
  DATABASE_ERROR: 'Error de base de datos',
  NETWORK_ERROR: 'Error de conexión',
  TIMEOUT_ERROR: 'Tiempo de espera agotado',

  // Errores de archivos
  FILE_TOO_LARGE: 'Archivo demasiado grande',
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido',
  UPLOAD_ERROR: 'Error al subir el archivo',
  DOWNLOAD_ERROR: 'Error al descargar el archivo',
  READ_FILE_ERROR: 'Archivo no encontrado',

  // Errores transaccionales
  TRANSACTION_ERROR: 'Error en la transacción',
  PAYMENT_ERROR: 'Error al procesar el pago',
  PAYMENT_DECLINED: 'Pago rechazado',
  INSUFFICIENT_FUNDS: 'Fondos insuficientes',
  ORDER_ERROR: 'Error al procesar el pedido',

  // Errores de negocio
  BUSINESS_RULE_VIOLATION: 'Violación de regla de negocio',
  CONSTRAINT_VIOLATION: 'Violación de restricción',
  RESOURCE_BUSY: 'Recurso en uso',
  OPERATION_NOT_ALLOWED: 'Operación no permitida',

  // Errores genéricos
  UNEXPECTED_ERROR: 'Error inesperado',
  OPERATION_FAILED: 'Operación fallida',
  RETRY_OPERATION: 'Por favor, intente nuevamente',
}

export const MESSAGES_INFO = {
  LOADING: 'Cargando...',
  PROCESSING: 'Procesando...',
  SAVING: 'Guardando...',
  UPLOADING: 'Subiendo...',
  DOWNLOADING: 'Descargando...',
  SEARCHING: 'Buscando...',
  VALIDATING: 'Validando...',
  WAITING: 'Por favor espere...',

  // Mensajes informativos
  NO_DATA: 'No hay datos disponibles',
  NO_RESULTS: 'No se encontraron resultados',
  SELECT_ITEM: 'Seleccione un elemento',
  CONFIRM_ACTION: 'Confirme la acción',
  UNSAVED_CHANGES: 'Tiene cambios sin guardar',
}

export const MESSAGES_WARNING = {
  CONFIRM_DELETE: '¿Está seguro de eliminar este registro?',
  CONFIRM_LOGOUT: '¿Está seguro de cerrar sesión?',
  UNSAVED_DATA: 'Tiene datos sin guardar. ¿Desea continuar?',
  DATA_LOSS: 'Los cambios no guardados se perderán',
  DUPLICATE_DATA: 'Posible duplicado detectado',
  LIMIT_REACHED: 'Límite alcanzado',
  EXPIRING_SOON: 'Próximo a expirar',
  ATTENTION_REQUIRED: 'Atención requerida',
}

export const MESSAGES_OPERATION = {
  // Estados de operación
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  FAILED: 'Fallido',

  // Tipos de operación
  INSERT: 'Inserción',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
  QUERY: 'Consulta',
  TRANSACTION: 'Transacción',
  IMPORT: 'Importación',
  EXPORT: 'Exportación',
  SYNC: 'Sincronización',
  BACKUP: 'Respaldo',
  RESTORE: 'Restauración',
}

export const MESSAGES_CONFIRMATION = {
  DELETE_TITLE: 'Confirmar Eliminación',
  DELETE_MESSAGE: '¿Está seguro de que desea eliminar este elemento? Esta acción no se puede deshacer.',

  LOGOUT_TITLE: 'Confirmar Cierre de Sesión',
  LOGOUT_MESSAGE: '¿Está seguro de que desea cerrar sesión?',

  CANCEL_TITLE: 'Confirmar Cancelación',
  CANCEL_MESSAGE: '¿Está seguro de que desea cancelar? Los cambios no guardados se perderán.',

  RESET_TITLE: 'Confirmar Restablecimiento',
  RESET_MESSAGE: '¿Está seguro de que desea restablecer los datos?',

  SUBMIT_TITLE: 'Confirmar Envío',
  SUBMIT_MESSAGE: '¿Está seguro de que desea enviar esta información?',
}

// Constantes para mensajes de validación de campos
export const MESSAGES_VALIDATION = {
  REQUIRED: 'Este campo es obligatorio',
  EMAIL: 'Ingrese un correo electrónico válido',
  MIN_LENGTH: 'Mínimo {min} caracteres',
  MAX_LENGTH: 'Máximo {max} caracteres',
  PATTERN: 'Formato inválido',
  MIN_VALUE: 'Valor mínimo: {min}',
  MAX_VALUE: 'Valor máximo: {max}',
  MATCH_PASSWORD: 'Las contraseñas deben coincidir',
  UNIQUE: 'Este valor ya existe',
  INVALID_DATE: 'Fecha inválida',
  FUTURE_DATE: 'La fecha debe ser futura',
  PAST_DATE: 'La fecha debe ser pasada',
} 