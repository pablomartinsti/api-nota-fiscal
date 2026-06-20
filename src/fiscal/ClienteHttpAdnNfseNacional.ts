import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import { gunzipSync } from 'node:zlib';

import { AmbienteFiscal } from '../entities/NotaServico';
import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { ConfiguracaoFiscalAusenteError } from '../errors/ConfiguracaoFiscalAusenteError';
import { ConfiguracaoSefinNacionalAusenteError } from '../errors/ConfiguracaoSefinNacionalAusenteError';
import { CertificadoA1 } from './CertificadoA1';
import {
  ClienteDistribuicaoNfseNacional,
  ConsultarDocumentosDistribuidosPorNsuInput,
  DocumentoFiscalDistribuidoNfse,
  ResultadoConsultaDocumentosDistribuidosNfse,
} from './ClienteDistribuicaoNfseNacional';
import { ProvedorCertificadoA1Arquivo } from './ProvedorCertificadoA1Arquivo';

export interface ConfiguracaoClienteHttpAdnNfseNacional {
  baseUrlHomologacao?: string;
  baseUrlProducao?: string;
  timeoutMs?: number;
  certificadoPath?: string;
  certificadoSenha?: string;
}

export interface RequisicaoHttpAdnNfseNacional {
  url: string;
  method: 'GET';
  headers: Record<string, string>;
  timeoutMs: number;
  chavePrivadaPem: string;
  certificadoPem: string;
}

export interface RespostaHttpAdnNfseNacional {
  status: number;
  body: string;
}

export type TransportadorHttpAdnNfseNacional = (
  requisicao: RequisicaoHttpAdnNfseNacional,
) => Promise<RespostaHttpAdnNfseNacional>;

const TIMEOUT_PADRAO_MS = 15_000;
const BASE_URL_HOMOLOGACAO_PADRAO =
  'https://adn.producaorestrita.nfse.gov.br/contribuintes';
const BASE_URL_PRODUCAO_PADRAO = 'https://adn.nfse.gov.br/contribuintes';

export class ClienteHttpAdnNfseNacional
  implements ClienteDistribuicaoNfseNacional
{
  constructor(
    private readonly obterConfiguracao: () => ConfiguracaoClienteHttpAdnNfseNacional,
    private readonly transportador: TransportadorHttpAdnNfseNacional = transportarComHttpsMutuo,
  ) {}

  async consultarDocumentosPorNsu(
    input: ConsultarDocumentosDistribuidosPorNsuInput,
  ): Promise<ResultadoConsultaDocumentosDistribuidosNfse> {
    const configuracao = this.mesclarConfiguracaoComCertificadoDaRequisicao(
      this.obterConfiguracao(),
      input,
    );
    const timeoutMs = configuracao.timeoutMs ?? TIMEOUT_PADRAO_MS;

    try {
      const requisicao = await this.criarRequisicaoConsultaDfe(
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
          documentos: [],
          erros: this.extrairErros(corpo),
        };
      }

      return {
        sucesso: true,
        statusHttp: resposta.status,
        documentos: this.extrairDocumentos(corpo),
        proximoNsu: this.buscarNumero(corpo, [
          'proximoNsu',
          'proxNSU',
          'proxNsu',
          'ultimoNsu',
          'ultNSU',
        ]),
        maxNsu: this.buscarNumero(corpo, ['maxNsu', 'maxNSU']),
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
          'Tempo limite excedido ao comunicar com a ADN NFS-e.',
        );
      }

      throw new ComunicacaoNfseError(
        'Nao foi possivel comunicar com a ADN NFS-e.',
      );
    }
  }

  private async criarRequisicaoConsultaDfe(
    configuracao: ConfiguracaoClienteHttpAdnNfseNacional,
    input: ConsultarDocumentosDistribuidosPorNsuInput,
    timeoutMs: number,
  ): Promise<RequisicaoHttpAdnNfseNacional> {
    const url = this.criarUrlConsultaDfe(configuracao, input);
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

  private mesclarConfiguracaoComCertificadoDaRequisicao(
    configuracao: ConfiguracaoClienteHttpAdnNfseNacional,
    input: {
      certificadoPath?: string;
      certificadoSenha?: string;
    },
  ): ConfiguracaoClienteHttpAdnNfseNacional {
    return {
      ...configuracao,
      certificadoPath:
        input.certificadoPath ?? configuracao.certificadoPath,
      certificadoSenha:
        input.certificadoSenha ?? configuracao.certificadoSenha,
    };
  }

  private criarUrlConsultaDfe(
    configuracao: ConfiguracaoClienteHttpAdnNfseNacional,
    input: ConsultarDocumentosDistribuidosPorNsuInput,
  ): string {
    const baseUrl = this.obterBaseUrl(configuracao, input.ambienteFiscal);

    if (!Number.isSafeInteger(input.nsu) || input.nsu < 0 || !baseUrl) {
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

    return `${baseUrl.replace(/\/+$/, '')}/DFe/${input.nsu}`;
  }

  private obterBaseUrl(
    configuracao: ConfiguracaoClienteHttpAdnNfseNacional,
    ambienteFiscal: AmbienteFiscal,
  ): string | undefined {
    if (ambienteFiscal === AmbienteFiscal.PRODUCAO) {
      return configuracao.baseUrlProducao?.trim() ?? BASE_URL_PRODUCAO_PADRAO;
    }

    return (
      configuracao.baseUrlHomologacao?.trim() ??
      BASE_URL_HOMOLOGACAO_PADRAO
    );
  }

  private async carregarCertificadoCliente(
    configuracao: ConfiguracaoClienteHttpAdnNfseNacional,
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

  private extrairDocumentos(corpo: unknown): DocumentoFiscalDistribuidoNfse[] {
    const itens = this.extrairItensDocumento(corpo);

    return itens.flatMap((item) => {
      const xml = this.extrairXml(item);

      if (!xml) {
        return [];
      }

      return [
        {
          nsu: this.buscarNumero(item, ['nsu', 'NSU']),
          chaveAcesso: this.buscarTexto(item, [
            'chaveAcesso',
            'chaveNFSe',
            'chNFSe',
          ]),
          xml,
        },
      ];
    });
  }

  private extrairItensDocumento(corpo: unknown): unknown[] {
    if (Array.isArray(corpo)) {
      return corpo;
    }

    const objeto = this.comoObjeto(corpo);

    if (!objeto) {
      return corpo ? [corpo] : [];
    }

    for (const chave of [
      'documentos',
      'dfes',
      'DFe',
      'dfe',
      'loteDFe',
      'listaDFe',
      'documentosFiscais',
    ]) {
      const valor = this.buscarValor(objeto, [chave]);

      if (Array.isArray(valor)) {
        return valor;
      }

      if (valor) {
        return [valor];
      }
    }

    return [objeto];
  }

  private extrairXml(corpo: unknown): string | undefined {
    if (typeof corpo === 'string') {
      return corpo.trim().startsWith('<') ? corpo.trim() : undefined;
    }

    const xmlDireto = this.buscarTexto(corpo, [
      'xml',
      'dfeXml',
      'DFeXml',
      'xmlDFe',
      'xmlNFSe',
      'nfseXml',
      'documentoXml',
    ]);

    if (xmlDireto) {
      return xmlDireto;
    }

    const xmlCompactado = this.buscarTexto(corpo, [
      'xmlGZipB64',
      'xmlDFeGZipB64',
      'dfeXmlGZipB64',
      'DFeXmlGZipB64',
      'nfseXmlGZipB64',
      'documentoXmlGZipB64',
      'arquivoXmlGZipB64',
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

  private extrairErros(corpo: unknown) {
    const itens = this.extrairArrayErros(corpo);

    return itens.map((item) => {
      const objeto = this.comoObjeto(item);

      if (!objeto) {
        return { mensagem: String(item) };
      }

      return {
        codigo: this.buscarTexto(objeto, ['codigo', 'code']),
        campo: this.buscarTexto(objeto, ['campo', 'field']),
        mensagem:
          this.buscarTexto(objeto, [
            'mensagem',
            'message',
            'descricao',
            'detail',
          ]) ?? 'Erro retornado pela ADN NFS-e.',
      };
    });
  }

  private extrairArrayErros(corpo: unknown): unknown[] {
    if (Array.isArray(corpo)) {
      return corpo;
    }

    const objeto = this.comoObjeto(corpo);

    if (!objeto) {
      return corpo ? [corpo] : [{ mensagem: 'Erro retornado pela ADN NFS-e.' }];
    }

    const erros = this.buscarValor(objeto, ['erros', 'errors']);

    if (Array.isArray(erros)) {
      return erros;
    }

    if (erros) {
      return [erros];
    }

    return [objeto];
  }

  private buscarTexto(corpo: unknown, chaves: string[]): string | undefined {
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

      if (typeof valor === 'number' && Number.isFinite(valor)) {
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

  private comoObjeto(corpo: unknown): Record<string, unknown> | undefined {
    if (corpo && typeof corpo === 'object' && !Array.isArray(corpo)) {
      return corpo as Record<string, unknown>;
    }

    return undefined;
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }
}

function transportarComHttpsMutuo(
  requisicao: RequisicaoHttpAdnNfseNacional,
): Promise<RespostaHttpAdnNfseNacional> {
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
    request.end();
  });
}
