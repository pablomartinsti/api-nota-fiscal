import { NotaServico, StatusNota } from '../entities/NotaServico';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { EmissorNotaServico } from '../fiscal/EmissorNotaServico';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class EmitirNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly emissor: EmissorNotaServico,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
    simularFalha = false,
  ): Promise<NotaServico> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (nota.status !== StatusNota.RASCUNHO) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente uma nota em rascunho pode ser emitida.',
      );
    }

    const resultado = await this.emissor.emitir({ nota, simularFalha });

    if (!resultado.sucesso) {
      nota.registrarErro(resultado.mensagemErro);
      return this.notaRepository.salvar(nota);
    }

    nota.emitir(resultado);

    return this.notaRepository.salvar(nota);
  }
}
