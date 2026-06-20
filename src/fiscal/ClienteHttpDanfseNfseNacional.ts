import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

import { AmbienteFiscal } from '../entities/NotaServico';
import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import { ConfiguracaoSefinNacionalAusenteError } from '../errors/ConfiguracaoSefinNacionalAusenteError';
import { CertificadoA1 } from './CertificadoA1';
import {
  BaixarDanfsePorChaveInput,
  ClienteDanfseNfseNacional,
  ResultadoDownloadDanfseNfse,
} from './ClienteDanfseNfseNacional';
import { ErroEnvioDpsNfse } from './ClienteNfseNacional';
import { ProvedorCertificadoA1Arquivo } from './ProvedorCertificadoA1Arquivo';

export interface ConfiguracaoClienteHttpDanfseNfseNacional {
  baseUrlHomologacao?: string;
  baseUrlProducao?: string;
  timeoutMs?: number;
  certificadoPath?: string;
  certificadoSenha?: string;
}

export interface RequisicaoHttpDanfseNfseNacional {
  url: string;
  method: 'GET';
  headers: Record<string, string>;
  timeoutMs: number;
  chavePrivadaPem?: string;
  certificadoPem?: string;
}

export interface RespostaHttpDanfseNfseNacional {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
}

export type TransportadorHttpDanfseNfseNacional = (
  requisicao: RequisicaoHttpDanfseNfseNacional,
) => Promise<RespostaHttpDanfseNfseNacional>;

const TIMEOUT_PADRAO_MS = 15_000;
const BASE_URL_HOMOLOGACAO_PADRAO =
  'https://adn.producaorestrita.nfse.gov.br/danfse';
const BASE_URL_PRODUCAO_PADRAO = 'https://adn.nfse.gov.br/danfse';

export class ClienteHttpDanfseNfseNacional
  implements ClienteDanfseNfseNacional
{
  constructor(
    private readonly obterConfiguracao: () => ConfiguracaoClienteHttpDanfseNfseNacional,
    private readonly transportador: TransportadorHttpDanfseNfseNacional = transportarComHttps,
  ) {}

  async baixarDanfsePorChave(
    input: BaixarDanfsePorChaveInput,
  ): Promise<ResultadoDownloadDanfseNfse> {
    const configuracao = this.mesclarConfiguracaoComCertificadoDaRequisicao(
      this.obterConfiguracao(),
      input,
    );
    const timeoutMs = configuracao.timeoutMs ?? TIMEOUT_PADRAO_MS;

    try {
      const requisicao = await this.criarRequisicaoDanfse(
        configuracao,
        input,
        timeoutMs,
      );
      const resposta = await this.transportador(requisicao);
      const contentType = this.obterContentType(resposta.headers);

      if (resposta.status < 200 || resposta.status >= 300) {
        return {
          sucesso: false,
          statusHttp: resposta.status,
          chaveAcesso: input.chaveAcesso,
          erros: this.extrairErros(resposta.body),
        };
      }

      if (!this.ehPdf(resposta.body, contentType)) {
        return {
          sucesso: false,
          statusHttp: resposta.status,
          chaveAcesso: input.chaveAcesso,
          erros: [
            {
              mensagem: 'A API DANFSe nao retornou um arquivo PDF.',
            },
          ],
        };
      }

      return {
        sucesso: true,
        statusHttp: resposta.status,
        chaveAcesso: input.chaveAcesso,
        pdf: resposta.body,
        contentType: contentType ?? 'application/pdf',
      };
    } catch (error) {
      if (
        error instanceof ConfiguracaoSefinNacionalAusenteError ||
        error instanceof CertificadoA1InvalidoError
      ) {
        throw error;
      }

      if (this.isAbortError(error)) {
        throw new ComunicacaoNfseError(
          'Tempo limite excedido ao comunicar com a API DANFSe.',
        );
      }

      throw new ComunicacaoNfseError(
        'Nao foi possivel comunicar com a API DANFSe.',
      );
    }
  }

  private async criarRequisicaoDanfse(
    configuracao: ConfiguracaoClienteHttpDanfseNfseNacional,
    input: BaixarDanfsePorChaveInput,
    timeoutMs: number,
  ): Promise<RequisicaoHttpDanfseNfseNacional> {
    const url = this.criarUrlDanfse(configuracao, input);
    const certificado = await this.carregarCertificadoClienteSeConfigurado(
      configuracao,
    );

    return {
      url,
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
      },
      timeoutMs,
      chavePrivadaPem: certificado?.chavePrivadaPem,
      certificadoPem: certificado?.certificadoPem,
    };
  }

  private mesclarConfiguracaoComCertificadoDaRequisicao(
    configuracao: ConfiguracaoClienteHttpDanfseNfseNacional,
    input: {
      certificadoPath?: string;
      certificadoSenha?: string;
    },
  ): ConfiguracaoClienteHttpDanfseNfseNacional {
    return {
      ...configuracao,
      certificadoPath:
        input.certificadoPath ?? configuracao.certificadoPath,
      certificadoSenha:
        input.certificadoSenha ?? configuracao.certificadoSenha,
    };
  }

  private criarUrlDanfse(
    configuracao: ConfiguracaoClienteHttpDanfseNfseNacional,
    input: BaixarDanfsePorChaveInput,
  ): string {
    const baseUrl = this.obterBaseUrl(configuracao, input.ambienteFiscal);
    const chaveAcesso = input.chaveAcesso.trim();

    if (!baseUrl || !/^\d{50}$/.test(chaveAcesso)) {
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

    return `${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(chaveAcesso)}`;
  }

  private obterBaseUrl(
    configuracao: ConfiguracaoClienteHttpDanfseNfseNacional,
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

  private async carregarCertificadoClienteSeConfigurado(
    configuracao: ConfiguracaoClienteHttpDanfseNfseNacional,
  ): Promise<CertificadoA1 | undefined> {
    const caminho = configuracao.certificadoPath?.trim();

    if (!caminho || configuracao.certificadoSenha === undefined) {
      return undefined;
    }

    return new ProvedorCertificadoA1Arquivo(() => ({
      caminho,
      senha: configuracao.certificadoSenha,
    })).obter();
  }

  private obterContentType(
    headers: Record<string, string | string[] | undefined>,
  ): string | undefined {
    const valor =
      headers['content-type'] ??
      headers['Content-Type'] ??
      headers['CONTENT-TYPE'];

    return Array.isArray(valor) ? valor[0] : valor;
  }

  private ehPdf(body: Buffer, contentType?: string): boolean {
    return (
      contentType?.toLowerCase().includes('application/pdf') === true ||
      body.subarray(0, 4).toString('utf8') === '%PDF'
    );
  }

  private extrairErros(body: Buffer): ErroEnvioDpsNfse[] {
    const texto = body.toString('utf8').trim();

    if (!texto) {
      return [{ mensagem: 'Erro retornado pela API DANFSe.' }];
    }

    try {
      const json = JSON.parse(texto) as unknown;
      const erros = this.extrairArrayErros(json);

      return erros.map((erro) => this.normalizarErro(erro));
    } catch {
      return [{ mensagem: texto.slice(0, 500) }];
    }
  }

  private extrairArrayErros(corpo: unknown): unknown[] {
    if (Array.isArray(corpo)) {
      return corpo;
    }

    const objeto = this.comoObjeto(corpo);

    if (!objeto) {
      return corpo ? [corpo] : [];
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

  private normalizarErro(erro: unknown): ErroEnvioDpsNfse {
    const objeto = this.comoObjeto(erro);

    if (!objeto) {
      return { mensagem: String(erro) };
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
        ]) ?? 'Erro retornado pela API DANFSe.',
    };
  }

  private buscarTexto(
    objeto: Record<string, unknown>,
    chaves: string[],
  ): string | undefined {
    for (const chave of chaves) {
      const valor = this.buscarValor(objeto, [chave]);

      if (typeof valor === 'string' && valor.trim()) {
        return valor.trim().slice(0, 500);
      }

      if (typeof valor === 'number') {
        return String(valor);
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

function transportarComHttps(
  requisicao: RequisicaoHttpDanfseNfseNacional,
): Promise<RespostaHttpDanfseNfseNacional> {
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
            headers: resposta.headers,
            body: Buffer.concat(partes),
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
