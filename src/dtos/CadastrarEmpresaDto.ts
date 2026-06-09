import { z } from 'zod';

import { RegimeTributario } from '../entities/Empresa';

export const cadastrarEmpresaSchema = z.object({
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
});

export type CadastrarEmpresaDto = z.infer<typeof cadastrarEmpresaSchema>;
