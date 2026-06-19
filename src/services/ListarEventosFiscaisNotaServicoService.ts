import { NotaServicoEventoFiscal } from '../entities/NotaServicoEventoFiscal';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { NotaServicoEventoFiscalRepository } from '../repositories/NotaServicoEventoFiscalRepository';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class ListarEventosFiscaisNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly eventoFiscalRepository: NotaServicoEventoFiscalRepository,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
  ): Promise<NotaServicoEventoFiscal[]> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    return this.eventoFiscalRepository.listarPorNotaEEmpresa(
      notaId,
      autenticacao.empresaId,
    );
  }
}
