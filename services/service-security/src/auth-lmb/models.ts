// Modelos de entrada/salida de auth-lmb.

export interface LoginRequest {
  email?: string;
  documentType?: string;
  documentNumber?: string;
  password: string;
  channel?: string;
}

export interface VerifyMfaRequest {
  mfaToken: string;
  challengeId: string;
  code: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
  logoutAll?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RequestRecoveryRequest {
  email: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}
