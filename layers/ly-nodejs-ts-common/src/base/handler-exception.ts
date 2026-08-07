import { AppExceptionParams } from '../models/base/app-exception.interface.js';
import AppException from './app-exception.js';

export default class HandlerException extends AppException {
    constructor(param: AppExceptionParams){
        super(param);
        this.name = 'HandlerException';
    }
}