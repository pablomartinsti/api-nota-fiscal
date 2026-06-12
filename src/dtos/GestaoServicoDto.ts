import { z } from 'zod';

const camposEditaveisServico = {
  descricao: z.string().trim().min(1),
  codigoServico: z.string().trim().min(1),
  codigoTributacaoMunicipal: z.string().optional(),
  aliquotaIss: z.number().finite().min(0).max(100),
  valorPadrao: z.number().finite().positive().optional(),
};

export const cadastrarServicoSchema = z.object(camposEditaveisServico);

export const atualizarServicoSchema = z.object(camposEditaveisServico);

export const servicoParamsSchema = z.object({
  servicoId: z.string().trim().min(1),
});

export const alterarStatusServicoSchema = z.object({
  ativo: z.boolean(),
});
