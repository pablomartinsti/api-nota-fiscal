import {
  AmbienteFiscal,
  NotaServico,
  StatusNota,
} from '../entities/NotaServico';
import {
  ClienteNfseNacional,
  ErroEnvioDpsNfse,
  ResultadoEnvioDpsNfse,
} from '../fiscal/ClienteNfseNacional';
import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { GerarXmlDpsAssinadoNotaServicoService } from './GerarXmlDpsAssinadoNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

export class EnviarDpsAssinadaNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly gerarXmlDpsAssinadoService: GerarXmlDpsAssinadoNotaServicoService,
    private readonly clienteNfse: ClienteNfseNacional,
    private readonly resolverConfiguracaoFiscal?: ResolverConfiguracaoFiscalEmpresaService,
    private readonly validarPermissaoProducaoReal?: ValidarPermissaoProducaoRealService,
  ) {}

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

    if (nota.status !== StatusNota.RASCUNHO) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente uma nota em rascunho pode ter a DPS enviada.',
      );
    }

    const notaSubstituida =
      await this.buscarNotaSubstituidaParaEmissao(autenticacao, nota);

    this.validarPermissaoProducaoReal?.executar(nota.ambienteFiscal);
    await this.obterConfiguracaoCertificado(
      autenticacao.empresaId,
      nota.ambienteFiscal,
    );

    const xmlAssinado = await this.gerarXmlDpsAssinadoService.executar(
      autenticacao,
      notaId,
    );
    const inputEnvio = await this.criarInputEnvioDps(
      autenticacao.empresaId,
      nota.ambienteFiscal,
      xmlAssinado,
    );

    const notaEmProcessamento =
      await this.notaRepository.iniciarProcessamentoEnvio(
        notaId,
        autenticacao.empresaId,
      );

    if (!notaEmProcessamento) {
      throw new TransicaoStatusNotaInvalidaError(
        'A nota ja esta em processamento fiscal ou nao pode mais ser enviada.',
      );
    }

    let resultado: ResultadoEnvioDpsNfse;

    try {
      resultado = await this.clienteNfse.enviarDpsAssinada(inputEnvio);
    } catch (error) {
      if (error instanceof ComunicacaoNfseError) {
        notaEmProcessamento.registrarErroFiscal(error.message);

        return this.notaRepository.salvar(notaEmProcessamento);
      }

      throw error;
    }

    if (!resultado.sucesso) {
      notaEmProcessamento.registrarErroFiscal(
        this.criarMensagemErroFiscal(resultado.erros),
      );

      return this.notaRepository.salvar(notaEmProcessamento);
    }

    if (!resultado.protocolo && !resultado.chaveAcesso) {
      notaEmProcessamento.registrarErroFiscal(
        'Retorno fiscal da SEFIN nao informou protocolo ou chave de acesso.',
      );

      return this.notaRepository.salvar(notaEmProcessamento);
    }

    notaEmProcessamento.registrarSucessoFiscal({
      numeroNfse: resultado.numeroNfse,
      codigoVerificacao: resultado.codigoVerificacao,
      protocoloEmissao: resultado.protocolo,
      chaveAcesso: resultado.chaveAcesso,
      xmlAutorizado: resultado.xmlAutorizado,
    });

    const notaEmitida = await this.notaRepository.salvar(notaEmProcessamento);

    if (notaSubstituida) {
      notaSubstituida.marcarComoSubstituida();
      await this.notaRepository.salvar(notaSubstituida);
    }

    return notaEmitida;
  }

  private async buscarNotaSubstituidaParaEmissao(
    autenticacao: TokenPayload,
    nota: NotaServico,
  ): Promise<NotaServico | null> {
    if (!nota.notaSubstituidaId) {
      return null;
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
        'Somente uma nota emitida pode ser substituida.',
      );
    }

    return notaSubstituida;
  }

  private criarMensagemErroFiscal(erros?: ErroEnvioDpsNfse[]): string {
    if (!erros?.length) {
      return 'DPS rejeitada pela SEFIN Nacional.';
    }

    return erros.map((erro) => this.formatarErro(erro)).join('; ');
  }

  private formatarErro(erro: ErroEnvioDpsNfse): string {
    const prefixos = [erro.codigo, erro.campo].filter(Boolean).join(' ');

    return prefixos ? `${prefixos}: ${erro.mensagem}` : erro.mensagem;
  }

  private async criarInputEnvioDps(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
    xmlAssinado: string,
  ) {
    const configuracaoCertificado = await this.obterConfiguracaoCertificado(
      empresaId,
      ambienteFiscal,
    );

    if (!configuracaoCertificado) {
      return { xmlAssinado };
    }

    return {
      xmlAssinado,
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
