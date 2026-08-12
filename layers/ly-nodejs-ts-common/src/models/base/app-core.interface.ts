import Exception from '../../base/exception.js';

export interface AppParams {
    code: string | number;
    messages: Array<string>;
    exception: Exception | any;
}