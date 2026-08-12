import { AxiosRequestConfig } from 'axios';
import AppException from '../../base/app-exception.js';

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH';

export interface HttpClientOptions {
  baseUrl?: string;
  baseHeaders?: Record<string, string>;
}


/**
 * Parámetros de envío para el método principal `send`
 * - Usamos genéricos T para el tipo de respuesta (payload del servidor)
 * - `data` puede ser objeto, string, FormData, Buffer, etc.
 */
export interface SendParams {
  url: string;
  method?: HttpMethod;
  data?: any;
  headers?: Record<string, string>;
  config?: AxiosRequestConfig; // puedes pasar timeout, auth, etc.
}


/**
 * Tipo del callback/objeto de excepciones:
 * - una función que recibe el Error y lanza lo que necesites
 * - un Error/AppException ya construido que se lanzará
 * - o falsy (no lanzar excepción personalizada)
 */
export type ThrowException =
  | ((err: unknown) => never | void)
  | Error
  | AppException
  | undefined
  | null
  | false;