import { z } from 'zod';

import { RegimeTributario } from '../entities/Empresa';

export const realizarOnboardingSchema = z.object({
  empresa: z.object({
    razaoSocial: z.string().trim().min(1),
    nomeFantasia: z.string().trim().min(1).optional(),
    cnpj: z
      .string()
      .transform((cnpj) => cnpj.replace(/\D/g, ''))
      .refine((cnpj) => cnpj.length === 14),
    inscricaoMunicipal: z.string().trim().min(1).optional(),
    regimeTributario: z.enum(RegimeTributario),
    cidade: z.string().trim().min(1),
    uf: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  }),
  proprietario: z.object({
    nome: z.string().trim().min(1),
    email: z.string().trim().toLowerCase().email(),
    senha: z
      .string()
      .min(8)
      .refine((senha) => senha.trim().length > 0),
  }),
});
