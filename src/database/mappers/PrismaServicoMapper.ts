import { Servico as PrismaServico } from '@prisma/client';

import { Servico } from '../../entities/Servico';

export class PrismaServicoMapper {
  static paraDominio(registro: PrismaServico): Servico {
    return new Servico({
      id: registro.id,
      empresaId: registro.empresaId,
      descricao: registro.descricao,
      codigoServico: registro.codigoServico,
      codigoTributacaoNacional:
        registro.codigoTributacaoNacional ?? undefined,
      codigoTributacaoMunicipal:
        registro.codigoTributacaoMunicipal ?? undefined,
      codigoNbs: registro.codigoNbs ?? undefined,
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
      codigoTributacaoNacional: servico.codigoTributacaoNacional ?? null,
      codigoTributacaoMunicipal: servico.codigoTributacaoMunicipal ?? null,
      codigoNbs: servico.codigoNbs ?? null,
      aliquotaIss: servico.aliquotaIss,
      valorPadrao: servico.valorPadrao ?? null,
      ativo: servico.ativo,
    };
  }
}
