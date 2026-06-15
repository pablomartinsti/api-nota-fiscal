import {
  NotaServico,
  TipoRetencaoIssqn,
  TributacaoIssqn,
} from '../entities/NotaServico';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { ValidarReferenciasNotaServicoService } from './ValidarReferenciasNotaServicoService';

export interface CadastrarRascunhoNotaServicoInput {
  clienteId: string;
  servicoId: string;
  valorServico: number;
  descricao: string;
  serieDps?: string;
  numeroDps?: string;
  dataCompetencia?: Date;
  codigoMunicipioPrestacao?: string;
  tributacaoIssqn?: TributacaoIssqn;
  tipoRetencaoIssqn?: TipoRetencaoIssqn;
  informacoesComplementares?: string;
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
      serieDps: dados.serieDps,
      numeroDps: dados.numeroDps,
      dataCompetencia: dados.dataCompetencia,
      codigoMunicipioPrestacao: dados.codigoMunicipioPrestacao,
      tributacaoIssqn: dados.tributacaoIssqn,
      tipoRetencaoIssqn: dados.tipoRetencaoIssqn,
      informacoesComplementares: dados.informacoesComplementares,
    });

    return this.notaRepository.salvar(nota);
  }
}
