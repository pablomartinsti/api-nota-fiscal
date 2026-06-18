import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { ChaveCriptografiaAusenteError } from '../errors/ChaveCriptografiaAusenteError';
import { AesGcmCifradorTexto } from './AesGcmCifradorTexto';

describe('AesGcmCifradorTexto', () => {
  it('deve criptografar e descriptografar texto', () => {
    const chave = randomBytes(32).toString('base64');
    const cifrador = new AesGcmCifradorTexto(chave);

    const textoCriptografado = cifrador.criptografar('senha-do-certificado');

    expect(textoCriptografado).not.toBe('senha-do-certificado');
    expect(cifrador.estaCriptografado(textoCriptografado)).toBe(true);
    expect(cifrador.descriptografar(textoCriptografado)).toBe(
      'senha-do-certificado',
    );
  });

  it('deve rejeitar chave ausente ou invalida', () => {
    expect(() => new AesGcmCifradorTexto().criptografar('senha')).toThrow(
      ChaveCriptografiaAusenteError,
    );
    expect(() =>
      new AesGcmCifradorTexto('chave-invalida').criptografar('senha'),
    ).toThrow(ChaveCriptografiaAusenteError);
  });
});
