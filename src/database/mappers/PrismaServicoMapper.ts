import { Servico as PrismaServico } from '@prisma/client';

import { Servico } from '../../entities/Servico';

export class PrismaServicoMapper {
  static paraDominio(registro: PrismaServico): Servico {
    return new Servico({
      id: registro.id,
      empresaId: registro.empresaId,
      descricao: registro.descricao,
      codigoServico: registro.codigoServico,
      codigoTributacaoMunicipal:
        registro.codigoTributacaoMunicipal ?? undefined,
      aliquotaIss: registro.aliquotaIss.toNumber(),
      valorPadrao: registro.valorPadrao?.toNumber(),
      ativo: registro.ativo,
      createdAt: registro.createdAt,
      updatedAt: registro.updatedAt,
    });
  }

  static paraPersistencia(servico: Servico) {
    return {
      empresaId: servico.empresaId,
      descricao: servico.descricao,
      codigoServico: servico.codigoServico,
      codigoTributacaoMunicipal: servico.codigoTributacaoMunicipal ?? null,
      aliquotaIss: servico.aliquotaIss,
      valorPadrao: servico.valorPadrao ?? null,
      ativo: servico.ativo,
    };
  }
}
