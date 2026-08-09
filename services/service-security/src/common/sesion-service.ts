// Emision y administracion de sesiones: access token (JWT) + refresh token (rotativo).
import crypto from 'crypto';
import { UsuarioRepository, mapPublicUser } from './repositories/dynamodb/usuario';
import { SesionRepository } from './repositories/dynamodb/sesion';
import { RbacRepository } from './repositories/postgres/rbac';
import { firmarToken, verificarToken } from './token';
import { sha256Hex } from './password';
import {
  ACCESS_TOKEN_TTL_MIN,
  REFRESH_TOKEN_TTL_DAYS,
  TOKEN_TYPE_ACCESS,
  TOKEN_TYPE_REFRESH
} from './constants';
import { UsuarioDynamo, ResultadoTokens, Identidad } from './models';

export class SesionService {
  private usuarioRepo: UsuarioRepository;
  private sesionRepo: SesionRepository;
  private rbac: RbacRepository;

  constructor() {
    this.usuarioRepo = new UsuarioRepository();
    this.sesionRepo = new SesionRepository();
    this.rbac = new RbacRepository();
  }

  private async resolveTenant(tenantCode: string): Promise<{ id?: number; name?: string }> {
    const tenant = await this.rbac.getTenant(tenantCode);
    return { id: tenant?.id, name: tenant?.name };
  }

  /**
   * Genera el par access/refresh, crea la sesion en DynamoDB y devuelve los tokens.
   */
  async startSession(usuario: UsuarioDynamo, extras?: { permissions?: string[]; roles?: string[]; userAgent?: string; ip?: string; channel?: string }): Promise<ResultadoTokens> {
    const { id: tenantId, name: tenantName } = await this.resolveTenant(usuario.tenant);
    const identidad: Identidad = {
      sub: usuario.userId,
      tenant: usuario.tenant,
      tenantId,
      channel: extras?.channel,
      type: TOKEN_TYPE_ACCESS,
      permissions: extras?.permissions,
      roles: extras?.roles
    };

    const accessToken = await firmarToken(identidad, ACCESS_TOKEN_TTL_MIN);
    const refreshToken = await this.generateRefreshToken(usuario.userId, usuario.tenant);

    await this.sesionRepo.create(usuario.tenant, usuario.userId, sha256Hex(refreshToken), extras?.userAgent, extras?.ip, usuario.userId);

    return {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + ACCESS_TOKEN_TTL_MIN * 60 * 1000,
      user: mapPublicUser(usuario, tenantId, tenantName)
    };
  }

  private async generateRefreshToken(userId: string, tenant: string): Promise<string> {
    const identidad: Identidad = {
      sub: userId,
      tenant,
      type: TOKEN_TYPE_REFRESH,
      jti: crypto.randomUUID()
    };
    return await firmarToken(identidad, REFRESH_TOKEN_TTL_DAYS * 24 * 60);
  }

  /**
   * Valida el refresh token y emite un nuevo par (rotacion de sesion).
   */
  async refreshSession(refreshToken: string, userAgent?: string, ip?: string, channel?: string): Promise<ResultadoTokens> {
    const identidad = await verificarToken(refreshToken);
    if (identidad.type !== TOKEN_TYPE_REFRESH) {
      throw new Error('Token invalido para renovacion');
    }

    const hash = sha256Hex(refreshToken);
    const sesion = await this.sesionRepo.get(identidad.tenant, identidad.sub, hash);
    if (!sesion) {
      throw new Error('Sesion invalida o revocada');
    }

    const usuario = await this.usuarioRepo.getById(identidad.sub);
    if (!usuario || usuario.status !== 'A') {
      throw new Error('Usuario inactivo o no encontrado');
    }

    await this.sesionRepo.delete(identidad.tenant, identidad.sub, hash);

    const nuevoRefresh = await this.generateRefreshToken(usuario.userId, usuario.tenant);
    await this.sesionRepo.create(usuario.tenant, usuario.userId, sha256Hex(nuevoRefresh), userAgent || sesion.userAgent, ip || sesion.ip, usuario.userId);

    const { id: tenantId, name: tenantName } = await this.resolveTenant(usuario.tenant);
    const accessToken = await firmarToken(
      { sub: usuario.userId, tenant: usuario.tenant, tenantId, channel: channel || identidad.channel, type: TOKEN_TYPE_ACCESS },
      ACCESS_TOKEN_TTL_MIN
    );

    return {
      accessToken,
      refreshToken: nuevoRefresh,
      expiresAt: Date.now() + ACCESS_TOKEN_TTL_MIN * 60 * 1000,
      user: mapPublicUser(usuario, tenantId, tenantName)
    };
  }

  /**
   * Cierra la sesion. Si `all` es true, revoca todas las sesiones del usuario.
   */
  async closeSession(refreshToken: string, all: boolean): Promise<void> {
    const identidad = await verificarToken(refreshToken);
    const hash = sha256Hex(refreshToken);
    if (all) {
      await this.sesionRepo.deleteAll(identidad.tenant, identidad.sub);
    } else {
      await this.sesionRepo.delete(identidad.tenant, identidad.sub, hash);
    }
  }
}
