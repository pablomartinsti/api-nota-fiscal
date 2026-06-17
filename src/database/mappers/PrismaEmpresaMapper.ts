import {
  Empresa as PrismaEmpresa,
  RegimeApuracaoSimplesNacional as PrismaRegimeApuracaoSimplesNacional,
  RegimeEspecialTributacao as PrismaRegimeEspecialTributacao,
  RegimeTributario as PrismaRegimeTributario,
} from '@prisma/client';

import {
  Empresa,
  RegimeApuracaoSimplesNacional,
  RegimeEspecialTributacao,
  RegimeTributario,
} from '../../entities/Empresa';

export class PrismaEmpresaMapper {
  static paraDominio(registro: PrismaEmpresa): Empresa {
    return new Empresa({
      id: registro.id,
      razaoSocial: registro.razaoSocial,
      nomeFantasia: registro.nomeFantasia ?? undefined,
      cnpj: registro.cnpj,
      inscricaoMunicipal: registro.inscricaoMunicipal ?? undefined,
      regimeTributario: registro.regimeTributario as RegimeTributario,
      regimeEspecialTributacao:
        registro.regimeEspecialTributacao as RegimeEspecialTributacao,
      regimeApuracaoSimplesNacional:
        (registro.regimeApuracaoSimplesNacional as RegimeApuracaoSimplesNacional) ??
        undefined,
      codigoMunicipioIbge: registro.codigoMunicipioIbge ?? undefined,
      email: registro.email ?? undefined,
      telefone: registro.telefone ?? undefined,
      cep: registro.cep ?? undefined,
      endereco: registro.endereco ?? undefined,
      numero: registro.numero ?? undefined,
      bairro: registro.bairro ?? undefined,
      cidade: registro.cidade,
      uf: registro.uf,
      ativo: registro.ativo,
      createdAt: registro.createdAt,
      updatedAt: registro.updatedAt,
    });
  }

  static paraPersistencia(empresa: Empresa) {
    return {
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia,
      cnpj: empresa.cnpj,
      inscricaoMunicipal: empresa.inscricaoMunicipal ?? null,
      regimeTributario: empresa.regimeTributario as PrismaRegimeTributario,
      regimeEspecialTributacao:
        empresa.regimeEspecialTributacao as PrismaRegimeEspecialTributacao,
      regimeApuracaoSimplesNacional:
        (empresa.regimeApuracaoSimplesNacional as PrismaRegimeApuracaoSimplesNacional) ??
        null,
      codigoMunicipioIbge: empresa.codigoMunicipioIbge ?? null,
      email: empresa.email ?? null,
      telefone: empresa.telefone ?? null,
      cep: empresa.cep ?? null,
      endereco: empresa.endereco ?? null,
      numero: empresa.numero ?? null,
      bairro: empresa.bairro ?? null,
      cidade: empresa.cidade,
      uf: empresa.uf,
      ativo: empresa.ativo,
    };
  }
}
