import { z } from 'zod';

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
