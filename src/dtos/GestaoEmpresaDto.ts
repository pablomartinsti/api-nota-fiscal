import { z } from 'zod';

import {
  RegimeApuracaoSimplesNacional,
  RegimeEspecialTributacao,
  RegimeTributario,
} from '../entities/Empresa';

export const atualizarEmpresaSchema = z.object({
  razaoSocial: z.string().trim().min(1),
  nomeFantasia: z.string().trim().min(1).optional(),
  inscricaoMunicipal: z.string().trim().min(1).nullable().optional(),
  regimeTributario: z.enum(RegimeTributario),
  regimeEspecialTributacao: z
    .enum(RegimeEspecialTributacao)
    .default(RegimeEspecialTributacao.NENHUM),
  regimeApuracaoSimplesNacional: z
    .enum(RegimeApuracaoSimplesNacional)
    .optional(),
  codigoMunicipioIbge: z.string().regex(/^\d{7}$/).optional(),
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
});
