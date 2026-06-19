import { z } from 'zod';

import {
  CodigoMotivoSubstituicaoNfse,
  TipoRetencaoIssqn,
  TributacaoIssqn,
} from '../entities/NotaServico';

const camposRascunhoNotaServico = {
  clienteId: z.string().trim().min(1),
  servicoId: z.string().trim().min(1),
  valorServico: z.number().finite().positive(),
  descricao: z.string().trim().min(1),
  serieDps: z.string().regex(/^\d{1,5}$/).optional(),
  numeroDps: z.string().regex(/^[1-9]\d{0,14}$/).optional(),
  dataCompetencia: z.coerce.date().optional(),
  codigoMunicipioPrestacao: z.string().regex(/^\d{7}$/).optional(),
  tributacaoIssqn: z.enum(TributacaoIssqn).optional(),
  tipoRetencaoIssqn: z.enum(TipoRetencaoIssqn).optional(),
  informacoesComplementares: z.string().max(2000).optional(),
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

export const emitirNotaServicoSchema = z.object({
  simularFalha: z.boolean().optional(),
});

export const cancelarNfseNotaServicoSchema = z.object({
  codigoMotivo: z.enum(['1', '2', '9']),
  motivo: z.string().trim().min(15).max(255),
});

export const reconciliarEnvioDpsNotaServicoSchema = z.object({
  chaveAcesso: z
    .string()
    .trim()
    .regex(/^\d{50}$/)
    .optional(),
});

export const substituirNfseNotaServicoSchema = z.object({
  ...camposRascunhoNotaServico,
  codigoMotivoSubstituicao: z.enum(CodigoMotivoSubstituicaoNfse),
  motivoSubstituicao: z.string().trim().min(15).max(255),
});
