import { NotaServicoEventoFiscal } from '../entities/NotaServicoEventoFiscal';

export class NotaServicoEventoFiscalPresenter {
  static paraHttp(evento: NotaServicoEventoFiscal) {
    return {
      id: evento.id,
      empresaId: evento.empresaId,
      notaServicoId: evento.notaServicoId,
      usuarioId: evento.usuarioId,
      tipo: evento.tipo,
      status: evento.status,
      statusHttp: evento.statusHttp,
      chaveAcesso: evento.chaveAcesso,
      mensagem: evento.mensagem,
      createdAt: evento.createdAt,
    };
  }
}
