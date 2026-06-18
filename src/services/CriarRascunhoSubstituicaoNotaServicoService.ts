import {
  CodigoMotivoSubstituicaoNfse,
  NotaServico,
  StatusNota,
} from '../entities/NotaServico';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { CadastrarRascunhoNotaServicoInput } from './CadastrarRascunhoNotaServicoService';
import { ValidarReferenciasNotaServicoService } from './ValidarReferenciasNotaServicoService';

export interface CriarRascunhoSubstituicaoNotaServicoInput
  extends CadastrarRascunhoNotaServicoInput {
  codigoMotivoSubstituicao: CodigoMotivoSubstituicaoNfse;
  motivoSubstituicao: string;
}

export class CriarRascunhoSubstituicaoNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly validarReferencias: ValidarReferenciasNotaServicoService,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaSubstituidaId: string,
    dados: CriarRascunhoSubstituicaoNotaServicoInput,
  ): Promise<NotaServico> {
    const notaSubstituida =
      await this.notaRepository.buscarPorIdEEmpresaId(
        notaSubstituidaId,
        autenticacao.empresaId,
      );

    if (!notaSubstituida) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (notaSubstituida.status !== StatusNota.EMITIDA) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente uma nota emitida pode ser substituida.',
      );
    }

    if (!notaSubstituida.id || !notaSubstituida.chaveAcesso) {
      throw new TransicaoStatusNotaInvalidaError(
        'A nota emitida nao possui chave de acesso para substituicao.',
      );
    }

    const { servico } = await this.validarReferencias.executar(
      autenticacao.empresaId,
      dados.clienteId,
      dados.servicoId,
    );
    const notaSubstituta = new NotaServico({
      empresaId: autenticacao.empresaId,
      usuarioId: autenticacao.usuarioId,
      clienteId: dados.clienteId,
      servicoId: dados.servicoId,
      ambienteFiscal: notaSubstituida.ambienteFiscal,
      serieDps: dados.serieDps,
      numeroDps: dados.numeroDps,
      dataCompetencia: dados.dataCompetencia,
      codigoMunicipioPrestacao: dados.codigoMunicipioPrestacao,
      tributacaoIssqn: dados.tributacaoIssqn,
      tipoRetencaoIssqn: dados.tipoRetencaoIssqn,
      informacoesComplementares: dados.informacoesComplementares,
      valorServico: dados.valorServico,
      aliquotaIss: servico.aliquotaIss,
      descricao: dados.descricao,
      notaSubstituidaId: notaSubstituida.id,
      chaveAcessoSubstituida: notaSubstituida.chaveAcesso,
      codigoMotivoSubstituicao: dados.codigoMotivoSubstituicao,
      motivoSubstituicao: dados.motivoSubstituicao,
    });

    return this.notaRepository.salvar(notaSubstituta);
  }
}
