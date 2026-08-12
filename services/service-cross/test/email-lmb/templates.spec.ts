import {
  renderOtpEmail,
  renderEmailVerificationEmail,
  renderPasswordRecoveryEmail,
  renderWelcomeEmail
} from '../../src/email-lmb/templates';

describe('Plantillas de email', () => {
  const base = { nombre: 'Juan', email: 'juan@greip.com.pe' };

  test('renderOtpEmail incluye el codigo y el tiempo de validez', () => {
    const html = renderOtpEmail({ ...base, codigo: '483920', expiraMin: 5, motivo: 'confirmar tu operacion' });
    expect(html).toContain('483920');
    expect(html).toContain('5 minutos');
    expect(html).toContain('confirmar tu operacion');
    expect(html).toContain('GREIP COMPANY');
  });

  test('renderOtpEmail usa expiraMin por defecto de 5 minutos', () => {
    const html = renderOtpEmail({ ...base, codigo: '123456' });
    expect(html).toContain('5 minutos');
  });

  test('renderEmailVerificationEmail incluye el enlace de confirmacion', () => {
    const enlace = 'https://greip.com.pe/confirmar?token=abc123';
    const html = renderEmailVerificationEmail({ ...base, enlace });
    expect(html).toContain('Confirmar correo electronico');
    expect(html).toContain(enlace);
    expect(html).toContain('24 horas');
  });

  test('renderPasswordRecoveryEmail incluye el enlace de restablecimiento', () => {
    const enlace = 'https://greip.com.pe/reestablecer?token=xyz789';
    const html = renderPasswordRecoveryEmail({ ...base, enlace, expiraMin: 10 });
    expect(html).toContain('Restablece tu contrasena');
    expect(html).toContain(enlace);
    expect(html).toContain('10 minutos');
  });

  test('renderPasswordRecoveryEmail puede incluir codigo OTP', () => {
    const html = renderPasswordRecoveryEmail({ ...base, enlace: 'https://x.pe', codigo: '876543' });
    expect(html).toContain('876543');
  });

  test('renderWelcomeEmail saluda al usuario y sugiere cambio de contrasena', () => {
    const html = renderWelcomeEmail({ ...base, enlaceLogin: 'https://app.greip.com.pe/login' });
    expect(html).toContain('Bienvenido a GREIP COMPANY');
    expect(html).toContain('juan@greip.com.pe');
    expect(html).toContain('cambiar tu contrasena');
    expect(html).toContain('Ingresar a la plataforma');
  });

  test('todas las plantillas usan la paleta de marca', () => {
    const otp = renderOtpEmail({ codigo: '111111' });
    const verify = renderEmailVerificationEmail({ enlace: 'https://x.pe' });
    const recovery = renderPasswordRecoveryEmail({ enlace: 'https://x.pe' });
    const welcome = renderWelcomeEmail({});
    [otp, verify, recovery, welcome].forEach((html) => {
      expect(html).toContain('#FC5658');
      expect(html).toContain('#FDEBE5');
    });
  });
});
