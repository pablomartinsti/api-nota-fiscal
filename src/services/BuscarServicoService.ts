import { Servico } from '../entities/Servico';
import { ServicoNaoEncontradoError } from '../errors/ServicoNaoEncontradoError';
import { ServicoRepository } from '../repositories/ServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class BuscarServicoService {
  constructor(private readonly servicoRepository: ServicoRepository) {}

  async executar(
    autenticacao: TokenPayload,
    servicoId: string,
  ): Promise<Servico> {
    const servico = await this.servicoRepository.buscarPorIdEEmpresaId(
      servicoId,
      autenticacao.empresaId,
    );

    if (!servico) {
      throw new ServicoNaoEncontradoError();
    }

    return servico;
  }
}
