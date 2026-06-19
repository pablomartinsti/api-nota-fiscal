import { describe, expect, it } from 'vitest';

import { sanitizarLog } from './sanitizar-log';

describe('sanitizarLog', () => {
  it('deve mascarar campos sensiveis em objetos aninhados', () => {
    const resultado = sanitizarLog({
      authorization: 'Bearer token-real',
      usuario: {
        senha: 'senha-real',
        certificadoA1Senha: 'senha-certificado',
        certificadoA1Path: 'C:/certificado.pfx',
      },
      fiscal: {
        xmlAutorizado: '<xml>sensivel</xml>',
        chaveAcesso: '12345678901234567890123456789012345678901234567890',
      },
    });

    expect(resultado).toEqual({
      authorization: '[REDACTED]',
      usuario: {
        senha: '[REDACTED]',
        certificadoA1Senha: '[REDACTED]',
        certificadoA1Path: '[REDACTED]',
      },
      fiscal: {
        xmlAutorizado: '[REDACTED]',
        chaveAcesso: '12345678901234567890123456789012345678901234567890',
      },
    });
  });

  it('deve limitar strings muito longas', () => {
    const resultado = sanitizarLog({
      mensagem: 'a'.repeat(600),
    }) as { mensagem: string };

    expect(resultado.mensagem).toHaveLength(503);
    expect(resultado.mensagem.endsWith('...')).toBe(true);
  });
});
