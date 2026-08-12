import  { ExceptionOptions } from '../models/base/exception.interface.js';

export default class Exception extends Error {
    public code?: string | number;
    public httpCode?: number;
    public messages: string[] = [];
    public error?: any;

    constructor({code, httpCode, messages = ['Error'], error = null }: ExceptionOptions) {
        super();

        this.name = "Exception"; 

        this.code = code;
        this.httpCode = httpCode;
        this.messages = Array.isArray(messages) ? messages : [messages];
        this.error = error;

        Error.captureStackTrace(this, this.constructor);
    }
}