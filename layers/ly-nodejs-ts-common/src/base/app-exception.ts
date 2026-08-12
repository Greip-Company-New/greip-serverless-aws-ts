import { AppExceptionParams } from '../models/base/app-exception.interface.js';
import Logger from './logger.js'


export default class AppException extends Error {
    private appException: AppExceptionParams = {} as AppExceptionParams;

    constructor(params: AppExceptionParams) {
        super();

        this.appException = params;

        if (params.exception)
            Logger.error(params.exception);
    }

    throw(condition?: Function | undefined | boolean): void{
        let appException = this.appException;

        if (condition === undefined) 
            throw appException;

        if (condition instanceof Function && condition())
            throw appException;

        if (condition)
            throw appException;
    }

    toString() {
        return JSON.stringify(this.appException);
    }
}