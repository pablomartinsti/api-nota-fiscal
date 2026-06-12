import { Servico } from '../entities/Servico';

export interface ServicoRepository {
  salvar(servico: Servico): Promise<Servico>;
  buscarPorIdEEmpresaId(id: string, empresaId: string): Promise<Servico | null>;
  listarPorEmpresaId(empresaId: string): Promise<Servico[]>;
}
