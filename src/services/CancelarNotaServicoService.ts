import { NotaServico, StatusNota } from '../entities/NotaServico';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { ValidarOperacaoSimuladaService } from './ValidarOperacaoSimuladaService';

export class CancelarNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly validarOperacaoSimulada?: ValidarOperacaoSimuladaService,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
  ): Promise<NotaServico> {
    this.validarOperacaoSimulada?.executar();

    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (nota.status !== StatusNota.EMITIDA) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente uma nota emitida pode ser cancelada.',
      );
    }

    nota.cancelar();

    return this.notaRepository.salvar(nota);
  }
}
