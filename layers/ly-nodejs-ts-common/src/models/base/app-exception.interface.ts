import { AppParams } from './app-core.interface.js';

export interface AppExceptionParams extends AppParams {
    httpStatus: number;
    details: any[];
    requestId: string;
}