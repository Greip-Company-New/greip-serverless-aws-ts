import Service from '../../src/config-lmb/service';
import { ConfigTercerosRepository } from '../../src/common/repositories/config-terceros';
import { TercerosSecretsManager } from '../../src/common/terceros-secrets';
import { configVacia } from '../../src/common/models';

// Todas las instancias de las clases mock comparten los mismos jest.fn,
// de modo que el Service (que crea sus propias instancias internas) ve
// exactamente la configuracion que el test prepara.
jest.mock('../../src/common/repositories/config-terceros', () => {
  const state = {
    getConfig: jest.fn(),
    getConfigConDefecto: jest.fn(),
    saveConfig: jest.fn()
  };
  return { ConfigTercerosRepository: jest.fn(() => state) };
});

jest.mock('../../src/common/terceros-secrets', () => {
  const state = {
    getSecretos: jest.fn(),
    guardarSecretos: jest.fn()
  };
  return { TercerosSecretsManager: jest.fn(() => state) };
});

function repo() {
  return new ConfigTercerosRepository() as any;
}

function secrets() {
  return new TercerosSecretsManager() as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Service.getConfig', () => {
  test('devuelve config por defecto cuando no existe configuracion', async () => {
    repo().getConfigConDefecto.mockResolvedValue(configVacia('GREIP'));
    secrets().getSecretos.mockResolvedValue({});

    const result = await Service.getConfig('GREIP');

    expect(result.tenant).toBe('GREIP');
    expect(result.emailProvider).toBe('BREVO');
    expect(result.smsProvider).toBe('BREVO');
    expect(result.brevo.apiKey).toBe('');
    expect(result.twilio.accountSid).toBe('');
    expect(result.dub.apiKey).toBe('');
  });

  test('enmascara las credenciales de los secretos', async () => {
    repo().getConfigConDefecto.mockResolvedValue(configVacia('GREIP'));
    secrets().getSecretos.mockResolvedValue({
      brevo: { apiKey: 'xkeysib-1234567890abcdef' },
      twilio: { accountSid: 'AC1234567890', authToken: 'tok-abcdef', sendgridApiKey: 'SG.abc123' },
      dub: { apiKey: 'dub_1234567890abcdef', workspaceId: 'ws_1234567890', domain: 'greip.co' }
    });

    const result = await Service.getConfig('GREIP');

    expect(result.brevo.apiKey).not.toContain('7654');
    expect(result.brevo.apiKey).toContain('xkey');
    expect(result.twilio.accountSid).not.toContain('567890');
    expect(result.twilio.authToken).toContain('tok');
    expect(result.dub.apiKey).toContain('dub');
    expect(result.dub.apiKey).not.toContain('7890');
    expect(result.dub.apiKey).not.toContain('1234567890');
    expect(result.dub.domain).toBe('greip.co');
  });
});

describe('Service.setConfig', () => {
  test('guarda credenciales en Secrets Manager y metadatos en el repo', async () => {
    repo().getConfig.mockResolvedValue(null);
    repo().getConfigConDefecto.mockResolvedValue(configVacia('GREIP'));
    secrets().getSecretos.mockResolvedValue({});

    await Service.setConfig(
      'GREIP',
      {
        emailProvider: 'BREVO',
        smsProvider: 'TWILIO',
        brevo: { enabled: true, apiKey: 'xkeysib-nuevo', fromEmail: 'no-reply@greip.com.pe' },
        twilio: { enabled: true, accountSid: 'AC123', authToken: 'tok123', fromPhone: '+51999000111' }
      },
      'admin@greip.com.pe',
      'AppWeb'
    );

    expect(secrets().guardarSecretos).toHaveBeenCalledWith('GREIP', {
      brevo: { apiKey: 'xkeysib-nuevo' },
      twilio: { accountSid: 'AC123', authToken: 'tok123', sendgridApiKey: undefined },
      dub: { apiKey: undefined, workspaceId: undefined, domain: undefined }
    });

    const saved = repo().saveConfig.mock.calls[0][0];
    expect(saved.emailProvider).toBe('BREVO');
    expect(saved.smsProvider).toBe('TWILIO');
    expect(saved.updatedBy).toBe('admin@greip.com.pe');
    expect(saved.tenant).toBe('GREIP');
  });

  test('conserva credenciales previas cuando el cliente reenvia el valor enmascarado', async () => {
    repo().getConfig.mockResolvedValue(null);
    repo().getConfigConDefecto.mockResolvedValue(configVacia('GREIP'));
    secrets().getSecretos.mockResolvedValue({
      brevo: { apiKey: 'xkeysib-real' },
      dub: { apiKey: 'dub-api-real', workspaceId: 'ws-real' },
      twilio: {}
    });

    await Service.setConfig(
      'GREIP',
      {
        emailProvider: 'BREVO',
        smsProvider: 'BREVO',
        brevo: { apiKey: 'xke••••••eal' },
        dub: { apiKey: 'dub-api••••eal', workspaceId: 'ws-re••••eal' }
      },
      'admin@greip.com.pe'
    );

    expect(secrets().guardarSecretos).toHaveBeenCalledWith('GREIP', expect.objectContaining({
      brevo: { apiKey: 'xkeysib-real' },
      dub: { apiKey: 'dub-api-real', workspaceId: 'ws-real', domain: undefined }
    }));
  });

  test('no persiste secretos cuando no hay credenciales', async () => {
    repo().getConfig.mockResolvedValue(null);
    repo().getConfigConDefecto.mockResolvedValue(configVacia('GREIP'));
    secrets().getSecretos.mockResolvedValue({});

    await Service.setConfig(
      'GREIP',
      {
        emailProvider: 'BREVO',
        smsProvider: 'BREVO',
        brevo: { enabled: false, fromEmail: 'no-reply@greip.com.pe' }
      },
      'admin@greip.com.pe'
    );

    expect(secrets().guardarSecretos).not.toHaveBeenCalled();
    expect(repo().saveConfig).toHaveBeenCalledTimes(1);
  });
});