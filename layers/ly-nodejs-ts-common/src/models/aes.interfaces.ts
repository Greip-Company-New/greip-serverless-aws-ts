export interface CryptoResponseBase {
  code: number;
  message: string;
  algorithm: string;
  key: string | Buffer;
  iv: string | Buffer;
  text: string;
}
