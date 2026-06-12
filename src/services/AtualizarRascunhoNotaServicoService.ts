import { NotaServico, StatusNota } from '../entities/NotaServico';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { NotaServicoNaoPodeSerAlteradaError } from '../errors/NotaServicoNaoPodeSerAlteradaError';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { CadastrarRascunhoNotaServicoInput } from './CadastrarRascunhoNotaServicoService';
import { ValidarReferenciasNotaServicoService } from './ValidarReferenciasNotaServicoService';

export class AtualizarRascunhoNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly validarReferencias: ValidarReferenciasNotaServicoService,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
    dados: CadastrarRascunhoNotaServicoInput,
  ): Promise<NotaServico> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (nota.status !== StatusNota.RASCUNHO) {
      throw new NotaServicoNaoPodeSerAlteradaError();
    }

    const { servico } = await this.validarReferencias.executar(
      autenticacao.empresaId,
      dados.clienteId,
      dados.servicoId,
    );

    nota.alterarRascunho({
      clienteId: dados.clienteId,
      servicoId: dados.servicoId,
      valorServico: dados.valorServico,
      aliquotaIss: servico.aliquotaIss,
      descricao: dados.descricao,
    });

    return this.notaRepository.salvar(nota);
  }
}
