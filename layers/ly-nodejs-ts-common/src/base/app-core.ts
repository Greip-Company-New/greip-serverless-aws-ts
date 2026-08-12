import Exception from './exception.js';
import { ExceptionOptions } from '../models/base/exception.interface.js'
import { AppParams } from '../models/base/app-core.interface.js';

export default class AppCore {
    static throwException(params: AppParams): never {
        if (params.exception && params.exception instanceof Exception) 
            throw params.exception;

        if (params.exception && params.exception instanceof Error){
            params.messages.push(params.exception.message);

            let exceptionOptions: ExceptionOptions = {
                code: params.code,
                messages: params.messages,
                error: params.exception
            }

            throw new Exception(exceptionOptions);
        }

        let exceptionOptions: ExceptionOptions = {
            code: params.code,
            messages: params.messages
        };

        throw new Exception(exceptionOptions);
    }
}