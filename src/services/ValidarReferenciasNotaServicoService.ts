import { ClienteNaoEncontradoError } from '../errors/ClienteNaoEncontradoError';
import { ClienteInativoError } from '../errors/ClienteInativoError';
import { ServicoInativoError } from '../errors/ServicoInativoError';
import { ServicoNaoEncontradoError } from '../errors/ServicoNaoEncontradoError';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { ServicoRepository } from '../repositories/ServicoRepository';

export class ValidarReferenciasNotaServicoService {
  constructor(
    private readonly clienteRepository: ClienteRepository,
    private readonly servicoRepository: ServicoRepository,
  ) {}

  async executar(empresaId: string, clienteId: string, servicoId: string) {
    const cliente = await this.clienteRepository.buscarPorIdEEmpresaId(
      clienteId,
      empresaId,
    );

    if (!cliente) {
      throw new ClienteNaoEncontradoError();
    }

    if (!cliente.ativo) {
      throw new ClienteInativoError();
    }

    const servico = await this.servicoRepository.buscarPorIdEEmpresaId(
      servicoId,
      empresaId,
    );

    if (!servico) {
      throw new ServicoNaoEncontradoError();
    }

    if (!servico.ativo) {
      throw new ServicoInativoError();
    }

    return { cliente, servico };
  }
}
