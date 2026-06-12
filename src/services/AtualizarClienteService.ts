import {
  AlterarContatoClienteProps,
  AlterarDadosCadastraisClienteProps,
  AlterarEnderecoClienteProps,
  Cliente,
} from '../entities/Cliente';
import { ClienteNaoEncontradoError } from '../errors/ClienteNaoEncontradoError';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export type AtualizarClienteInput = AlterarDadosCadastraisClienteProps &
  AlterarContatoClienteProps &
  AlterarEnderecoClienteProps;

export class AtualizarClienteService {
  constructor(private readonly clienteRepository: ClienteRepository) {}

  async executar(
    autenticacao: TokenPayload,
    clienteId: string,
    dados: AtualizarClienteInput,
  ): Promise<Cliente> {
    const cliente = await this.clienteRepository.buscarPorIdEEmpresaId(
      clienteId,
      autenticacao.empresaId,
    );

    if (!cliente) {
      throw new ClienteNaoEncontradoError();
    }

    cliente.alterarDadosCadastrais(dados);
    cliente.alterarContato(dados);
    cliente.alterarEndereco(dados);

    return this.clienteRepository.salvar(cliente);
  }
}
