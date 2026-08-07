import LambdaEvent from './lambda-event.middleware.js';
import middy from '@middy/core';

let _middlewares: any[] = [];

export function addMiddleware(middleware: any): void {
  _middlewares.push(middleware);
}

export function bootstrap(controller: any): any {
    const handler = middy(async () => controller);

    _middlewares.forEach((obj) => {
    handler.use(obj);
    });

    handler.use(LambdaEvent());

    _middlewares = [];

    return handler;
}