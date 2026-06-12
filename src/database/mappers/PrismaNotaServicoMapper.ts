import {
  NotaServico as PrismaNotaServico,
  StatusNota as PrismaStatusNota,
} from '@prisma/client';

import { NotaServico, StatusNota } from '../../entities/NotaServico';

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
