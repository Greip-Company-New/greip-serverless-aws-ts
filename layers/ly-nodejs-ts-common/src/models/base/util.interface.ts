import { Readable } from 'stream';

export type AttachType = 'buffer' | 'url' | 'bucket' | 'base64' | 'text';

export interface AttachInput {
  filename: string;
  type: AttachType;
  content: string | Buffer;
  keybucket?: string; // requerido si type === 'bucket'
}

export interface AttachOutput {
  filename?: string;
  content?: string | Buffer | Readable | NodeJS.ReadableStream;
  path?: string;
  encoding?: string;
  contentType?: string;
}

export interface Configuration {
  id: string;
  [key: string]: unknown;
}

export interface GetConfigurationPayload { id?: string; }