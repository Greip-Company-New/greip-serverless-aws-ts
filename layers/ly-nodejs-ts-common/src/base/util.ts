import { HTTP, TIMEZONE } from '../constants/ConstantCore.js';
import { AppExceptionParams } from '../models/base/app-exception.interface.js';
import { AttachInput, AttachOutput, Configuration, GetConfigurationPayload } from '../models/base/util.interface.js';
import AppException from './app-exception.js';
import Timer from './timer.js';
import { JSONPath } from 'jsonpath-plus';
import { render } from 'velocityjs';
import * as emailValdator from 'email-validator';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';


/**
 * Renombra una clave en un objeto
 * @param obj Objeto donde se renombrará la clave
 * @param oldKey Clave actual
 * @param newKey Nueva clave
 */
export function renameJsonKey<T extends Record<string, any>>(obj: T, oldKey: keyof T, newKey: string): void {
    if (oldKey in obj) {
        (obj as any)[newKey] = obj[oldKey];

        delete obj[oldKey];
    }
}

/**
 * Valida que un valor (o un valor dentro de un JSONPath) sea string.
 * Lanza AppException si la validación falla.
 *
 * @param value Valor a validar (puede ser objeto si se usa jsonPath)
 * @param jsonPath Ruta JSONPath opcional para validar dentro del objeto
 */
export function validate(value: null | boolean | number | string | object | any[], jsonPath?: string): void {
  let timer = new Timer();
  timer.start();

  const exception = new AppException({
    code: HTTP.ERROR_SERVICE.code,
    messages: ['Validation Error Object']
  } as AppExceptionParams);

  if (jsonPath) {
    JSONPath({
      json: value,
      path: jsonPath,
      wrap: false,
      resultType: 'all',
      callback(data) {
        const isString = typeof data.parent[data.parentProperty] === 'string';
        if (!isString) {
          exception.throw(); // Lanza la excepción
        }
      }
    });

    return;
  }

  const isString = typeof value === 'string';

  if (!isString) {
    exception.throw();
  }
}

/**
 * Convierte una cadena en formato capitalizado (primera letra de cada palabra en mayúscula).
 * @param str Cadena a capitalizar
 * @returns Cadena capitalizada o cadena vacía si es null/undefined
 */
export function capitalize(str: string): string {
  if (!str) {
    return '';
  }

  const words = str.toLowerCase().split(' ');

  const capitalized = words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return capitalized;
}

/**
 * Formatea un monto con 2 decimales y separador de miles por regex (sin símbolo de moneda).
 * Ej.: 1234567.8 => "1,234,567.80"
 * @param amount Número a formatear.
 */
export function formatToCurrency(amount: number): string {
  return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

/**
 * Devuelve la fecha en formato "D de <mes> del YYYY".
 * @param dia Día del mes (1–31).
 * @param mes Índice del mes 1-12.
 * @param year Año (YYYY).
 */
export function formatFechaDescriptiva(day: number, month: number, year: number): string {
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];

  return `${day} de ${meses[month - 1]} de ${year}`;
}

/**
 * Reemplaza variables en una plantilla Velocity.
 * @param html Plantilla Velocity (string).
 * @param variables Objeto con las variables a inyectar.
 * @returns HTML renderizado o el original si no hay variables.
 */
export function replaceVariables(html: string, variables: Record<string, any>): string | Error {
  try {
    if (html && Object.keys(variables).length > 0) {
      return render(html, variables);
    }
    return html;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Obtiene un objeto adjunto listo para enviar (por ejemplo, en nodemailer).
 * @param attach Objeto con información del adjunto.
 * @returns Objeto con propiedades según el tipo.
 */
export async function getObjectAttach(attach?: AttachInput): Promise<AttachOutput>{
  const returnAttach: AttachOutput = {};

  try {
    if (attach && attach.content) {
      returnAttach.filename = attach.filename;

      switch (attach.type) {
        case 'buffer':
          returnAttach.content = attach.content as Buffer;
          break;

        case 'url':
          returnAttach.path = attach.content as string;
          break;

        // case 'bucket':
        //   if (!attach.keybucket) {
        //     throw new Error('keybucket es requerido para tipo bucket');
        //   }
        //   returnAttach.content = await getFileStreamFromS3(attach.content as string, attach.keybucket);
        //   break;

        case 'base64':
          if ((attach.content as string).includes(attach.type)) {
            returnAttach.path = attach.content as string;
          } else {
            returnAttach.content = attach.content as string;
            returnAttach.encoding = attach.type;
          }
          break;

        default: // 'text'
          returnAttach.content = attach.content as string;
          returnAttach.contentType = 'text/plain';
      }
    }
  } catch (error) {
    console.error(`Error en getObjectAttach:`, error);
    throw error;
  }

  return returnAttach;
}

/**
 * Procesa un array de adjuntos y devuelve un array listo para enviar (por ejemplo, en nodemailer).
 * @param attachments Lista de adjuntos.
 * @returns Array de objetos con propiedades según el tipo.
 */
export async function getDataAttachments(attachments: AttachInput[] = []): Promise<AttachOutput[]> {
  const attachOutputs: AttachOutput[] = [];


  for (const attach of attachments) {
    const returnAttach: AttachOutput = { filename: attach.filename };

    switch (attach.type) {
      case 'buffer':
        returnAttach.content = attach.content as Buffer;
        break;

      case 'url':
        returnAttach.path = attach.content as string;
        break;

      // case 'bucket':
      //   if (!attach.keybucket) {
      //     throw new Error(`keybucket es requerido para tipo bucket en adjunto ${attach.filename}`);
      //   }
      //   returnAttach.content = await getFileStreamFromS3(attach.content as string, attach.keybucket);
      //   break;

      case 'base64':
        if ((attach.content as string).includes(attach.type)) {
          returnAttach.path = attach.content as string;
        } else {
          returnAttach.content = attach.content as string;
          returnAttach.encoding = attach.type;
        }
        break;

      default: // 'text'
        returnAttach.content = attach.content as string;
        returnAttach.contentType = 'text/plain';
    }

    attachOutputs.push(returnAttach);
  }

  return attachOutputs;
}

/**
 * Elimina atributos vacíos (undefined, null, "") de un objeto de forma recursiva.
 * @param obj Objeto a limpiar.
 * @returns El mismo objeto sin atributos vacíos.
 */
export function removeAttrBlankFromObject<T extends Record<string, any>>(obj: T): T {
  try {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Llamada recursiva para objetos anidados
        removeAttrBlankFromObject(value);
      }

      if (value === undefined || value === null || value === '') {
        delete obj[key];
      }
    });
  } catch (error) {
    console.error(`Error en removeAttrBlankFromObject:`, error);
  }

  return obj;
}

export const phoneNumber = (number: string): boolean => /[9][0-9]{8}/.test(number) && !/[9]{9}/.test(number);

export const telephoneNumber = (number: string): boolean => /[0-9]{7}/.test(number);

export const _email = (email: string): boolean => /^\w+([\\.-]?\w+)*@\w+([\\.-]?\w+)*(\.\w{2,4})+$/.test(email) || /@/i.test(email);

export const email = (email: string) => emailValdator.validate(email);

export const number = (number: string): boolean => /[1-9][0-9]*/.test(number);

export const getDateNow = () => moment().tz(TIMEZONE);

export const getDateNowFormat = (format: string) => moment().tz(TIMEZONE).format(format);

export const getNewUuId = () => uuidv4();

/**
 * Obtiene un item de configuración por id.
 * Usa el helper `callSingleOperation('get', params)`.
 */
// export async function getConfiguration<T extends Configuration = Configuration>(payload: GetConfigurationPayload): Promise<T | null> {
//   const TableName = process.env.TBL_CONFIGURATION as string;
//   if (!TableName) 
//     throw new Error('TBL_CONFIGURATION no está definido en variables de entorno');

//   const id = payload?.id ?? process.env.ID_CONFIGURACION;
//   if (!id) 
//     throw new Error('ID de configuración no provisto y ID_CONFIGURACION no está definido');
  
//   const params = {
//     TableName,
//     Key: { id },
//   };

//   const response = await callSingleOperation('get', params);

//   return (response?.Item as T) ?? null;
// }

export const arrayToString = (array: string[], separator: string = ', '): string => {
  return array.join(separator);
}

export const concatArrays = <T>(array1: T[], array2: T[]): T[] => {
  return array1.concat(array2);
}

export const dateIsGreater = (firstDate: Date, secondDate: Date): boolean => {
  return firstDate.getTime() > secondDate.getTime();
}

export const dateIsGreaterOrEqual = (firstDate: Date, secondDate: Date): boolean => {
  return firstDate.getTime() >= secondDate.getTime();
}

export const dateIsLess = (firstDate: Date, secondDate: Date): boolean => {
  return firstDate.getTime() < secondDate.getTime();
}

export const dateIsLessOrEqual = (firstDate: Date, secondDate: Date): boolean => {
  return firstDate.getTime() <= secondDate.getTime();
}

export const dateDifferenceInHours = (startDate: Date, endDate: Date): number => {
  const oneHour = 1000 * 60 * 60;
  const diffInHours = Math.abs((endDate.getTime() - startDate.getTime()) / (oneHour));
  return diffInHours;
}

export const dateDifferenceInMonths = (startDate: Date, endDate: Date): number => {
  return endDate.getMonth() - startDate.getMonth() + (12 * (endDate.getFullYear() - startDate.getFullYear()));
}

export async function asyncForEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<void>): Promise<void> {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

export function paddingLeft(pad: string, value: string): string {
  if (pad && pad.length > value.length) {
    return (pad + value).slice(-pad.length);
  }
  return value;
}

export function paddingRight(pad: string, value: string): string {
  if (pad && pad.length > value.length) {
    return (value + pad).substring(0, pad.length);
  }
  return value;
}

export function mergeArraysOfStrings(array1: string[], array2: string[]): string[] {
  const set = new Set<string>([...array1, ...array2]);
  return Array.from(set);
}