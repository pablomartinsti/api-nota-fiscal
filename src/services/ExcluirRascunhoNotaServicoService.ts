import { StatusNota } from '../entities/NotaServico';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class ExcluirRascunhoNotaServicoService {
  constructor(private readonly notaRepository: NotaServicoRepository) {}

  async executar(autenticacao: TokenPayload, notaId: string): Promise<void> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (nota.status !== StatusNota.RASCUNHO) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente um rascunho pode ser excluido.',
      );
    }

    const excluiu = await this.notaRepository.excluirRascunhoPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!excluiu) {
      throw new NotaServicoNaoEncontradaError();
    }
  }
}
