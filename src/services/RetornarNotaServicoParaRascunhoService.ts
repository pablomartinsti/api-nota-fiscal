import { NotaServico, StatusNota } from '../entities/NotaServico';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class RetornarNotaServicoParaRascunhoService {
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

    if (nota.status !== StatusNota.ERRO) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente uma nota com erro pode retornar para rascunho.',
      );
    }

    nota.retornarParaRascunho();

    return this.notaRepository.salvar(nota);
  }
}
