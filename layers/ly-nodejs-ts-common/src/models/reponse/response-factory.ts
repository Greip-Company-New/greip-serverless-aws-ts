// src/shared/response/response-factory.ts

import { Response } from './response.dto.js';

export class ResponseFactory {
    // SUCCESS RESPONSES
    static success<T = any>(
        data: T,
        message: string = 'Success',
        statusCode: number = 200
    ): Response<T> {
        return new Response<T>({
            success: true,
            message,
            data,
            statusCode,
        });
    }

    // PAGINATED RESPONSE
    static paginated<T = any>(
        items: T[],
        total: number,
        page: number = 1,
        limit: number = 10,
        message: string = 'Success',
        statusCode: number = 200
    ): Response<T[]> {
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return new Response<T[]>({
            success: true,
            message,
            data: items,
            statusCode,
            metadata: {
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage,
                    hasPrevPage,
                },
            },
        });
    }

    // CREATED RESPONSE (201)
    static created<T = any>(
        data: T,
        message: string = 'Resource created successfully'
    ): Response<T> {
        return this.success(data, message, 201);
    }

    // UPDATED RESPONSE (200)
    static updated<T = any>(
        data: T,
        message: string = 'Resource updated successfully'
    ): Response<T> {
        return this.success(data, message, 200);
    }

    // DELETED RESPONSE (200)
    static deleted(message: string = 'Resource deleted successfully'): Response<null> {
        return this.success(null, message, 200);
    }

    // NO CONTENT RESPONSE (204 - pero adaptado)
    static noContent(message: string = 'No content'): Response<null> {
        return new Response<null>({
            success: true,
            message,
            data: null,
            statusCode: 204,
        });
    }

    // ERROR RESPONSES
    private static formatErrorDetails(error: any): any {
        if (error instanceof Error) {
            return {
                ...error,
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }
        return error;
    }

    static error<E = any>(
        message: string,
        statusCode: number = 500,
        error?: E,
        internalCode?: string
    ): Response<null, E> {
        const response = new Response<null, E>({
            success: false,
            message,
            error: this.formatErrorDetails(error),
            statusCode,
            data: null,
        });

        if (internalCode) {
            response.addMetadata('internalCode', internalCode);
        }

        return response;
    }

    // COMMON HTTP ERRORS
    static badRequest<E = any>(
        message: string = 'Bad Request',
        error?: E,
        internalCode?: string
    ): Response<null, E> {
        return this.error(message, 400, error, internalCode);
    }

    static unauthorized<E = any>(
        message: string = 'Unauthorized',
        error?: E,
        internalCode?: string
    ): Response<null, E> {
        return this.error(message, 401, error, internalCode);
    }

    static forbidden<E = any>(
        message: string = 'Forbidden',
        error?: E,
        internalCode?: string
    ): Response<null, E> {
        return this.error(message, 403, error, internalCode);
    }

    static notFound<E = any>(
        message: string = 'Resource not found',
        error?: E,
        internalCode?: string
    ): Response<null, E> {
        return this.error(message, 404, error, internalCode);
    }

    static conflict<E = any>(
        message: string = 'Conflict',
        error?: E,
        internalCode?: string
    ): Response<null, E> {
        return this.error(message, 409, error, internalCode);
    }

    static unprocessableEntity<E = any>(
        message: string = 'Unprocessable Entity',
        error?: E,
        internalCode?: string
    ): Response<null, E> {
        return this.error(message, 422, error, internalCode);
    }

    static internalServerError<E = any>(
        message: string = 'Internal Server Error',
        error?: E,
        internalCode?: string
    ): Response<null, E> {
        return this.error(message, 500, error, internalCode);
    }

    // VALIDATION ERROR RESPONSE
    static validationError(
        errors: Record<string, string[]> | string[],
        message: string = 'Validation failed'
    ): Response<null, any> {
        return this.error(message, 422, errors, 'VALIDATION_ERROR');
    }

    // CUSTOM RESPONSE BUILDER
    static custom<T = any, E = any>(
        success: boolean,
        message: string,
        statusCode: number,
        data?: T,
        error?: E
    ): Response<T, E> {
        return new Response<T, E>({
            success,
            message,
            data,
            error,
            statusCode,
        });
    }

    // FROM EXCEPTION/ERROR OBJECT
    private static readonly MENSAJES_POR_STATUS: Record<number, string> = {
        400: 'Solicitud incorrecta',
        401: 'No autorizado',
        403: 'Acceso prohibido',
        404: 'Recurso no encontrado',
        409: 'Conflicto',
        422: 'Error de validación',
        429: 'Demasiadas solicitudes',
        500: 'Error interno del servidor',
        502: 'Error de conexión',
        503: 'Servicio no disponible',
    };

    static fromError(error: any, overrideMessage?: string): Response<null, any> {
        if (error instanceof Response) {
            if (overrideMessage) {
                error.message = overrideMessage;
            }
            return error;
        }

        let statusCode = error.statusCode || error.status || 500;
        let message = overrideMessage || this.MENSAJES_POR_STATUS[statusCode] || 'Error interno del servidor';

        // Detect if the message is a stringified Response object (extract statusCode)
        try {
            if (typeof error.message === 'string' && error.message.trim().startsWith('{')) {
                const parsed = JSON.parse(error.message);
                if (parsed && typeof parsed.success === 'boolean') {
                    statusCode = parsed.statusCode || statusCode;
                    if (!overrideMessage) {
                        message = this.MENSAJES_POR_STATUS[statusCode] || message;
                    }
                }
            }
        } catch (e) {
            // Not a structured response
        }

        return new Response({
            success: false,
            message,
            statusCode,
            timestamp: new Date().toISOString(),
        });
    }


}