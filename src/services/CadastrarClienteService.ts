import { Cliente, ClienteProps } from '../entities/Cliente';
import { CpfCnpjJaCadastradoError } from '../errors/CpfCnpjJaCadastradoError';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { TokenPayload } from '../security/GerenciadorToken';

type DadosCliente = Omit<ClienteProps, 'id' | 'empresaId' | 'ativo' | 'createdAt' | 'updatedAt'>;

export class CadastrarClienteService {
  constructor(private readonly clienteRepository: ClienteRepository) {}

  async executar(
    autenticacao: TokenPayload,
    dados: DadosCliente,
  ): Promise<Cliente> {
    const cliente = new Cliente({
      ...dados,
      empresaId: autenticacao.empresaId,
    });
    const existente = await this.clienteRepository.buscarPorCpfCnpjEEmpresaId(
      cliente.cpfCnpj,
      autenticacao.empresaId,
    );

    if (existente) {
      throw new CpfCnpjJaCadastradoError();
    }

    return this.clienteRepository.salvar(cliente);
  }
}
