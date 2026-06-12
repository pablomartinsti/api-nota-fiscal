import { NotaServico } from '../entities/NotaServico';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { ValidarReferenciasNotaServicoService } from './ValidarReferenciasNotaServicoService';

export interface CadastrarRascunhoNotaServicoInput {
  clienteId: string;
  servicoId: string;
  valorServico: number;
  descricao: string;
}

export class CadastrarRascunhoNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly validarReferencias: ValidarReferenciasNotaServicoService,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    dados: CadastrarRascunhoNotaServicoInput,
  ): Promise<NotaServico> {
    const { servico } = await this.validarReferencias.executar(
      autenticacao.empresaId,
      dados.clienteId,
      dados.servicoId,
    );
    const nota = new NotaServico({
      empresaId: autenticacao.empresaId,
      usuarioId: autenticacao.usuarioId,
      clienteId: dados.clienteId,
      servicoId: dados.servicoId,
      valorServico: dados.valorServico,
      aliquotaIss: servico.aliquotaIss,
      descricao: dados.descricao,
    });

    return this.notaRepository.salvar(nota);
  }
}
