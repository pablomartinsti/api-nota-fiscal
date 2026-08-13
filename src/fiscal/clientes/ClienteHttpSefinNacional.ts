import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import { gzipSync } from 'node:zlib';

import { CertificadoA1InvalidoError } from '../../errors/CertificadoA1InvalidoError';
import { ComunicacaoNfseError } from '../../errors/ComunicacaoNfseError';
import { ConfiguracaoFiscalAusenteError } from '../../errors/ConfiguracaoFiscalAusenteError';
import { ConfiguracaoSefinNacionalAusenteError } from '../../errors/ConfiguracaoSefinNacionalAusenteError';
import { AmbienteFiscal } from '../../entities/NotaServico';
import {
  ClienteNfseNacional,
  ConsultarNfsePorChaveInput,
  EnviarDpsAssinadaInput,
  RegistrarEventoCancelamentoNfseInput,
  ResultadoConsultaNfseNacional,
  ResultadoEnvioDpsNfse,
  ResultadoRegistroEventoNfse,
} from './ClienteNfseNacional';
import { CertificadoA1 } from '../certificados-a1/CertificadoA1';
import { ProvedorCertificadoA1Arquivo } from '../certificados-a1/ProvedorCertificadoA1Arquivo';
import { RespostaSefinNacionalParser } from '../respostas/RespostaSefinNacionalParser';

export interface ConfiguracaoClienteHttpSefinNacional {
  baseUrlHomologacao?: string;
  baseUrlProducao?: string;
  endpointEnvioDps?: string;
  timeoutMs?: number;
  certificadoPath?: string;
  certificadoConteudoBase64?: string;
  certificadoSenha?: string;
}

export interface RequisicaoHttpSefinNacional {
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  chavePrivadaPem: string;
  certificadoPem: string;
}

export interface RespostaHttpSefinNacional {
  status: number;
  body: string;
}

export type TransportadorHttpSefinNacional = (
  requisicao: RequisicaoHttpSefinNacional,
) => Promise<RespostaHttpSefinNacional>;

const TIMEOUT_PADRAO_MS = 15_000;
const ENDPOINT_ENVIO_DPS_PADRAO = '/nfse';

export class ClienteHttpSefinNacional implements ClienteNfseNacional {
  private readonly parserResposta = new RespostaSefinNacionalParser();
  constructor(
    private readonly obterConfiguracao: () => ConfiguracaoClienteHttpSefinNacional,
    private readonly transportador: TransportadorHttpSefinNacional = transportarComHttpsMutuo,
  ) {}

  async enviarDpsAssinada(
    input: EnviarDpsAssinadaInput,
  ): Promise<ResultadoEnvioDpsNfse> {
    const configuracao = this.mesclarConfiguracaoComCertificadoDaRequisicao(
      this.obterConfiguracao(),
      input,
    );
    const timeoutMs = configuracao.timeoutMs ?? TIMEOUT_PADRAO_MS;

    try {
      const requisicao = await this.criarRequisicaoEnvioDps(
        configuracao,
        input,
        timeoutMs,
      );
      const resposta = await this.transportador(requisicao);
      const corpo = this.parserResposta.parsear(resposta.body);

      if (resposta.status < 200 || resposta.status >= 300) {
        return {
          sucesso: false,
          statusHttp: resposta.status,
          erros: this.parserResposta.extrairErros(corpo, resposta.status),
        };
      }

      const xmlAutorizado = this.parserResposta.extrairXmlAutorizado(corpo);

      return {
        sucesso: true,
        statusHttp: resposta.status,
        protocolo: this.parserResposta.buscarTexto(corpo, [
          'protocolo',
          'numeroProtocolo',
          'idProcessamento',
          'id',
          'idDps',
        ]),
        chaveAcesso: this.parserResposta.buscarTexto(corpo, [
          'chaveAcesso',
          'chaveNfse',
          'chaveNFSe',
        ]),
        numeroNfse:
          this.parserResposta.buscarTexto(corpo, [
            'numeroNfse',
            'numeroNFSe',
            'numero',
          ]) ?? this.parserResposta.buscarTextoEmXml(xmlAutorizado, ['nNFSe']),
        codigoVerificacao:
          this.parserResposta.buscarTexto(corpo, [
            'codigoVerificacao',
            'codVerificacao',
          ]) ??
          this.parserResposta.buscarTextoEmXml(xmlAutorizado, [
            'cVerifNFSe',
            'cVerifNFSeMun',
          ]),
        xmlAutorizado,
      };
    } catch (error) {
      if (
        error instanceof ConfiguracaoSefinNacionalAusenteError ||
        error instanceof ConfiguracaoFiscalAusenteError ||
        error instanceof CertificadoA1InvalidoError
      ) {
        throw error;
      }

      if (this.isAbortError(error)) {
        throw new ComunicacaoNfseError(
          'Tempo limite excedido ao comunicar com a SEFIN Nacional.',
        );
      }

      throw new ComunicacaoNfseError();
    }
  }

  async consultarNfsePorChave(
    input: ConsultarNfsePorChaveInput,
  ): Promise<ResultadoConsultaNfseNacional> {
    const configuracao = this.mesclarConfiguracaoComCertificadoDaRequisicao(
      this.obterConfiguracao(),
      input,
    );
    const timeoutMs = configuracao.timeoutMs ?? TIMEOUT_PADRAO_MS;

    try {
      const requisicao = await this.criarRequisicaoConsultaNfse(
        configuracao,
        input,
        timeoutMs,
      );
      const resposta = await this.transportador(requisicao);
      const corpo = this.parserResposta.parsear(resposta.body);

      if (resposta.status < 200 || resposta.status >= 300) {
        return {
          sucesso: false,
          statusHttp: resposta.status,
          erros: this.parserResposta.extrairErros(corpo, resposta.status),
        };
      }

      return {
        sucesso: true,
        statusHttp: resposta.status,
        tipoAmbiente: this.parserResposta.buscarNumero(corpo, ['tipoAmbiente']),
        versaoAplicativo: this.parserResposta.buscarTexto(corpo, [
          'versaoAplicativo',
        ]),
        dataHoraProcessamento: this.parserResposta.buscarTexto(corpo, [
          'dataHoraProcessamento',
        ]),
        chaveAcesso: this.parserResposta.buscarTexto(corpo, ['chaveAcesso']),
        xmlAutorizado: this.parserResposta.extrairXmlAutorizado(corpo),
      };
    } catch (error) {
      if (
        error instanceof ConfiguracaoSefinNacionalAusenteError ||
        error instanceof ConfiguracaoFiscalAusenteError ||
        error instanceof CertificadoA1InvalidoError
      ) {
        throw error;
      }

      if (this.isAbortError(error)) {
        throw new ComunicacaoNfseError(
          'Tempo limite excedido ao comunicar com a SEFIN Nacional.',
        );
      }

      throw new ComunicacaoNfseError();
    }
  }

  async registrarEventoCancelamento(
    input: RegistrarEventoCancelamentoNfseInput,
  ): Promise<ResultadoRegistroEventoNfse> {
    const configuracao = this.mesclarConfiguracaoComCertificadoDaRequisicao(
      this.obterConfiguracao(),
      input,
    );
    const timeoutMs = configuracao.timeoutMs ?? TIMEOUT_PADRAO_MS;

    try {
      const requisicao = await this.criarRequisicaoRegistroEventoCancelamento(
        configuracao,
        input,
        timeoutMs,
      );
      const resposta = await this.transportador(requisicao);
      const corpo = this.parserResposta.parsear(resposta.body);

      if (resposta.status < 200 || resposta.status >= 300) {
        return {
          sucesso: false,
          statusHttp: resposta.status,
          erros: this.parserResposta.extrairErros(corpo, resposta.status),
        };
      }

      return {
        sucesso: true,
        statusHttp: resposta.status,
        tipoAmbiente: this.parserResposta.buscarNumero(corpo, ['tipoAmbiente']),
        versaoAplicativo: this.parserResposta.buscarTexto(corpo, [
          'versaoAplicativo',
        ]),
        dataHoraProcessamento: this.parserResposta.buscarTexto(corpo, [
          'dataHoraProcessamento',
        ]),
        xmlEvento: this.parserResposta.extrairXmlEvento(corpo),
      };
    } catch (error) {
      if (
        error instanceof ConfiguracaoSefinNacionalAusenteError ||
        error instanceof ConfiguracaoFiscalAusenteError ||
        error instanceof CertificadoA1InvalidoError
      ) {
        throw error;
      }

      if (this.isAbortError(error)) {
        throw new ComunicacaoNfseError(
          'Tempo limite excedido ao comunicar com a SEFIN Nacional.',
        );
      }

      throw new ComunicacaoNfseError();
    }
  }

  private async criarRequisicaoEnvioDps(
    configuracao: ConfiguracaoClienteHttpSefinNacional,
    input: EnviarDpsAssinadaInput,
    timeoutMs: number,
  ): Promise<RequisicaoHttpSefinNacional> {
    const body = this.criarCorpoEnvioDps(input.xmlAssinado);
    const url = this.criarUrlEnvioDps(configuracao, input.ambienteFiscal);
    const certificado = await this.carregarCertificadoCliente(configuracao);

    return {
      url,
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body, 'utf8').toString(),
      },
      body,
      timeoutMs,
      chavePrivadaPem: certificado.chavePrivadaPem,
      certificadoPem: certificado.certificadoPem,
    };
  }

  private mesclarConfiguracaoComCertificadoDaRequisicao(
    configuracao: ConfiguracaoClienteHttpSefinNacional,
    input: {
      certificadoPath?: string;
      certificadoConteudoBase64?: string;
      certificadoSenha?: string;
    },
  ): ConfiguracaoClienteHttpSefinNacional {
    return {
      ...configuracao,
      certificadoPath:
        input.certificadoPath ?? configuracao.certificadoPath,
      certificadoConteudoBase64:
        input.certificadoConteudoBase64 ??
        configuracao.certificadoConteudoBase64,
      certificadoSenha:
        input.certificadoSenha ?? configuracao.certificadoSenha,
    };
  }

  private async criarRequisicaoConsultaNfse(
    configuracao: ConfiguracaoClienteHttpSefinNacional,
    input: ConsultarNfsePorChaveInput,
    timeoutMs: number,
  ): Promise<RequisicaoHttpSefinNacional> {
    const url = this.criarUrlConsultaNfse(
      configuracao,
      input.chaveAcesso,
      input.ambienteFiscal,
    );
    const certificado = await this.carregarCertificadoCliente(configuracao);

    return {
      url,
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      timeoutMs,
      chavePrivadaPem: certificado.chavePrivadaPem,
      certificadoPem: certificado.certificadoPem,
    };
  }

  private async criarRequisicaoRegistroEventoCancelamento(
    configuracao: ConfiguracaoClienteHttpSefinNacional,
    input: RegistrarEventoCancelamentoNfseInput,
    timeoutMs: number,
  ): Promise<RequisicaoHttpSefinNacional> {
    const body = this.criarCorpoRegistroEvento(
      input.xmlPedidoEventoAssinado,
    );
    const url = this.criarUrlRegistroEvento(
      configuracao,
      input.chaveAcesso,
      input.ambienteFiscal,
    );
    const certificado = await this.carregarCertificadoCliente(configuracao);

    return {
      url,
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body, 'utf8').toString(),
      },
      body,
      timeoutMs,
      chavePrivadaPem: certificado.chavePrivadaPem,
      certificadoPem: certificado.certificadoPem,
    };
  }

  private async carregarCertificadoCliente(
    configuracao: ConfiguracaoClienteHttpSefinNacional,
  ): Promise<CertificadoA1> {
    const caminho = configuracao.certificadoPath?.trim();
    const conteudoBase64 = configuracao.certificadoConteudoBase64?.trim();

    if (
      (!caminho && !conteudoBase64) ||
      configuracao.certificadoSenha === undefined
    ) {
      throw new ConfiguracaoFiscalAusenteError();
    }

    return new ProvedorCertificadoA1Arquivo(() => ({
      caminho,
      conteudoBase64,
      senha: configuracao.certificadoSenha,
    })).obter();
  }

  private criarUrlEnvioDps(
    configuracao: ConfiguracaoClienteHttpSefinNacional,
    ambienteFiscal: AmbienteFiscal,
  ): string {
    const baseUrl = this.obterBaseUrl(configuracao, ambienteFiscal);
    const endpoint = (
      configuracao.endpointEnvioDps ?? ENDPOINT_ENVIO_DPS_PADRAO
    ).trim();

    if (!baseUrl || !endpoint) {
      throw new ConfiguracaoSefinNacionalAusenteError();
    }

    try {
      const url = new URL(baseUrl);

      if (url.protocol !== 'https:') {
        throw new Error('Protocolo invalido.');
      }
    } catch {
      throw new ConfiguracaoSefinNacionalAusenteError();
    }

    const baseNormalizada = baseUrl.replace(/\/+$/, '');
    const endpointNormalizado = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;

    return `${baseNormalizada}${endpointNormalizado}`;
  }

  private criarUrlConsultaNfse(
    configuracao: ConfiguracaoClienteHttpSefinNacional,
    chaveAcesso: string,
    ambienteFiscal: AmbienteFiscal,
  ): string {
    const baseUrl = this.obterBaseUrl(configuracao, ambienteFiscal);
    const chave = chaveAcesso.trim();

    if (!baseUrl || !chave) {
      throw new ConfiguracaoSefinNacionalAusenteError();
    }

    try {
      const url = new URL(baseUrl);

      if (url.protocol !== 'https:') {
        throw new Error('Protocolo invalido.');
      }
    } catch {
      throw new ConfiguracaoSefinNacionalAusenteError();
    }

    return `${baseUrl.replace(/\/+$/, '')}/nfse/${encodeURIComponent(chave)}`;
  }

  private criarUrlRegistroEvento(
    configuracao: ConfiguracaoClienteHttpSefinNacional,
    chaveAcesso: string,
    ambienteFiscal: AmbienteFiscal,
  ): string {
    return `${this.criarUrlConsultaNfse(
      configuracao,
      chaveAcesso,
      ambienteFiscal,
    )}/eventos`;
  }

  private obterBaseUrl(
    configuracao: ConfiguracaoClienteHttpSefinNacional,
    ambienteFiscal: AmbienteFiscal,
  ): string | undefined {
    if (ambienteFiscal === AmbienteFiscal.PRODUCAO) {
      return configuracao.baseUrlProducao?.trim();
    }

    return configuracao.baseUrlHomologacao?.trim();
  }

  private criarCorpoEnvioDps(xmlAssinado: string): string {
    return JSON.stringify({
      dpsXmlGZipB64: this.compactarXmlGzipBase64(xmlAssinado),
    });
  }

  private criarCorpoRegistroEvento(xmlPedidoEventoAssinado: string): string {
    return JSON.stringify({
      pedidoRegistroEventoXmlGZipB64: this.compactarXmlGzipBase64(
        xmlPedidoEventoAssinado,
      ),
    });
  }

  private compactarXmlGzipBase64(xml: string): string {
    return gzipSync(Buffer.from(xml, 'utf8')).toString('base64');
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }
}

function transportarComHttpsMutuo(
  requisicao: RequisicaoHttpSefinNacional,
): Promise<RespostaHttpSefinNacional> {
  return new Promise((resolve, reject) => {
    const url = new URL(requisicao.url);
    const request = httpsRequest(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: requisicao.method,
        headers: requisicao.headers,
        key: requisicao.chavePrivadaPem,
        cert: requisicao.certificadoPem,
      },
      (resposta) => {
        const partes: Buffer[] = [];

        resposta.on('data', (parte: Buffer | string) => {
          partes.push(Buffer.isBuffer(parte) ? parte : Buffer.from(parte));
        });
        resposta.on('end', () => {
          resolve({
            status: resposta.statusCode ?? 0,
            body: Buffer.concat(partes).toString('utf8'),
          });
        });
      },
    );

    request.setTimeout(requisicao.timeoutMs, () => {
      const erro = new Error('Tempo limite excedido.');
      erro.name = 'AbortError';
      request.destroy(erro);
    });

    request.on('error', reject);
    if (requisicao.body) {
      request.write(requisicao.body);
    }
    request.end();
  });
}
