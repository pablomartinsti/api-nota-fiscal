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
    email: z.string().trim().toLowerCase().email().optional(),
    telefone: z.string().optional(),
    cep: z
      .string()
      .transform((cep) => cep.replace(/\D/g, ''))
      .refine((cep) => cep.length === 8)
      .optional(),
    endereco: z.string().optional(),
    numero: z.string().optional(),
    bairro: z.string().optional(),
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
