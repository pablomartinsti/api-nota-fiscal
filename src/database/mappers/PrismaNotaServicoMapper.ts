import {
  AmbienteFiscal as PrismaAmbienteFiscal,
  NotaServico as PrismaNotaServico,
  StatusNota as PrismaStatusNota,
  TipoRetencaoIssqn as PrismaTipoRetencaoIssqn,
  TributacaoIssqn as PrismaTributacaoIssqn,
} from '@prisma/client';

import {
  AmbienteFiscal,
  NotaServico,
  StatusNota,
  TipoRetencaoIssqn,
  TributacaoIssqn,
} from '../../entities/NotaServico';

export class PrismaNotaServicoMapper {
  static paraDominio(registro: PrismaNotaServico): NotaServico {
    return new NotaServico({
      id: registro.id,
      empresaId: registro.empresaId,
      usuarioId: registro.usuarioId,
      clienteId: registro.clienteId,
      servicoId: registro.servicoId,
      numeroNfse: registro.numeroNfse ?? undefined,
      codigoVerificacao: registro.codigoVerificacao ?? undefined,
      protocoloEmissao: registro.protocoloEmissao ?? undefined,
      chaveAcesso: registro.chaveAcesso ?? undefined,
      xmlAutorizado: registro.xmlAutorizado ?? undefined,
      dataAutorizacao: registro.dataAutorizacao ?? undefined,
      mensagemErroFiscal: registro.mensagemErroFiscal ?? undefined,
      ambienteFiscal: registro.ambienteFiscal as AmbienteFiscal,
      serieDps: registro.serieDps ?? undefined,
      numeroDps: registro.numeroDps ?? undefined,
      dataCompetencia: registro.dataCompetencia ?? undefined,
      codigoMunicipioPrestacao:
        registro.codigoMunicipioPrestacao ?? undefined,
      tributacaoIssqn: registro.tributacaoIssqn as TributacaoIssqn,
      tipoRetencaoIssqn: registro.tipoRetencaoIssqn as TipoRetencaoIssqn,
      informacoesComplementares:
        registro.informacoesComplementares ?? undefined,
      valorServico: registro.valorServico.toNumber(),
      valorIss: registro.valorIss.toNumber(),
      aliquotaIss: registro.aliquotaIss.toNumber(),
      descricao: registro.descricao,
      status: registro.status as StatusNota,
      dataEmissao: registro.dataEmissao ?? undefined,
      linkPdf: registro.linkPdf ?? undefined,
      xmlUrl: registro.xmlUrl ?? undefined,
      mensagemErro: registro.mensagemErro ?? undefined,
      createdAt: registro.createdAt,
      updatedAt: registro.updatedAt,
    });
  }

  static paraPersistencia(nota: NotaServico) {
    return {
      empresaId: nota.empresaId,
      usuarioId: nota.usuarioId,
      clienteId: nota.clienteId,
      servicoId: nota.servicoId,
      numeroNfse: nota.numeroNfse ?? null,
      codigoVerificacao: nota.codigoVerificacao ?? null,
      protocoloEmissao: nota.protocoloEmissao ?? null,
      chaveAcesso: nota.chaveAcesso ?? null,
      xmlAutorizado: nota.xmlAutorizado ?? null,
      dataAutorizacao: nota.dataAutorizacao ?? null,
      mensagemErroFiscal: nota.mensagemErroFiscal ?? null,
      ambienteFiscal: nota.ambienteFiscal as PrismaAmbienteFiscal,
      serieDps: nota.serieDps ?? null,
      numeroDps: nota.numeroDps ?? null,
      dataCompetencia: nota.dataCompetencia ?? null,
      codigoMunicipioPrestacao: nota.codigoMunicipioPrestacao ?? null,
      tributacaoIssqn: nota.tributacaoIssqn as PrismaTributacaoIssqn,
      tipoRetencaoIssqn: nota.tipoRetencaoIssqn as PrismaTipoRetencaoIssqn,
      informacoesComplementares: nota.informacoesComplementares ?? null,
      valorServico: nota.valorServico,
      valorIss: nota.valorIss,
      aliquotaIss: nota.aliquotaIss,
      descricao: nota.descricao,
      status: nota.status as PrismaStatusNota,
      dataEmissao: nota.dataEmissao ?? null,
      linkPdf: nota.linkPdf ?? null,
      xmlUrl: nota.xmlUrl ?? null,
      mensagemErro: nota.mensagemErro ?? null,
    };
  }
}
