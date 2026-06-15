import { Empresa } from '../entities/Empresa';

export class EmpresaPresenter {
  static paraResumoHttp(empresa: Empresa) {
    return {
      id: empresa.id,
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia,
      cnpj: empresa.cnpj,
      inscricaoMunicipal: empresa.inscricaoMunicipal,
      regimeTributario: empresa.regimeTributario,
      regimeEspecialTributacao: empresa.regimeEspecialTributacao,
      regimeApuracaoSimplesNacional: empresa.regimeApuracaoSimplesNacional,
      codigoMunicipioIbge: empresa.codigoMunicipioIbge,
      email: empresa.email,
      telefone: empresa.telefone,
      cep: empresa.cep,
      endereco: empresa.endereco,
      numero: empresa.numero,
      bairro: empresa.bairro,
      cidade: empresa.cidade,
      uf: empresa.uf,
      ativo: empresa.ativo,
    };
  }

  static paraHttp(empresa: Empresa) {
    return {
      ...EmpresaPresenter.paraResumoHttp(empresa),
      createdAt: empresa.createdAt,
      updatedAt: empresa.updatedAt,
    };
  }
}
