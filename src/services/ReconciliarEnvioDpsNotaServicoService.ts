import { AmbienteFiscal, NotaServico, StatusNota } from '../entities/NotaServico';
import { TipoEventoFiscalNotaServico } from '../entities/NotaServicoEventoFiscal';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import {
  ClienteNfseNacional,
  ErroEnvioDpsNfse,
  ResultadoConsultaNfseNacional,
} from '../fiscal/ClienteNfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { RegistrarEventoFiscalNotaServicoService } from './RegistrarEventoFiscalNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

export interface ReconciliarEnvioDpsNotaServicoInput {
  chaveAcesso?: string;
}

export interface ReconciliarEnvioDpsNotaServicoResultado {
  nota: NotaServico;
  reconciliada: boolean;
  sucesso: boolean;
  statusHttp: number;
  chaveAcesso: string;
  tipoAmbiente?: number;
  versaoAplicativo?: string;
  dataHoraProcessamento?: string;
  xmlAutorizado?: string;
  erros?: ErroEnvioDpsNfse[];
}

export class ReconciliarEnvioDpsNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly clienteNfse: ClienteNfseNacional,
    private readonly resolverConfiguracaoFiscal?: ResolverConfiguracaoFiscalEmpresaService,
    private readonly validarPermissaoProducaoReal?: ValidarPermissaoProducaoRealService,
    private readonly registrarEventoFiscal?: RegistrarEventoFiscalNotaServicoService,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
    input: ReconciliarEnvioDpsNotaServicoInput = {},
  ): Promise<ReconciliarEnvioDpsNotaServicoResultado> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (
      nota.status !== StatusNota.ERRO &&
      nota.status !== StatusNota.PROCESSANDO
    ) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente uma nota com erro ou em processamento pode ser reconciliada.',
      );
    }

    const chaveAcesso = this.obterChaveAcesso(nota, input);

    this.validarPermissaoProducaoReal?.executar(nota.ambienteFiscal);

    const resultado = await this.clienteNfse.consultarNfsePorChave(
      await this.criarInputConsultaNfse(
        autenticacao.empresaId,
        nota.ambienteFiscal,
        chaveAcesso,
      ),
    );

    if (!resultado.sucesso) {
      const mensagemErro = this.criarMensagemErroFiscal(resultado.erros);
      nota.registrarFalhaReconciliacaoFiscal(
        mensagemErro,
      );

      const notaComErro = await this.notaRepository.salvar(nota);
      await this.registrarErroFiscal(
        autenticacao,
        notaComErro,
        mensagemErro,
        resultado.statusHttp,
        chaveAcesso,
      );

      return {
        nota: notaComErro,
        reconciliada: false,
        sucesso: false,
        statusHttp: resultado.statusHttp,
        chaveAcesso,
        erros: resultado.erros,
      };
    }

    nota.reconciliarSucessoFiscal({
      chaveAcesso: resultado.chaveAcesso ?? chaveAcesso,
      xmlAutorizado: resultado.xmlAutorizado,
      dataEmissao: this.converterData(resultado.dataHoraProcessamento),
      dataAutorizacao: this.converterData(resultado.dataHoraProcessamento),
    });

    const notaReconciliada = await this.notaRepository.salvar(nota);

    await this.marcarNotaOriginalComoSubstituidaSeNecessario(
      autenticacao,
      notaReconciliada,
    );
    await this.registrarSucessoFiscal(
      autenticacao,
      notaReconciliada,
      'Envio fiscal reconciliado pela consulta da SEFIN Nacional.',
      resultado.statusHttp,
      resultado.chaveAcesso ?? chaveAcesso,
    );

    return {
      nota: notaReconciliada,
      reconciliada: true,
      sucesso: true,
      statusHttp: resultado.statusHttp,
      chaveAcesso: resultado.chaveAcesso ?? chaveAcesso,
      tipoAmbiente: resultado.tipoAmbiente,
      versaoAplicativo: resultado.versaoAplicativo,
      dataHoraProcessamento: resultado.dataHoraProcessamento,
      xmlAutorizado: resultado.xmlAutorizado,
    };
  }

  private obterChaveAcesso(
    nota: NotaServico,
    input: ReconciliarEnvioDpsNotaServicoInput,
  ): string {
    const chaveAcesso = this.normalizarChaveAcesso(
      input.chaveAcesso ?? nota.chaveAcesso,
    );

    if (!chaveAcesso) {
      throw new TransicaoStatusNotaInvalidaError(
        'Informe a chave de acesso da NFS-e para reconciliar o envio.',
      );
    }

    if (!/^\d{50}$/.test(chaveAcesso)) {
      throw new TransicaoStatusNotaInvalidaError(
        'Chave de acesso da NFS-e deve conter 50 digitos.',
      );
    }

    return chaveAcesso;
  }

  private normalizarChaveAcesso(valor?: string): string | undefined {
    const chave = valor?.replace(/\D/g, '');

    return chave || undefined;
  }

  private converterData(valor?: string): Date | undefined {
    if (!valor) {
      return undefined;
    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime()) ? undefined : data;
  }

  private async marcarNotaOriginalComoSubstituidaSeNecessario(
    autenticacao: TokenPayload,
    nota: NotaServico,
  ): Promise<void> {
    if (!nota.notaSubstituidaId) {
      return;
    }

    const notaSubstituida =
      await this.notaRepository.buscarPorIdEEmpresaId(
        nota.notaSubstituidaId,
        autenticacao.empresaId,
      );

    if (!notaSubstituida) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (notaSubstituida.status !== StatusNota.EMITIDA) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente uma nota emitida pode ser marcada como substituida.',
      );
    }

    notaSubstituida.marcarComoSubstituida();
    await this.notaRepository.salvar(notaSubstituida);
  }

  private criarMensagemErroFiscal(erros?: ErroEnvioDpsNfse[]): string {
    if (!erros?.length) {
      return 'Consulta de reconciliacao nao encontrou NFS-e autorizada.';
    }

    return erros.map((erro) => this.formatarErro(erro)).join('; ');
  }

  private formatarErro(erro: ErroEnvioDpsNfse): string {
    const prefixos = [erro.codigo, erro.campo].filter(Boolean).join(' ');

    return prefixos ? `${prefixos}: ${erro.mensagem}` : erro.mensagem;
  }

  private async registrarSucessoFiscal(
    autenticacao: TokenPayload,
    nota: NotaServico,
    mensagem: string,
    statusHttp?: number,
    chaveAcesso?: string,
  ): Promise<void> {
    if (!this.registrarEventoFiscal || !nota.id) {
      return;
    }

    await this.registrarEventoFiscal.sucesso({
      empresaId: autenticacao.empresaId,
      notaServicoId: nota.id,
      usuarioId: autenticacao.usuarioId,
      tipo: TipoEventoFiscalNotaServico.RECONCILIACAO_ENVIO,
      statusHttp,
      chaveAcesso,
      mensagem,
    });
  }

  private async registrarErroFiscal(
    autenticacao: TokenPayload,
    nota: NotaServico,
    mensagem: string,
    statusHttp?: number,
    chaveAcesso?: string,
  ): Promise<void> {
    if (!this.registrarEventoFiscal || !nota.id) {
      return;
    }

    await this.registrarEventoFiscal.erro({
      empresaId: autenticacao.empresaId,
      notaServicoId: nota.id,
      usuarioId: autenticacao.usuarioId,
      tipo: TipoEventoFiscalNotaServico.RECONCILIACAO_ENVIO,
      statusHttp,
      chaveAcesso,
      mensagem,
    });
  }

  private async criarInputConsultaNfse(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
    chaveAcesso: string,
  ) {
    const configuracaoCertificado = await this.obterConfiguracaoCertificado(
      empresaId,
      ambienteFiscal,
    );

    if (!configuracaoCertificado) {
      return { chaveAcesso };
    }

    return {
      chaveAcesso,
      certificadoPath: configuracaoCertificado.caminho,
      certificadoSenha: configuracaoCertificado.senha,
    };
  }

  private async obterConfiguracaoCertificado(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
  ) {
    if (!this.resolverConfiguracaoFiscal) {
      if (ambienteFiscal === AmbienteFiscal.PRODUCAO) {
        throw new CertificadoA1EmpresaProducaoAusenteError();
      }

      return undefined;
    }

    return this.resolverConfiguracaoFiscal.obterCertificadoA1ParaAmbiente(
      empresaId,
      ambienteFiscal,
    );
  }
}
