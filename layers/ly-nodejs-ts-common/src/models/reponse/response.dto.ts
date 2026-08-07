// src/shared/response/response.ts
import moment from 'moment-timezone';

export type ApiResponse<T = any, E = any> = {
    success: boolean;
    message: string;
    data?: T;
    error?: E;
    statusCode: number;
    timestamp: string;
    path?: string;
    requestId?: string;
    metadata?: Record<string, any>;
};

export class Response<T = any, E = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: E;
    statusCode: number;
    timestamp: string;
    path?: string;
    requestId?: string;
    metadata?: Record<string, any>;

    constructor(init?: Partial<Response<T, E>>) {
        this.success = init?.success ?? false;
        this.message = init?.message ?? '';
        this.data = init?.data;
        this.error = init?.error;
        this.statusCode = init?.statusCode ?? 500;
        this.timestamp = init?.timestamp ?? Response.getDominicanTime();
        this.path = init?.path;
        this.requestId = init?.requestId;
        this.metadata = init?.metadata;
    }

    // Método estático para obtener hora RD con moment
    static getDominicanTime(): string {
        return moment()
            .tz('America/Santo_Domingo')
            .format();

        // Alternativas de formato:
        // .toISOString(true)          // "2024-01-15T14:30:45.123-04:00"
        // .format('YYYY-MM-DDTHH:mm:ss.SSSZ')  // Igual que arriba
        // .format()                   // Formato ISO completo
    }

    // Método para obtener hora legible
    static getDominicanTimeReadable(): string {
        return moment()
            .tz('America/Santo_Domingo')
            .format('dddd, D [de] MMMM [de] YYYY, h:mm:ss A');
    }


    // Métodos de instancia
    setPath(path: string): this {
        this.path = path;
        return this;
    }

    setRequestId(requestId: string): this {
        this.requestId = requestId;
        return this;
    }

    addMetadata(key: string, value: any): this {
        if (!this.metadata) {
            this.metadata = {};
        }
        this.metadata[key] = value;
        return this;
    }

    toJSON(): ApiResponse<T, E> {
        return {
            success: this.success,
            message: this.message,
            data: this.data,
            error: this.error,
            statusCode: this.statusCode,
            timestamp: this.timestamp,
            path: this.path,
            requestId: this.requestId,
            metadata: this.metadata,
        };
    }
}