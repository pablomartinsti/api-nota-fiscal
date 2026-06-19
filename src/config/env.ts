import 'dotenv/config';

import { z } from 'zod';

const SEGREDOS_JWT_INSEGUROS = [
  'minha_chave_secreta',
  'substitua-por-uma-chave-secreta-forte',
  'substitua-por-uma-chave-secreta-forte-com-32-caracteres-ou-mais',
];

const stringOpcional = z.preprocess(
  (valor) => (valor === '' ? undefined : valor),
  z.string().trim().min(1).optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: z.string().trim().min(1),
    JWT_SECRET: z.string().trim().min(1),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3333),
    CORS_ORIGIN: z.string().trim().min(1).default('*'),
    NFSE_CERTIFICADO_PATH: stringOpcional,
    NFSE_CERTIFICADO_SENHA: z.preprocess(
      (valor) => (valor === '' ? undefined : valor),
      z.string().optional(),
    ),
    NFSE_CERTIFICADO_CRYPTO_KEY: stringOpcional,
    NFSE_XSD_DPS_PATH: stringOpcional,
    NFSE_XSD_EVENTO_PATH: stringOpcional,
    NFSE_SEFIN_BASE_URL: z.preprocess(
      (valor) => (valor === '' ? undefined : valor),
      z.string().trim().url().optional(),
    ),
    NFSE_SEFIN_HOMOLOGACAO_BASE_URL: z.preprocess(
      (valor) => (valor === '' ? undefined : valor),
      z.string().trim().url().optional(),
    ),
    NFSE_SEFIN_PRODUCAO_BASE_URL: z.preprocess(
      (valor) => (valor === '' ? undefined : valor),
      z.string().trim().url().optional(),
    ),
    NFSE_SEFIN_ENVIO_DPS_PATH: z.string().trim().min(1).default('/nfse'),
    NFSE_SEFIN_TIMEOUT_MS: z.coerce.number().int().min(1).default(15_000),
    NFSE_PERMITIR_PRODUCAO_REAL: z
      .enum(['true', 'false'])
      .default('false')
      .transform((valor) => valor === 'true'),
  })
  .superRefine((env, contexto) => {
    if (env.NODE_ENV === 'production') {
      validarProducaoSegura(env, contexto);
    }

    if (env.NFSE_PERMITIR_PRODUCAO_REAL) {
      validarProducaoRealNfse(env, contexto);
    }
  });

export function carregarEnv(origem: NodeJS.ProcessEnv = process.env) {
  const resultado = envSchema.safeParse(origem);

  if (!resultado.success) {
    const camposInvalidos = resultado.error.issues
      .map((issue) => issue.path.join('.') || 'ambiente')
      .join(', ');

    throw new Error(`Variaveis de ambiente invalidas: ${camposInvalidos}.`);
  }

  return resultado.data;
}

type EnvValidado = z.infer<typeof envSchema>;

function validarProducaoSegura(
  env: EnvValidado,
  contexto: z.RefinementCtx,
): void {
  if (env.JWT_SECRET.length < 32 || segredoJwtInseguro(env.JWT_SECRET)) {
    contexto.addIssue({
      code: 'custom',
      path: ['JWT_SECRET'],
      message: 'JWT_SECRET deve ser forte em producao.',
    });
  }

  if (corsPermiteQualquerOrigem(env.CORS_ORIGIN)) {
    contexto.addIssue({
      code: 'custom',
      path: ['CORS_ORIGIN'],
      message: 'CORS_ORIGIN nao pode ser * em producao.',
    });
  }

  if (!chaveCriptografiaValida(env.NFSE_CERTIFICADO_CRYPTO_KEY)) {
    contexto.addIssue({
      code: 'custom',
      path: ['NFSE_CERTIFICADO_CRYPTO_KEY'],
      message:
        'NFSE_CERTIFICADO_CRYPTO_KEY deve ser uma chave de 32 bytes em producao.',
    });
  }
}

function validarProducaoRealNfse(
  env: EnvValidado,
  contexto: z.RefinementCtx,
): void {
  if (!env.NFSE_SEFIN_PRODUCAO_BASE_URL) {
    contexto.addIssue({
      code: 'custom',
      path: ['NFSE_SEFIN_PRODUCAO_BASE_URL'],
      message:
        'NFSE_SEFIN_PRODUCAO_BASE_URL e obrigatoria para producao real.',
    });
  }

  if (
    env.NFSE_SEFIN_PRODUCAO_BASE_URL
      ?.toLowerCase()
      .includes('producaorestrita')
  ) {
    contexto.addIssue({
      code: 'custom',
      path: ['NFSE_SEFIN_PRODUCAO_BASE_URL'],
      message:
        'NFSE_SEFIN_PRODUCAO_BASE_URL nao pode apontar para producao restrita quando producao real estiver habilitada.',
    });
  }

  if (!env.NFSE_XSD_DPS_PATH) {
    contexto.addIssue({
      code: 'custom',
      path: ['NFSE_XSD_DPS_PATH'],
      message: 'NFSE_XSD_DPS_PATH e obrigatoria para producao real.',
    });
  }

  if (!env.NFSE_XSD_EVENTO_PATH) {
    contexto.addIssue({
      code: 'custom',
      path: ['NFSE_XSD_EVENTO_PATH'],
      message: 'NFSE_XSD_EVENTO_PATH e obrigatoria para producao real.',
    });
  }
}

function segredoJwtInseguro(segredo: string): boolean {
  const normalizado = segredo.trim().toLowerCase();

  return SEGREDOS_JWT_INSEGUROS.some((valor) => normalizado.includes(valor));
}

function corsPermiteQualquerOrigem(corsOrigin: string): boolean {
  return corsOrigin
    .split(',')
    .map((origem) => origem.trim())
    .includes('*');
}

function chaveCriptografiaValida(chave?: string): boolean {
  if (!chave) {
    return false;
  }

  const texto = chave.trim();
  const buffer = /^[a-f0-9]{64}$/i.test(texto)
    ? Buffer.from(texto, 'hex')
    : Buffer.from(texto, 'base64');

  return buffer.length === 32;
}

export const env = carregarEnv();
