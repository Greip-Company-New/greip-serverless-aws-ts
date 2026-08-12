import { MfaService } from '../../src/common/mfa-service';
import { sha256Hex } from '../../src/common/password';

jest.mock('../../src/common/repositories/dynamodb/mfa', () => {
  const mock = jest.fn();
  mock.prototype.createChallenge = jest.fn();
  mock.prototype.getActiveRecoveryChallenge = jest.fn();
  mock.prototype.deleteChallenge = jest.fn();
  mock.prototype.incrementAttempts = jest.fn();
  mock.prototype.challengeIdFromSk = jest.fn((sk: string) => sk.replace(/^CHALLENGE#/, ''));
  return { MfaRepository: mock };
});

jest.mock('ly-nodejs-ts-common', () => {
  const invokeLambda = jest.fn().mockResolvedValue({ payload: { payload: { success: true } } });
  return {
    LambdaService: jest.fn().mockImplementation(() => ({ invokeLambda }))
  };
});

import { LambdaService } from 'ly-nodejs-ts-common';

const usuario = {
  userId: 'u-1',
  tenant: 'GREIP',
  email: 'juan@greip.com.pe',
  phone: '+51999888777',
  status: 'A'
};

describe('MfaService - recuperacion de contrasena OTP', () => {
  let service: MfaService;
  let repo: any;
  let lambda: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MfaService();
    repo = (service as any).repo;
    lambda = (new (LambdaService as any)()).invokeLambda;
    repo.challengeIdFromSk.mockImplementation((sk: string) => sk.replace(/^CHALLENGE#/, ''));
  });

  it('crea desafio RECOVERY y envia el codigo de 6 digitos por email', async () => {
    repo.getActiveRecoveryChallenge.mockResolvedValue(null);

    const resultado = await service.createRecoveryChallenge(usuario as any, 'EMAIL');

    expect(repo.createChallenge).toHaveBeenCalledTimes(1);
    const [, , , type, channel, codeHash] = repo.createChallenge.mock.calls[0];
    expect(type).toBe('RECOVERY');
    expect(channel).toBe('EMAIL');
    expect(codeHash).toMatch(/^[a-f0-9]{64}$/);

    expect(lambda).toHaveBeenCalledTimes(1);
    const invocation = lambda.mock.calls[0][0];
    expect(invocation.payload.action).toBe('sendEmail');
    const cuerpo = invocation.payload.payload;
    expect(cuerpo.to).toEqual(['juan@greip.com.pe']);
    expect(cuerpo.template).toBe('passwordRecovery');
    const codigo = cuerpo.templateData.codigo;
    expect(codigo).toMatch(/^\d{6}$/);
    expect(sha256Hex(codigo)).toBe(codeHash);
    expect(resultado.channel).toBe('EMAIL');
    expect(resultado.maskedDestination).toContain('***@');
  });

  it('crea desafio RECOVERY y envia el codigo por SMS', async () => {
    repo.getActiveRecoveryChallenge.mockResolvedValue(null);

    const resultado = await service.createRecoveryChallenge(usuario as any, 'SMS');

    const [, , , type, channel] = repo.createChallenge.mock.calls[0];
    expect(type).toBe('RECOVERY');
    expect(channel).toBe('SMS');
    const invocation = lambda.mock.calls[0][0];
    expect(invocation.payload.action).toBe('sendSms');
    expect(invocation.payload.payload.phoneNumber).toBe('+51999888777');
    expect(resultado.channel).toBe('SMS');
  });

  it('reemplaza un desafio RECOVERY previo activo', async () => {
    repo.getActiveRecoveryChallenge.mockResolvedValue({ sk: 'CHALLENGE#anterior' });

    await service.createRecoveryChallenge(usuario as any, 'EMAIL');

    expect(repo.deleteChallenge).toHaveBeenCalledWith('GREIP', 'u-1', 'anterior');
  });

  it('verifica un codigo correcto y elimina el desafio', async () => {
    repo.getActiveRecoveryChallenge.mockResolvedValue({
      pk: 'TENANT#GREIP#USER#u-1',
      sk: 'CHALLENGE#c-1',
      codeHash: sha256Hex('48291370'),
      attempts: 0
    });

    const valido = await service.verifyRecoveryCode('GREIP', 'u-1', '48291370');

    expect(valido).toBe(true);
    expect(repo.deleteChallenge).toHaveBeenCalledWith('GREIP', 'u-1', 'c-1');
  });

  it('rechaza un codigo incorrecto, cuenta el intento y no elimina el desafio', async () => {
    repo.getActiveRecoveryChallenge.mockResolvedValue({
      sk: 'CHALLENGE#c-1',
      codeHash: sha256Hex('48291370'),
      attempts: 0
    });

    const valido = await service.verifyRecoveryCode('GREIP', 'u-1', '00000000');

    expect(valido).toBe(false);
    expect(repo.incrementAttempts).toHaveBeenCalledTimes(1);
    expect(repo.deleteChallenge).not.toHaveBeenCalled();
  });

  it('rechaza cuando no existe desafio activo', async () => {
    repo.getActiveRecoveryChallenge.mockResolvedValue(null);

    const valido = await service.verifyRecoveryCode('GREIP', 'u-1', '48291370');

    expect(valido).toBe(false);
  });

  it('rechaza canal de recuperacion invalido', async () => {
    await expect(service.createRecoveryChallenge(usuario as any, 'TOTP')).rejects.toThrow('Canal de recuperacion no valido');
  });
});
