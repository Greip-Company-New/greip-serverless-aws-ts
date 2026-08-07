import { FORMATS, HTTP, TIMEZONE } from '../constants/ConstantCore.js';
import momentTZ from 'moment-timezone';
import { TimeDiff } from '../models/base/timer.interface.js';
import Exception from './exception.js';

export default class Timer {
    private _startDate?: number;
    private _endDate ?: number;

    constructor(startDate?: number){
        this._startDate = startDate;
    }

    start(): void {
        this._startDate = this._startDate || Date.now();
    }

    end(): void {
        this._endDate = Date.now();
    }

    reset(): void {
        this._startDate = undefined;
        this._endDate = undefined;
    }

    getTimeZone(zone: string = TIMEZONE): string {
        return momentTZ().tz(zone).format(FORMATS.FECHA_HORA);
    }

    getTime(): TimeDiff {
        if (!this._endDate || !this._startDate) {
            throw new Exception({
            code: HTTP.ERROR_SERVICE.code,
            httpCode: HTTP.ERROR_SERVICE.code,
            messages: HTTP.ERROR_SERVICE.description
            });
        }

        const timeDiff = Math.abs(this._endDate - this._startDate);
        const diffSeconds = (timeDiff / 1000) % 60;
        const diffMinutes = Math.floor(timeDiff / (60 * 1000)) % 60;
        const diffHours = Math.floor(timeDiff / (60 * 60 * 1000)) % 24; // corregido: %24 para horas del día

        return {
            hours: diffHours,
            minutes: diffMinutes,
            seconds: Number(diffSeconds.toFixed(3))
        };
    }
}