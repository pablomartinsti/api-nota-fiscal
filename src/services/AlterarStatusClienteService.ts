import { Cliente } from '../entities/Cliente';
import { ClienteNaoEncontradoError } from '../errors/ClienteNaoEncontradoError';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class AlterarStatusClienteService {
  constructor(private readonly clienteRepository: ClienteRepository) {}

  async executar(
    autenticacao: TokenPayload,
    clienteId: string,
    ativo: boolean,
  ): Promise<Cliente> {
    const cliente = await this.clienteRepository.buscarPorIdEEmpresaId(
      clienteId,
      autenticacao.empresaId,
    );

    if (!cliente) {
      throw new ClienteNaoEncontradoError();
    }

    ativo ? cliente.ativar() : cliente.desativar();

    return this.clienteRepository.salvar(cliente);
  }
}
