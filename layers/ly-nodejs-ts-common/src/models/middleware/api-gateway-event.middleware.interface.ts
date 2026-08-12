export interface LambdaEvent {
  origin?: string;
  action?: string;
  body?: any;
  query?: Record<string, any>;
  path?: Record<string, any>;
  headers?: Record<string, any>;
  identity?: Identity | IamIdentity;
  isOffline?: boolean;
}

export interface Handler {
  event: LambdaEvent;
  context: any;
  response: any;
  error?: any;
}

export interface IamIdentity {
  userArn?: string;
}

export interface Identity {
  cognitoAuthenticationProvider: string;
}

export interface HandlerEvent {
  origin: string;
  action?: string;
  payload?: unknown;
  [key: string]: any;
}


