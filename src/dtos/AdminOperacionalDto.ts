import { z } from 'zod';

import { AmbienteFiscal, StatusNota } from '../entities/NotaServico';
import {
  StatusEventoFiscalNotaServico,
  TipoEventoFiscalNotaServico,
} from '../entities/NotaServicoEventoFiscal';

const textoOpcional = z
  .string()
  .trim()
  .transform((valor) => valor || undefined)
  .optional();

const dataOpcional = z
  .string()
  .trim()
  .datetime({ offset: true })
  .or(z.string().trim().date())
  .transform((valor) => new Date(valor))
  .optional();

const limiteSchema = z.coerce.number().int().min(1).max(200).default(100);

export const listarNotasAdminQuerySchema = z.object({
  empresaId: textoOpcional,
  status: z.enum(StatusNota).optional(),
  ambienteFiscal: z.enum(AmbienteFiscal).optional(),
  busca: textoOpcional,
  criadoDe: dataOpcional,
  criadoAte: dataOpcional,
  limite: limiteSchema,
});

export const listarEventosFiscaisAdminQuerySchema = z.object({
  empresaId: textoOpcional,
  notaServicoId: textoOpcional,
  tipo: z.enum(TipoEventoFiscalNotaServico).optional(),
  status: z.enum(StatusEventoFiscalNotaServico).optional(),
  busca: textoOpcional,
  criadoDe: dataOpcional,
  criadoAte: dataOpcional,
  limite: limiteSchema,
});

export const atualizarEmissaoEmpresaAdminParamsSchema = z.object({
  empresaId: z.string().trim().uuid(),
});

export const atualizarEmissaoEmpresaAdminBodySchema = z.object({
  emissaoHabilitada: z.boolean(),
});

export const atualizarConfiguracaoFiscalEmpresaAdminParamsSchema = z.object({
  empresaId: z.string().trim().uuid(),
});

export const atualizarConfiguracaoFiscalEmpresaAdminBodySchema = z.object({
  ambienteFiscalPadrao: z.enum(AmbienteFiscal),
  serieDpsPadrao: z.string().trim().min(1).max(20),
  emissaoHabilitada: z.boolean().optional(),
});
