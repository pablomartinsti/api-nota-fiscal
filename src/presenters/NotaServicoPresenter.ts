import { NotaServico } from '../entities/NotaServico';

export class NotaServicoPresenter {
  static paraHttp(nota: NotaServico) {
    return {
      id: nota.id,
      empresaId: nota.empresaId,
      usuarioId: nota.usuarioId,
      clienteId: nota.clienteId,
      servicoId: nota.servicoId,
      numeroNfse: nota.numeroNfse,
      codigoVerificacao: nota.codigoVerificacao,
      protocoloEmissao: nota.protocoloEmissao,
      chaveAcesso: nota.chaveAcesso,
      xmlAutorizado: nota.xmlAutorizado,
      dataAutorizacao: nota.dataAutorizacao,
      mensagemErroFiscal: nota.mensagemErroFiscal,
      ambienteFiscal: nota.ambienteFiscal,
      serieDps: nota.serieDps,
      numeroDps: nota.numeroDps,
      dataCompetencia: nota.dataCompetencia,
      codigoMunicipioPrestacao: nota.codigoMunicipioPrestacao,
      tributacaoIssqn: nota.tributacaoIssqn,
      tipoRetencaoIssqn: nota.tipoRetencaoIssqn,
      informacoesComplementares: nota.informacoesComplementares,
      valorServico: nota.valorServico,
      valorIss: nota.valorIss,
      aliquotaIss: nota.aliquotaIss,
      descricao: nota.descricao,
      status: nota.status,
      dataEmissao: nota.dataEmissao,
      linkPdf: nota.linkPdf,
      xmlUrl: nota.xmlUrl,
      mensagemErro: nota.mensagemErro,
      createdAt: nota.createdAt,
      updatedAt: nota.updatedAt,
    };
  }
}
