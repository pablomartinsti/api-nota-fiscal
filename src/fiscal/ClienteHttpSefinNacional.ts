import { gzipSync, gunzipSync } from 'node:zlib';

import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { ConfiguracaoSefinNacionalAusenteError } from '../errors/ConfiguracaoSefinNacionalAusenteError';
import {
  ClienteNfseNacional,
  EnviarDpsAssinadaInput,
  ErroEnvioDpsNfse,
  ResultadoEnvioDpsNfse,
} from './ClienteNfseNacional';

export interface ConfiguracaoClienteHttpSefinNacional {
  baseUrl?: string;
  endpointEnvioDps?: string;
  timeoutMs?: number;
}

type FetchFn = typeof fetch;

const TIMEOUT_PADRAO_MS = 15_000;
const ENDPOINT_ENVIO_DPS_PADRAO = '/nfse';
const TAMANHO_MAXIMO_MENSAGEM_ERRO = 500;

export class ClienteHttpSefinNacional implements ClienteNfseNacional {
  constructor(
    private readonly obterConfiguracao: () => ConfiguracaoClienteHttpSefinNacional,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  async enviarDpsAssinada(
    input: EnviarDpsAssinadaInput,
  ): Promise<ResultadoEnvioDpsNfse> {
    const configuracao = this.obterConfiguracao();
    const url = this.criarUrlEnvioDps(configuracao);
    const timeoutMs = configuracao.timeoutMs ?? TIMEOUT_PADRAO_MS;
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), timeoutMs);

    try {
      const resposta = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: this.criarCorpoEnvioDps(input.xmlAssinado),
        signal: controlador.signal,
      });
      const textoResposta = await resposta.text();
      const corpo = this.parsearResposta(textoResposta);

      if (!resposta.ok) {
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
        numeroNfse: this.buscarTexto(corpo, [
          'numeroNfse',
          'numeroNFSe',
          'numero',
        ]) ?? this.buscarTextoEmXml(xmlAutorizado, ['nNFSe']),
        codigoVerificacao: this.buscarTexto(corpo, [
          'codigoVerificacao',
          'codVerificacao',
        ]) ?? this.buscarTextoEmXml(xmlAutorizado, [
          'cVerifNFSe',
          'cVerifNFSeMun',
        ]),
        xmlAutorizado,
      };
    } catch (error) {
      if (error instanceof ConfiguracaoSefinNacionalAusenteError) {
        throw error;
      }

      if (this.isAbortError(error)) {
        throw new ComunicacaoNfseError(
          'Tempo limite excedido ao comunicar com a SEFIN Nacional.',
        );
      }

      throw new ComunicacaoNfseError();
    } finally {
      clearTimeout(timeout);
    }
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
      new URL(baseUrl);
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
