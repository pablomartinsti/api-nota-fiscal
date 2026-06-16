import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().trim().min(1),
  JWT_SECRET: z.string().trim().min(1),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3333),
  CORS_ORIGIN: z.string().trim().min(1).default('*'),
  NFSE_CERTIFICADO_PATH: z.string().trim().min(1).optional(),
  NFSE_CERTIFICADO_SENHA: z.string().optional(),
  NFSE_XSD_DPS_PATH: z.string().trim().min(1).optional(),
});

const resultado = envSchema.safeParse(process.env);

if (!resultado.success) {
  const camposInvalidos = resultado.error.issues
    .map((issue) => issue.path.join('.') || 'ambiente')
    .join(', ');

  throw new Error(`Variaveis de ambiente invalidas: ${camposInvalidos}.`);
}

export const env = resultado.data;
