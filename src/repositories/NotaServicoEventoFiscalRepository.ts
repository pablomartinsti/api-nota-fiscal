import { NotaServicoEventoFiscal } from '../entities/NotaServicoEventoFiscal';

export interface NotaServicoEventoFiscalRepository {
  salvar(evento: NotaServicoEventoFiscal): Promise<NotaServicoEventoFiscal>;
  listarPorNotaEEmpresa(
    notaServicoId: string,
    empresaId: string,
  ): Promise<NotaServicoEventoFiscal[]>;
}
