import { Cliente } from '../entities/Cliente';

export interface ClienteRepository {
  salvar(cliente: Cliente): Promise<Cliente>;
  buscarPorIdEEmpresaId(id: string, empresaId: string): Promise<Cliente | null>;
  buscarPorCpfCnpjEEmpresaId(
    cpfCnpj: string,
    empresaId: string,
  ): Promise<Cliente | null>;
  listarPorEmpresaId(empresaId: string): Promise<Cliente[]>;
}
