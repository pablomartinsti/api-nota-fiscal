import { Servico } from '../entities/Servico';

export class ServicoPresenter {
  static paraHttp(servico: Servico) {
    return {
      id: servico.id,
      empresaId: servico.empresaId,
      descricao: servico.descricao,
      codigoServico: servico.codigoServico,
      codigoTributacaoNacional: servico.codigoTributacaoNacional,
      codigoTributacaoMunicipal: servico.codigoTributacaoMunicipal,
      codigoNbs: servico.codigoNbs,
      aliquotaIss: servico.aliquotaIss,
      ativo: servico.ativo,
      createdAt: servico.createdAt,
      updatedAt: servico.updatedAt,
    };
  }
}
