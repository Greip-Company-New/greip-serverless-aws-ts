/**
 * Respuesta estándar de las Apis
 */
export interface EncryptedApiResponse {
  /** Indica si la operación fue exitosa */
  success: boolean;
  /** Mensaje descriptivo de la ejecución de al api*/
  message: string;
  /** Datos de la respuesta encriptados con AES256 */
  data: string;
  /** Detalles del error si success es false */
  error?: any;
  /** Código de estado HTTP */
  statusCode: number;
  /** ID de la petición para rastreo */
  requestId?: string;
  /** Timestamp de la respuesta a que hora fue ejecutada la api*/
  timestamp?: string;
}


