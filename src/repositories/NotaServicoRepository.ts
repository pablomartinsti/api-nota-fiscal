import { NotaServico } from '../entities/NotaServico';

export interface NotaServicoRepository {
  salvar(nota: NotaServico): Promise<NotaServico>;
  buscarPorIdEEmpresaId(
    id: string,
    empresaId: string,
  ): Promise<NotaServico | null>;
  listarPorEmpresaId(empresaId: string): Promise<NotaServico[]>;
}
