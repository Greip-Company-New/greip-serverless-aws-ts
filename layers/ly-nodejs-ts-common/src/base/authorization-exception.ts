import { AppExceptionParams } from '../models/base/app-exception.interface.js';
import AppException from './app-exception.js';

export default class AuthorizationException extends AppException {
    constructor(param: AppExceptionParams){
        super(param);
        this.name = 'AuthorizationException';
    }
}