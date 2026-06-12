import { Cliente } from '../entities/Cliente';
import { ClienteNaoEncontradoError } from '../errors/ClienteNaoEncontradoError';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class BuscarClienteService {
  constructor(private readonly clienteRepository: ClienteRepository) {}

  async executar(
    autenticacao: TokenPayload,
    clienteId: string,
  ): Promise<Cliente> {
    const cliente = await this.clienteRepository.buscarPorIdEEmpresaId(
      clienteId,
      autenticacao.empresaId,
    );

    if (!cliente) {
      throw new ClienteNaoEncontradoError();
    }

    return cliente;
  }
}
