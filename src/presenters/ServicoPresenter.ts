import { Servico } from '../entities/Servico';

export class ServicoPresenter {
  static paraHttp(servico: Servico) {
    return {
      id: servico.id,
      empresaId: servico.empresaId,
      descricao: servico.descricao,
      codigoServico: servico.codigoServico,
      codigoTributacaoMunicipal: servico.codigoTributacaoMunicipal,
      aliquotaIss: servico.aliquotaIss,
      valorPadrao: servico.valorPadrao,
      ativo: servico.ativo,
      createdAt: servico.createdAt,
      updatedAt: servico.updatedAt,
    };
  }
}
