import {
  Empresa as PrismaEmpresa,
  RegimeTributario as PrismaRegimeTributario,
} from '@prisma/client';

import { Empresa, RegimeTributario } from '../../entities/Empresa';

export class PrismaEmpresaMapper {
  static paraDominio(registro: PrismaEmpresa): Empresa {
    return new Empresa({
      id: registro.id,
      razaoSocial: registro.razaoSocial,
      nomeFantasia: registro.nomeFantasia ?? undefined,
      cnpj: registro.cnpj,
      inscricaoMunicipal: registro.inscricaoMunicipal ?? undefined,
      regimeTributario: registro.regimeTributario as RegimeTributario,
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
      inscricaoMunicipal: empresa.inscricaoMunicipal,
      regimeTributario: empresa.regimeTributario as PrismaRegimeTributario,
      cidade: empresa.cidade,
      uf: empresa.uf,
      ativo: empresa.ativo,
    };
  }
}
