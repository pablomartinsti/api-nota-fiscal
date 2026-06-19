import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { ConfiguracaoFiscalAusenteError } from '../errors/ConfiguracaoFiscalAusenteError';
import { ConfiguracaoSefinNacionalAusenteError } from '../errors/ConfiguracaoSefinNacionalAusenteError';
import { AmbienteFiscal } from '../entities/NotaServico';
import {
  ClienteNfseNacional,
  ConsultarNfsePorChaveInput,
  EnviarDpsAssinadaInput,
  ErroEnvioDpsNfse,
  RegistrarEventoCancelamentoNfseInput,
  ResultadoConsultaNfseNacional,
  ResultadoEnvioDpsNfse,
  ResultadoRegistroEventoNfse,
} from './ClienteNfseNacional';
import { CertificadoA1 } from './CertificadoA1';
import { ProvedorCertificadoA1Arquivo } from './ProvedorCertificadoA1Arquivo';

export interface ConfiguracaoClienteHttpSefinNacional {
  baseUrl?: string;
  baseUrlHomologacao?: string;
  baseUrlProducao?: string;
  endpointEnvioDps?: string;
  timeoutMs?: number;
  certificadoPath?: string;
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
const TAMANHO_MAXIMO_MENSAGEM_ERRO = 500;

export class ClienteHttpSefinNacional implements ClienteNfseNacional {
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
      const corpo = this.parsearResposta(resposta.body);

      if (resposta.status < 200 || resposta.status >= 300) {
        return {
          sucesso: false,
          statusHttp: resposta.status,
          erros: this.extrairErros(corpo, resposta.status),
        };
      }

      return {
        sucesso: true,
        statusHttp: resposta.status,
        tipoAmbiente: this.buscarNumero(corpo, ['tipoAmbiente']),
        versaoAplicativo: this.buscarTexto(corpo, ['versaoAplicativo']),
        dataHoraProcessamento: this.buscarTexto(corpo, [
          'dataHoraProcessamento',
        ]),
        chaveAcesso: this.buscarTexto(corpo, ['chaveAcesso']),
        xmlAutorizado: this.extrairXmlAutorizado(corpo),
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
      const corpo = this.parsearResposta(resposta.body);

      if (resposta.status < 200 || resposta.status >= 300) {
        return {
          sucesso: false,
          statusHttp: resposta.status,
          erros: this.extrairErros(corpo, resposta.status),
        };
      }

      return {
        sucesso: true,
        statusHttp: resposta.status,
        tipoAmbiente: this.buscarNumero(corpo, ['tipoAmbiente']),
        versaoAplicativo: this.buscarTexto(corpo, ['versaoAplicativo']),
        dataHoraProcessamento: this.buscarTexto(corpo, [
          'dataHoraProcessamento',
        ]),
        xmlEvento: this.extrairXmlEvento(corpo),
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
      certificadoSenha?: string;
    },
  ): ConfiguracaoClienteHttpSefinNacional {
    return {
      ...configuracao,
      certificadoPath:
        input.certificadoPath ?? configuracao.certificadoPath,
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

    return (
      configuracao.baseUrlHomologacao?.trim() ??
      configuracao.baseUrl?.trim()
    );
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
    const erros = objeto
      ? this.buscarValor(objeto, [
          'erros',
          'errors',
          'mensagens',
          'mensagensProcessamento',
          'Mensagens',
          'Erros',
        ])
      : undefined;

    if (Array.isArray(erros)) {
      return erros.map((erro) => this.normalizarErro(erro));
    }

    const erro = objeto
      ? this.buscarValor(objeto, [
          'erro',
          'error',
          'mensagemProcessamento',
          'MensagemProcessamento',
          'mensagem',
          'Mensagem',
        ])
      : undefined;

    if (erro && typeof erro === 'object') {
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
      mensagem: this.montarMensagemErro(objeto),
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

  private extrairXmlEvento(corpo: unknown): string | undefined {
    const xmlDireto = this.buscarString(corpo, [
      'xmlEvento',
      'eventoXml',
      'xml',
    ]);

    if (xmlDireto) {
      return xmlDireto;
    }

    const xmlCompactado = this.buscarString(corpo, [
      'eventoXmlGZipB64',
      'xmlEventoGZipB64',
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

  private montarMensagemErro(objeto: Record<string, unknown>): string {
    const mensagem =
      this.buscarTexto(objeto, [
        'mensagem',
        'message',
        'detail',
        'descricao',
        'description',
        'erro',
      ]) ?? 'Erro retornado pela SEFIN Nacional.';
    const complemento = this.buscarTexto(objeto, [
      'complemento',
      'complement',
      'detalhe',
      'observacao',
    ]);

    return complemento ? `${mensagem} ${complemento}` : mensagem;
  }

  private buscarValor(
    objeto: Record<string, unknown>,
    chaves: string[],
  ): unknown {
    for (const chave of chaves) {
      if (chave in objeto) {
        return objeto[chave];
      }
    }

    const entradas = Object.entries(objeto);

    for (const chave of chaves) {
      const entrada = entradas.find(
        ([chaveObjeto]) => chaveObjeto.toLowerCase() === chave.toLowerCase(),
      );

      if (entrada) {
        return entrada[1];
      }
    }

    return undefined;
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
      const valor = this.buscarValor(objeto, [chave]);

      if (typeof valor === 'string' && valor.trim()) {
        return valor.trim();
      }

      if (typeof valor === 'number') {
        return String(valor);
      }
    }

    return undefined;
  }

  private buscarNumero(corpo: unknown, chaves: string[]): number | undefined {
    const objeto = this.comoObjeto(corpo);

    if (!objeto) {
      return undefined;
    }

    for (const chave of chaves) {
      const valor = this.buscarValor(objeto, [chave]);

      if (typeof valor === 'number') {
        return valor;
      }

      if (typeof valor === 'string' && valor.trim()) {
        const numero = Number(valor);

        if (Number.isFinite(numero)) {
          return numero;
        }
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
