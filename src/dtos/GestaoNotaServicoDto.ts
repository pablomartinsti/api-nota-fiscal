import { z } from 'zod';

const camposRascunhoNotaServico = {
  clienteId: z.string().trim().min(1),
  servicoId: z.string().trim().min(1),
  valorServico: z.number().finite().positive(),
  descricao: z.string().trim().min(1),
};

export const cadastrarRascunhoNotaServicoSchema = z.object(
  camposRascunhoNotaServico,
);

export const atualizarRascunhoNotaServicoSchema = z.object(
  camposRascunhoNotaServico,
);

export const notaServicoParamsSchema = z.object({
  notaId: z.string().trim().min(1),
});
