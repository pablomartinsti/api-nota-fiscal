import { Cliente } from '../entities/Cliente';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class ListarClientesService {
  constructor(private readonly clienteRepository: ClienteRepository) {}

  async executar(autenticacao: TokenPayload): Promise<Cliente[]> {
    return this.clienteRepository.listarPorEmpresaId(autenticacao.empresaId);
  }
}
