export interface EncryptTokenRequest {
  data: any;
}

export interface DecryptTokenRequest {
  encrypted: string;
}

export interface TokenCryptoConfig {
  algorithm: string;
  key: string;
  iv: string;
}

export interface TokenCryptoResult {
  encrypted?: string;
  decrypted?: any;
  algorithm: string;
}