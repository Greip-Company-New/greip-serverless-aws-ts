import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import AppException from './app-exception.js';
import { HttpClientOptions, HttpMethod, SendParams, ThrowException } from '../models/base/http-client.interface.js';
import { HTTP_METHODS, HTTP } from '../constants/ConstantCore.js';
import { AppExceptionParams } from '../models/base/app-exception.interface.js';

export class HttpClient {
    private readonly _baseHeaders: Record<string, string>;
    private readonly _baseUrl?: string;

    /**
     * Constructor HttpClient
     * @param options baseUrl y baseHeaders
     */
    constructor({ baseHeaders = { 'Content-Type': 'application/json' }, baseUrl }: HttpClientOptions){
        this._baseHeaders = baseHeaders;
        this._baseUrl = baseUrl;
    }

  /**
   * Método general para llamar un servicio REST/SOAP
   *
   * @param params parámetros de la llamada
   * @param throwException forma opcional de manejar/lanzar excepciones
   * @returns AxiosResponse<T>
   */
    async send<T>(params: SendParams, throwException?: ThrowException): Promise<AxiosResponse<T>>{
        const {
            url,
            method = HTTP_METHODS.POST as HttpMethod,
            data = {},
            headers = { 'Content-Type': 'application/json' },
            config = { timeout: 30 * 1000 },
        } = params;

        const axiosParams: AxiosRequestConfig = {
            ...(config || {}),
            method: method as Method,
            url: this._baseUrl ? this._baseUrl.concat(url) : url,
            headers: { ...this._baseHeaders, ...headers },
        }

        const methods = HTTP_METHODS;

        if ([methods.POST, methods.PUT, methods.PATCH].includes(method))
            axiosParams.data = data;
        else if (method === methods.GET)
            axiosParams.params = data;

        let response: AxiosResponse<T> = {} as AxiosResponse<T>;

        try {
            response = await axios.request<T>(axiosParams);
        }catch (error: any){
            if (throwException && throwException instanceof Function) {
                throwException(error);
            } else if (throwException) {
                throw throwException;
            } else {
                new AppException({
                    code: HTTP.HTTP_CLIENT_EXCEPTION.code,
                    messages: [HTTP.HTTP_CLIENT_EXCEPTION.description],
                    exception: error
                } as AppExceptionParams).throw();
            }
        }

        return response;
    }

    /**
     * Method to call GET REST API or SOAP WS
     *
     * @param {string} url - http://restApi.com/accion
     * @param {Object} [data={}] - data to send as request
     * @param {Object} [headers={}] - extra config to call API
     * @param {Object} [config={ timeout: 30 * 1000 }] - extra config to call API
     */
    async get<T>({
      url,
      data = {},
      headers = { 'Content-Type': 'application/json' },
      config = { timeout: 30 * 1000 },
    }: Omit<SendParams, 'method'>, throwException?: ThrowException): Promise<AxiosResponse<T>> {

        const method = HTTP_METHODS.GET as HttpMethod;

        const axiosParams: SendParams = { url, method, headers, data, config };

        return this.send<T>(axiosParams, throwException);
    }

    /**
     * Method to call POST REST API or SOAP WS
     *
     * @param {string} url - http://restApi.com/accion
     * @param {Object} [data={}] - data to send as request
     * @param {Object} [headers={}] - extra config to call API
     * @param {Object} [config={ timeout: 30 * 1000 }] - extra config to call API
     */
    async post<T>({
      url,
      data = {},
      headers = { 'Content-Type': 'application/json' },
      config = { timeout: 30 * 1000 },
    }: Omit<SendParams, 'method'>, throwException?: ThrowException): Promise<AxiosResponse<T>> {

        const method = HTTP_METHODS.POST as HttpMethod;

        const axiosParams: SendParams = { url, method, headers, data, config };

        return this.send<T>(axiosParams, throwException);
    }

    /**
     * Method to call UPDATE REST API or SOAP WS
     *
     * @param {string} url - http://restApi.com/accion
     * @param {Object} [data={}] - data to send as request
     * @param {Object} [headers={}] - extra config to call API
     * @param {Object} [config={ timeout: 30 * 1000 }] - extra config to call API
     */
    async put<T>({
      url,
      data = {},
      headers = { 'Content-Type': 'application/json' },
      config = { timeout: 30 * 1000 },
    }: Omit<SendParams, 'method'>, throwException?: ThrowException): Promise<AxiosResponse<T>> {
        const method = HTTP_METHODS.PUT as HttpMethod;

        const axiosParams: SendParams = { url, method, headers, data, config };

        return this.send<T>(axiosParams, throwException);
    }

  /**
   * Method to call DELETE REST API or SOAP WS
   *
   * @param {string} url - http://restApi.com/accion
   * @param {Object} [body={}] - data to send as request
   * @param {Object} [headers={}] - extra config to call API
   * @param {Object} [config={ timeout: 30 * 1000 }] - extra config to call API
   */
  async delete<T>({
      url,
      data = {},
      headers = { 'Content-Type': 'application/json' },
      config = { timeout: 30 * 1000 },
    }: Omit<SendParams, 'method'>, throwException?: ThrowException): Promise<AxiosResponse<T>> {

        const method = HTTP_METHODS.DELETE as HttpMethod;

        const axiosParams: SendParams = { url, method, headers, data, config };

        return this.send<T>(axiosParams, throwException);
    }

  /**
   * Method to call PATCH REST API or SOAP WS
   *
   * @param {string} url - http://restApi.com/accion
   * @param {Object} [body={}] - data to send as request
   * @param {Object} [headers={}] - extra config to call API
   * @param {Object} [config={ timeout: 30 * 1000 }] - extra config to call API
   */
  async patch<T>({
      url,
      data = {},
      headers = { 'Content-Type': 'application/json' },
      config = { timeout: 30 * 1000 },
    }: Omit<SendParams, 'method'>, throwException?: ThrowException): Promise<AxiosResponse<T>> {

        const method = HTTP_METHODS.PATCH as HttpMethod;

        const axiosParams: SendParams = { url, method, headers, data, config };

        return this.send<T>(axiosParams, throwException);
    }
}