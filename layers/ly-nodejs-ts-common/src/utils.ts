// Utilidades compartidas

export class CacheManager {
  private cache: Map<string, { value: any; expiry: number }>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key: string, value: any, ttl: number = 300000): void {
    // Limpiar caché si excede el tamaño máximo
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    
    // Eliminar elementos expirados
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }

    // Si aún excede el tamaño, eliminar los más antiguos
    if (this.cache.size > this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].expiry - b[1].expiry);
      
      const toDelete = entries.slice(0, this.cache.size - this.maxSize);
      for (const [key] of toDelete) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

export class Logger {
  private serviceName: string;
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(serviceName: string, logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.serviceName = serviceName;
    this.logLevel = logLevel;
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      service: this.serviceName,
      level,
      message,
      ...meta
    };
    return JSON.stringify(logEntry);
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      const meta = error ? { 
        error: error.message, 
        stack: error.stack,
        ...(error.code && { code: error.code }),
        ...(error.name && { name: error.name })
      } : undefined;
      console.error(this.formatMessage('error', message, meta));
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
  backoff: number = 2
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        break;
      }
      
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      await sleep(waitTime);
    }
  }
  
  throw lastError || new Error('Retry failed without error');
}

export function validateRequiredParams(params: Record<string, any>, required: string[]): void {
  const missing = required.filter(key => params[key] === undefined || params[key] === null);
  
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`);
  }
}

export function maskSensitiveData(data: any, fields: string[] = ['password', 'token', 'secret', 'key']): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const masked = { ...data };
  
  for (const field of fields) {
    if (masked[field]) {
      masked[field] = '***MASKED***';
    }
  }

  return masked;
}

// Funciones helper para streams (para S3)
export async function streamToBuffer(stream: any): Promise<Buffer> {
  if (!stream) {
    return Buffer.from('');
  }
  
  // Si ya es un Buffer o Uint8Array, convertirlo directamente
  if (stream instanceof Uint8Array) {
    return Buffer.from(stream);
  }
  
  if (Buffer.isBuffer(stream)) {
    return stream;
  }
  
  // Si es un ReadableStream (Web Streams API)
  if (typeof stream.getReader === 'function') {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    
    return Buffer.concat(chunks);
  }
  
  // Si es un Node.js Readable stream
  if (typeof stream.on === 'function' && typeof stream.read === 'function') {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
  
  throw new Error('Unsupported stream type');
}

export async function streamToString(stream: any, encoding: BufferEncoding = 'utf-8'): Promise<string> {
  const buffer = await streamToBuffer(stream);
  return buffer.toString(encoding);
}

// Función para validar respuestas AWS
export function validateAWSResponse(response: any, requiredFields: string[] = []): void {
  if (!response) {
    throw new Error('AWS response is null or undefined');
  }
  
  if (response.$metadata && response.$metadata.httpStatusCode !== undefined) {
    if (response.$metadata.httpStatusCode >= 400) {
      throw new Error(`AWS request failed with status: ${response.$metadata.httpStatusCode}`);
    }
  }
  
  for (const field of requiredFields) {
    if (response[field] === undefined) {
      throw new Error(`Missing required field in AWS response: ${field}`);
    }
  }
}

// Función para crear delay exponencial
export function exponentialDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  const jitter = delay * 0.1 * Math.random(); // 10% de jitter
  return delay + jitter;
}

// Función para timeout de promesas
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ]);
}