import {
  NotaServicoEventoFiscal as PrismaNotaServicoEventoFiscal,
  StatusEventoFiscalNotaServico as PrismaStatusEventoFiscalNotaServico,
  TipoEventoFiscalNotaServico as PrismaTipoEventoFiscalNotaServico,
} from '@prisma/client';

import {
  NotaServicoEventoFiscal,
  StatusEventoFiscalNotaServico,
  TipoEventoFiscalNotaServico,
} from '../../entities/NotaServicoEventoFiscal';

export class PrismaNotaServicoEventoFiscalMapper {
  static paraDominio(
    registro: PrismaNotaServicoEventoFiscal,
  ): NotaServicoEventoFiscal {
    return new NotaServicoEventoFiscal({
      id: registro.id,
      empresaId: registro.empresaId,
      notaServicoId: registro.notaServicoId,
      usuarioId: registro.usuarioId ?? undefined,
      tipo: registro.tipo as TipoEventoFiscalNotaServico,
      status: registro.status as StatusEventoFiscalNotaServico,
      statusHttp: registro.statusHttp ?? undefined,
      chaveAcesso: registro.chaveAcesso ?? undefined,
      mensagem: registro.mensagem ?? undefined,
      createdAt: registro.createdAt,
    });
  }

  static paraPersistencia(evento: NotaServicoEventoFiscal) {
    return {
      empresaId: evento.empresaId,
      notaServicoId: evento.notaServicoId,
      usuarioId: evento.usuarioId ?? null,
      tipo: evento.tipo as PrismaTipoEventoFiscalNotaServico,
      status: evento.status as PrismaStatusEventoFiscalNotaServico,
      statusHttp: evento.statusHttp ?? null,
      chaveAcesso: evento.chaveAcesso ?? null,
      mensagem: evento.mensagem ?? null,
    };
  }
}
