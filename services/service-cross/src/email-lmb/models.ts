export interface EmailRequest {
  to: string[];
  subject?: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string[];
}
