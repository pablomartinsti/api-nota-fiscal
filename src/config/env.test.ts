import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { carregarEnv } from './env';

const envBase = {
  DATABASE_URL: 'postgresql://usuario:senha@localhost:5432/banco',
  JWT_SECRET: randomBytes(32).toString('base64'),
  PORT: '3333',
  CORS_ORIGIN: 'https://app.exemplo.com.br',
  NODE_ENV: 'production',
  NFSE_CERTIFICADO_CRYPTO_KEY: randomBytes(32).toString('base64'),
  NFSE_SEFIN_ENVIO_DPS_PATH: '/nfse',
  NFSE_SEFIN_TIMEOUT_MS: '15000',
  NFSE_PERMITIR_PRODUCAO_REAL: 'false',
};

describe('carregarEnv', () => {
  it('deve carregar configuracao segura de producao', () => {
    const env = carregarEnv(envBase);

    expect(env.NODE_ENV).toBe('production');
    expect(env.NFSE_PERMITIR_PRODUCAO_REAL).toBe(false);
    expect(env.CORS_ORIGIN).toBe('https://app.exemplo.com.br');
  });

  it('deve bloquear configuracao insegura em producao', () => {
    expect(() =>
      carregarEnv({
        ...envBase,
        JWT_SECRET: 'minha_chave_secreta',
        CORS_ORIGIN: '*',
        NFSE_CERTIFICADO_CRYPTO_KEY: '',
      }),
    ).toThrow(
      'Variaveis de ambiente invalidas: JWT_SECRET, CORS_ORIGIN, NFSE_CERTIFICADO_CRYPTO_KEY.',
    );
  });

  it('deve exigir configuracao fiscal minima quando producao real estiver habilitada', () => {
    expect(() =>
      carregarEnv({
        ...envBase,
        NFSE_PERMITIR_PRODUCAO_REAL: 'true',
        NFSE_SEFIN_PRODUCAO_BASE_URL:
          'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
      }),
    ).toThrow(
      'Variaveis de ambiente invalidas: NFSE_SEFIN_PRODUCAO_BASE_URL, NFSE_XSD_DPS_PATH, NFSE_XSD_EVENTO_PATH.',
    );
  });

  it('deve aceitar producao real com URL nao restrita e XSDs configurados', () => {
    const env = carregarEnv({
      ...envBase,
      NFSE_PERMITIR_PRODUCAO_REAL: 'true',
      NFSE_SEFIN_HOMOLOGACAO_BASE_URL:
        'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
      NFSE_SEFIN_PRODUCAO_BASE_URL:
        'https://sefin.nfse.gov.br/SefinNacional',
      NFSE_XSD_DPS_PATH: 'C:/nfse/DPS_v1.01.xsd',
      NFSE_XSD_EVENTO_PATH: 'C:/nfse/pedRegEvento_v1.01.xsd',
    });

    expect(env.NFSE_PERMITIR_PRODUCAO_REAL).toBe(true);
  });
});
