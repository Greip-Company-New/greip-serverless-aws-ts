import { AppExceptionParams } from '../models/base/app-exception.interface.js';
import Logger from './logger.js'

export default class ValidationException extends Error {
    private validationException: AppExceptionParams = {} as AppExceptionParams;

    constructor(params: AppExceptionParams) {
        super();

        this.validationException = params;
        
        if (params.exception)
            Logger.error(params.exception);

        this.name = "ValidationException";
    }

    throw(condition?: Function | undefined | boolean): void{
        let validationException = this.validationException;

        if (condition === undefined) 
            throw validationException;

        if (condition instanceof Function && condition())
            throw validationException;

        if (condition)
            throw validationException;
    }
}