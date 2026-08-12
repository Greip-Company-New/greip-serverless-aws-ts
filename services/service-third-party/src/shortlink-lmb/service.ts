import { ResponseFactory, MESSAGES_SUCCESS } from 'ly-nodejs-ts-common';
import { acortarUrl } from '../common/dub';
import { extraerMensajeProveedor } from '../common/helpers';
import { ShortenUrlRequest } from './models';

export default class Service {

  static async shortenUrl(tenant: string, payload: ShortenUrlRequest): Promise<any> {
    try {
      const resultado = await acortarUrl(tenant, payload.url, { key: payload.key, domain: payload.domain });
      return ResponseFactory.success(resultado, MESSAGES_SUCCESS.PROCESS_SUCCESS);
    } catch (err: any) {
      console.error('shortenUrl >>> ', err?.exception?.response?.data || err?.response?.data || err?.message || err);
      const mensaje = extraerMensajeProveedor(err, 'Error al acortar la URL con Dub.co');
      return ResponseFactory.fromError(err, mensaje);
    }
  }

}