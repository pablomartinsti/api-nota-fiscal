import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { ConfiguracaoFiscalAusenteError } from '../errors/ConfiguracaoFiscalAusenteError';
import { ConfiguracaoSefinNacionalAusenteError } from '../errors/ConfiguracaoSefinNacionalAusenteError';
import {
  ClienteNfseNacional,
  EnviarDpsAssinadaInput,
  ErroEnvioDpsNfse,
  ResultadoEnvioDpsNfse,
} from './ClienteNfseNacional';
import { CertificadoA1 } from './CertificadoA1';
import { ProvedorCertificadoA1Arquivo } from './ProvedorCertificadoA1Arquivo';

export interface ConfiguracaoClienteHttpSefinNacional {
  baseUrl?: string;
  endpointEnvioDps?: string;
  timeoutMs?: number;
  certificadoPath?: string;
  certificadoSenha?: string;
}

export interface RequisicaoHttpSefinNacional {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
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
const TAMANHO_MAXIMO_MENSAGEM_ERRO = 500;

export class ClienteHttpSefinNacional implements ClienteNfseNacional {
  constructor(
    private readonly obterConfiguracao: () => ConfiguracaoClienteHttpSefinNacional,
    private readonly transportador: TransportadorHttpSefinNacional = transportarComHttpsMutuo,
  ) {}

  async enviarDpsAssinada(
    input: EnviarDpsAssinadaInput,
  ): Promise<ResultadoEnvioDpsNfse> {
    const configuracao = this.obterConfiguracao();
    const timeoutMs = configuracao.timeoutMs ?? TIMEOUT_PADRAO_MS;

    try {
      const requisicao = await this.criarRequisicaoEnvioDps(
        configuracao,
        input.xmlAssinado,
        timeoutMs,
      );
      const resposta = await this.transportador(requisicao);
      const corpo = this.parsearResposta(resposta.body);

      if (resposta.status < 200 || resposta.status >= 300) {
        return {
          sucesso: false,
          statusHttp: resposta.status,
          erros: this.extrairErros(corpo, resposta.status),
        };
      }

      const xmlAutorizado = this.extrairXmlAutorizado(corpo);

      return {
        sucesso: true,
        statusHttp: resposta.status,
        protocolo: this.buscarTexto(corpo, [
          'protocolo',
          'numeroProtocolo',
          'idProcessamento',
          'id',
          'idDps',
        ]),
        chaveAcesso: this.buscarTexto(corpo, [
          'chaveAcesso',
          'chaveNfse',
          'chaveNFSe',
        ]),
        numeroNfse:
          this.buscarTexto(corpo, ['numeroNfse', 'numeroNFSe', 'numero']) ??
          this.buscarTextoEmXml(xmlAutorizado, ['nNFSe']),
        codigoVerificacao:
          this.buscarTexto(corpo, [
            'codigoVerificacao',
            'codVerificacao',
          ]) ??
          this.buscarTextoEmXml(xmlAutorizado, [
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

  private async criarRequisicaoEnvioDps(
    configuracao: ConfiguracaoClienteHttpSefinNacional,
    xmlAssinado: string,
    timeoutMs: number,
  ): Promise<RequisicaoHttpSefinNacional> {
    const body = this.criarCorpoEnvioDps(xmlAssinado);
    const url = this.criarUrlEnvioDps(configuracao);
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

    if (!caminho || configuracao.certificadoSenha === undefined) {
      throw new ConfiguracaoFiscalAusenteError();
    }

    return new ProvedorCertificadoA1Arquivo(() => ({
      caminho,
      senha: configuracao.certificadoSenha,
    })).obter();
  }

  private criarUrlEnvioDps(
    configuracao: ConfiguracaoClienteHttpSefinNacional,
  ): string {
    const baseUrl = configuracao.baseUrl?.trim();
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

  private criarCorpoEnvioDps(xmlAssinado: string): string {
    return JSON.stringify({
      dpsXmlGZipB64: this.compactarXmlGzipBase64(xmlAssinado),
    });
  }

  private compactarXmlGzipBase64(xml: string): string {
    return gzipSync(Buffer.from(xml, 'utf8')).toString('base64');
  }

  private parsearResposta(textoResposta: string): unknown {
    if (!textoResposta.trim()) {
      return undefined;
    }

    try {
      return JSON.parse(textoResposta);
    } catch {
      return textoResposta;
    }
  }

  private extrairErros(corpo: unknown, statusHttp: number): ErroEnvioDpsNfse[] {
    const objeto = this.comoObjeto(corpo);
    const erros = objeto ? objeto.erros ?? objeto.errors : undefined;

    if (Array.isArray(erros)) {
      return erros.map((erro) => this.normalizarErro(erro));
    }

    const erro = objeto ? objeto.erro ?? objeto.error : undefined;

    if (erro) {
      return [this.normalizarErro(erro)];
    }

    const mensagem = this.buscarTexto(corpo, [
      'mensagem',
      'message',
      'detail',
      'descricao',
    ]);

    if (mensagem) {
      return [{ mensagem }];
    }

    return [{ mensagem: `SEFIN Nacional retornou HTTP ${statusHttp}.` }];
  }

  private normalizarErro(erro: unknown): ErroEnvioDpsNfse {
    const objeto = this.comoObjeto(erro);

    if (!objeto) {
      return { mensagem: this.limitarMensagem(String(erro)) };
    }

    return {
      codigo: this.buscarTexto(objeto, ['codigo', 'code', 'id']),
      mensagem:
        this.buscarTexto(objeto, [
          'mensagem',
          'message',
          'detail',
          'descricao',
        ]) ?? 'Erro retornado pela SEFIN Nacional.',
      campo: this.buscarTexto(objeto, ['campo', 'field', 'path']),
    };
  }

  private extrairXmlAutorizado(corpo: unknown): string | undefined {
    const xmlDireto = this.buscarString(corpo, [
      'xmlAutorizado',
      'xmlNfse',
      'xmlNFSe',
      'xml',
    ]);

    if (xmlDireto) {
      return xmlDireto;
    }

    const xmlCompactado = this.buscarString(corpo, [
      'nfseXmlGZipB64',
      'xmlAutorizadoGZipB64',
      'xmlNfseGZipB64',
    ]);

    if (!xmlCompactado) {
      return undefined;
    }

    try {
      return gunzipSync(Buffer.from(xmlCompactado, 'base64')).toString('utf8');
    } catch {
      return undefined;
    }
  }

  private buscarTexto(corpo: unknown, chaves: string[]): string | undefined {
    const valor = this.buscarString(corpo, chaves);

    return valor ? this.limitarMensagem(valor) : undefined;
  }

  private buscarString(corpo: unknown, chaves: string[]): string | undefined {
    const objeto = this.comoObjeto(corpo);

    if (!objeto) {
      return undefined;
    }

    for (const chave of chaves) {
      const valor = objeto[chave];

      if (typeof valor === 'string' && valor.trim()) {
        return valor.trim();
      }

      if (typeof valor === 'number') {
        return String(valor);
      }
    }

    return undefined;
  }

  private buscarTextoEmXml(
    xml: string | undefined,
    chaves: string[],
  ): string | undefined {
    if (!xml) {
      return undefined;
    }

    for (const chave of chaves) {
      const resultado = xml.match(
        new RegExp(
          `<(?:[\\w.-]+:)?${chave}\\b[^>]*>([^<]+)</(?:[\\w.-]+:)?${chave}>`,
        ),
      );
      const valor = resultado?.[1]?.trim();

      if (valor) {
        return this.limitarMensagem(valor);
      }
    }

    return undefined;
  }

  private comoObjeto(corpo: unknown): Record<string, unknown> | undefined {
    if (corpo && typeof corpo === 'object' && !Array.isArray(corpo)) {
      return corpo as Record<string, unknown>;
    }

    return undefined;
  }

  private limitarMensagem(mensagem: string): string {
    return mensagem.trim().slice(0, TAMANHO_MAXIMO_MENSAGEM_ERRO);
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
        method: 'POST',
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
    request.write(requisicao.body);
    request.end();
  });
}
