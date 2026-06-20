import { z } from 'zod';

import { AmbienteFiscal } from '../entities/NotaServico';

const camposEditaveisCliente = {
  nomeRazaoSocial: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email().optional(),
  telefone: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().trim().min(1),
  uf: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  inscricaoMunicipal: z.string().optional(),
  codigoMunicipioIbge: z.string().regex(/^\d{7}$/).optional(),
};

export const cadastrarClienteSchema = z.object({
  ...camposEditaveisCliente,
  cpfCnpj: z
    .string()
    .transform((documento) => documento.replace(/\D/g, ''))
    .refine((documento) => documento.length === 11 || documento.length === 14),
});

export const atualizarClienteSchema = z.object(camposEditaveisCliente);

export const clienteParamsSchema = z.object({
  clienteId: z.string().trim().min(1),
});

export const alterarStatusClienteSchema = z.object({
  ativo: z.boolean(),
});

export const listarXmlsNfseClientePeriodoQuerySchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  ambienteFiscal: z.enum(AmbienteFiscal).optional(),
  nsuInicial: z.coerce.number().int().min(0).optional(),
  limiteConsultas: z.coerce.number().int().min(1).max(500).optional(),
});
