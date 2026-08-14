import {
  AmbienteFiscal,
  NotaServico,
  StatusNota,
} from '../../entities/NotaServico';
import { TipoEventoFiscalNotaServico } from '../../entities/NotaServicoEventoFiscal';
import {
  ClienteNfseNacional,
  ResultadoEnvioDpsNfse,
} from '../../fiscal/clientes/ClienteNfseNacional';
import { formatarErrosFiscaisNfse } from '../../fiscal/respostas/FormatadorErroFiscalNfse';
import { ComunicacaoNfseError } from '../../errors/ComunicacaoNfseError';
import { XmlDpsInvalidoError } from '../../errors/XmlDpsInvalidoError';
import { NotaServicoNaoEncontradaError } from '../../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../../errors/TransicaoStatusNotaInvalidaError';
import { NotaServicoRepository } from '../../repositories/NotaServicoRepository';
import { TokenPayload } from '../../security/GerenciadorToken';
import { GerarXmlDpsAssinadoNotaServicoService } from './GerarXmlDpsAssinadoNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from '../fiscal/ResolverConfiguracaoFiscalEmpresaService';
import { RegistrarEventoFiscalNotaServicoService } from './RegistrarEventoFiscalNotaServicoService';
import {
  registrarErroFiscalNotaServico,
  registrarSucessoFiscalNotaServico,
} from './RegistrarEventoFiscalNotaServicoHelper';
import { ValidarPermissaoProducaoRealService } from '../fiscal/ValidarPermissaoProducaoRealService';
import {
  obterConfiguracaoCertificadoClienteNfse,
  prepararInputClienteNfse,
} from '../fiscal/PrepararInputClienteNfseService';
import { validarValorServicoSubstituicao } from './RegrasSubstituicaoNotaServico';

export class EnviarDpsAssinadaNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly gerarXmlDpsAssinadoService: GerarXmlDpsAssinadoNotaServicoService,
    private readonly clienteNfse: ClienteNfseNacional,
    private readonly resolverConfiguracaoFiscal: ResolverConfiguracaoFiscalEmpresaService,
    private readonly validarPermissaoProducaoReal: ValidarPermissaoProducaoRealService,
    private readonly registrarEventoFiscal?: RegistrarEventoFiscalNotaServicoService,
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
    if (notaSubstituida) {
      validarValorServicoSubstituicao(notaSubstituida, nota.valorServico);
    }

    await this.resolverConfiguracaoFiscal.validarEmissaoHabilitada(
      autenticacao.empresaId,
    );
    this.validarPermissaoProducaoReal.executar(nota.ambienteFiscal);
    await obterConfiguracaoCertificadoClienteNfse(
      this.resolverConfiguracaoFiscal,
      autenticacao.empresaId,
      nota.ambienteFiscal,
    );

    let xmlAssinado: string;

    try {
      xmlAssinado = await this.gerarXmlDpsAssinadoService.executar(
        autenticacao,
        notaId,
      );
    } catch (error) {
      if (error instanceof XmlDpsInvalidoError) {
        const mensagemErro = this.criarMensagemErroXml(error);
        nota.registrarErroFiscal(mensagemErro);

        const notaComErro = await this.notaRepository.salvar(nota);
        await this.registrarErroFiscal(autenticacao, notaComErro, mensagemErro);

        return notaComErro;
      }

      throw error;
    }
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

        const notaComErro = await this.notaRepository.salvar(
          notaEmProcessamento,
        );
        await this.registrarErroFiscal(
          autenticacao,
          notaComErro,
          error.message,
        );

        return notaComErro;
      }

      throw error;
    }

    if (!resultado.sucesso) {
      const mensagemErro = formatarErrosFiscaisNfse(
        resultado.erros,
        'DPS rejeitada pela SEFIN Nacional.',
      );
      notaEmProcessamento.registrarErroFiscal(mensagemErro);

      const notaComErro = await this.notaRepository.salvar(notaEmProcessamento);
      await this.registrarErroFiscal(
        autenticacao,
        notaComErro,
        mensagemErro,
        resultado.statusHttp,
        resultado.chaveAcesso,
      );

      return notaComErro;
    }

    if (!resultado.protocolo && !resultado.chaveAcesso) {
      const mensagemErro =
        'Retorno fiscal da SEFIN nao informou protocolo ou chave de acesso.';
      notaEmProcessamento.registrarErroFiscal(mensagemErro);

      const notaComErro = await this.notaRepository.salvar(notaEmProcessamento);
      await this.registrarErroFiscal(
        autenticacao,
        notaComErro,
        mensagemErro,
        resultado.statusHttp,
        resultado.chaveAcesso,
      );

      return notaComErro;
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

    await this.registrarSucessoFiscal(
      autenticacao,
      notaEmitida,
      'DPS enviada e autorizada pela SEFIN Nacional.',
      resultado.statusHttp,
      resultado.chaveAcesso,
    );

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

  private criarMensagemErroXml(error: XmlDpsInvalidoError): string {
    if (!error.erros.length) {
      return error.message;
    }

    return error.message + ' ' + error.erros.join('; ');
  }

  private async registrarSucessoFiscal(
    autenticacao: TokenPayload,
    nota: NotaServico,
    mensagem: string,
    statusHttp?: number,
    chaveAcesso?: string,
  ): Promise<void> {
    await registrarSucessoFiscalNotaServico({
      registrarEventoFiscal: this.registrarEventoFiscal,
      autenticacao,
      notaServicoId: nota.id,
      tipo: TipoEventoFiscalNotaServico.ENVIO_DPS,
      statusHttp,
      chaveAcesso: chaveAcesso ?? nota.chaveAcesso,
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
    await registrarErroFiscalNotaServico({
      registrarEventoFiscal: this.registrarEventoFiscal,
      autenticacao,
      notaServicoId: nota.id,
      tipo: TipoEventoFiscalNotaServico.ENVIO_DPS,
      statusHttp,
      chaveAcesso: chaveAcesso ?? nota.chaveAcesso,
      mensagem,
    });
  }

  private async criarInputEnvioDps(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
    xmlAssinado: string,
  ) {
    return prepararInputClienteNfse(
      this.resolverConfiguracaoFiscal,
      empresaId,
      ambienteFiscal,
      { xmlAssinado },
    );
  }

}
