import { LOGGING_LEVEL, STAGE } from '../constants/ConstantCore.js';

export default class Logger {
    static debug(message: object | string | unknown) {
        if (['DEBUG'].includes(LOGGING_LEVEL) || !LOGGING_LEVEL || !STAGE.PROD) {
            if (typeof message !== 'object') 
                console.log(message);
            else{
                let msg = JSON.stringify(message);
                
                if (msg === '{}')
                    console.log(message);
                else
                    console.log(msg);
            }
        } 
    }

    static info(message: object | string | unknown) {
        if (['INFO', 'DEBUG'].includes(LOGGING_LEVEL) || !LOGGING_LEVEL) {
            if (typeof message !== 'object')
                console.log(message);
            else{
                let msg = JSON.stringify(message);
                
                if (msg === '{}')
                    console.log(message);
                else
                    console.log(msg);
            }
        }
    }

    static error(message: object | string | unknown) {
        if (['ERROR', 'INFO', 'DEBUG'].includes(LOGGING_LEVEL) || !LOGGING_LEVEL) {
            if (typeof message !== 'object')
                console.error(message);
            else{
                let msg = JSON.stringify(message);
                
                if (msg === '{}')
                    console.error(message);
                else
                    console.error(msg);
            }
        }
    }
}