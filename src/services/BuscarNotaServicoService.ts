import { NotaServico } from '../entities/NotaServico';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class BuscarNotaServicoService {
  constructor(private readonly notaRepository: NotaServicoRepository) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
  ): Promise<NotaServico> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    return nota;
  }
}
