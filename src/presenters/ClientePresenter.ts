import { Cliente } from '../entities/Cliente';

export class ClientePresenter {
  static paraHttp(cliente: Cliente) {
    return {
      id: cliente.id,
      empresaId: cliente.empresaId,
      nomeRazaoSocial: cliente.nomeRazaoSocial,
      cpfCnpj: cliente.cpfCnpj,
      email: cliente.email,
      telefone: cliente.telefone,
      cep: cliente.cep,
      endereco: cliente.endereco,
      numero: cliente.numero,
      bairro: cliente.bairro,
      cidade: cliente.cidade,
      uf: cliente.uf,
      inscricaoMunicipal: cliente.inscricaoMunicipal,
      ativo: cliente.ativo,
      createdAt: cliente.createdAt,
      updatedAt: cliente.updatedAt,
    };
  }
}
