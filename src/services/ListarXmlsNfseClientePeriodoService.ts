import { DOMParser, Element as XmlElement } from '@xmldom/xmldom';

import { AmbienteFiscal } from '../entities/NotaServico';
import { ClienteNaoEncontradoError } from '../errors/ClienteNaoEncontradoError';
import { ClienteDistribuicaoNfseNacional } from '../fiscal/ClienteDistribuicaoNfseNacional';
import { ErroEnvioDpsNfse } from '../fiscal/ClienteNfseNacional';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

export interface ListarXmlsNfseClientePeriodoInput {
  clienteId: string;
  ano: number;
  mes: number;
  ambienteFiscal?: AmbienteFiscal;
  nsuInicial?: number;
  limiteConsultas?: number;
}

export interface XmlNfseClientePeriodoItem {
  nsu?: number;
  chaveAcesso?: string;
  numeroNfse?: string;
  statusFiscal?: string;
  codigoStatus?: string;
  dataEmissao?: string;
  dataCompetencia?: string;
  valorServico?: number;
  xml: string;
}

export interface ResultadoXmlsNfseClientePeriodo {
  sucesso: boolean;
  clienteId: string;
  clienteCpfCnpj: string;
  ano: number;
  mes: number;
  ambienteFiscal: AmbienteFiscal;
  nsuInicial: number;
  ultimoNsuConsultado: number;
  maxNsu?: number;
  total: number;
  notas: XmlNfseClientePeriodoItem[];
  erros?: ErroEnvioDpsNfse[];
}

const LIMITE_CONSULTAS_PADRAO = 50;
const LIMITE_CONSULTAS_MAXIMO = 500;

export class ListarXmlsNfseClientePeriodoService {
  constructor(
    private readonly clienteRepository: ClienteRepository,
    private readonly clienteDistribuicaoNfse: ClienteDistribuicaoNfseNacional,
    private readonly resolverConfiguracaoFiscal: ResolverConfiguracaoFiscalEmpresaService,
    private readonly validarPermissaoProducaoReal: ValidarPermissaoProducaoRealService,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    input: ListarXmlsNfseClientePeriodoInput,
  ): Promise<ResultadoXmlsNfseClientePeriodo> {
    const cliente = await this.clienteRepository.buscarPorIdEEmpresaId(
      input.clienteId,
      autenticacao.empresaId,
    );

    if (!cliente) {
      throw new ClienteNaoEncontradoError();
    }

    const configuracao = await this.resolverConfiguracaoFiscal.executar(
      autenticacao.empresaId,
    );
    const ambienteFiscal =
      input.ambienteFiscal ?? configuracao.ambienteFiscalPadrao;

    this.validarPermissaoProducaoReal.executar(ambienteFiscal);

    const certificado =
      await this.resolverConfiguracaoFiscal.obterCertificadoA1ParaAmbiente(
        autenticacao.empresaId,
        ambienteFiscal,
      );
    const nsuInicial = this.normalizarNsuInicial(input.nsuInicial);
    const limiteConsultas = this.normalizarLimite(input.limiteConsultas);
    const notas: XmlNfseClientePeriodoItem[] = [];
    let nsuAtual = nsuInicial;
    let ultimoNsuConsultado = nsuInicial;
    let maxNsu: number | undefined;

    for (let consulta = 0; consulta < limiteConsultas; consulta += 1) {
      const resultado =
        await this.clienteDistribuicaoNfse.consultarDocumentosPorNsu({
          ambienteFiscal,
          nsu: nsuAtual,
          certificadoPath: certificado?.caminho,
          certificadoSenha: certificado?.senha,
        });

      ultimoNsuConsultado = nsuAtual;
      maxNsu = resultado.maxNsu ?? maxNsu;

      if (!resultado.sucesso) {
        return {
          sucesso: false,
          clienteId: cliente.id!,
          clienteCpfCnpj: cliente.cpfCnpj,
          ano: input.ano,
          mes: input.mes,
          ambienteFiscal,
          nsuInicial,
          ultimoNsuConsultado,
          maxNsu,
          total: notas.length,
          notas,
          erros: resultado.erros,
        };
      }

      for (const documento of resultado.documentos) {
        const nota = this.extrairDadosDaNfse(documento.xml);

        if (
          nota &&
          this.documentoPertenceAoCliente(nota.cpfCnpjTomador, cliente.cpfCnpj) &&
          this.documentoEstaNoPeriodo(nota, input.ano, input.mes)
        ) {
          notas.push({
            nsu: documento.nsu,
            chaveAcesso: documento.chaveAcesso ?? nota.chaveAcesso,
            numeroNfse: nota.numeroNfse,
            statusFiscal: nota.statusFiscal,
            codigoStatus: nota.codigoStatus,
            dataEmissao: nota.dataEmissao,
            dataCompetencia: nota.dataCompetencia,
            valorServico: nota.valorServico,
            xml: documento.xml,
          });
        }
      }

      const proximoNsu = resultado.proximoNsu;

      if (
        maxNsu !== undefined &&
        Number.isSafeInteger(maxNsu) &&
        nsuAtual >= maxNsu
      ) {
        break;
      }

      nsuAtual =
        proximoNsu !== undefined && proximoNsu > nsuAtual
          ? proximoNsu
          : nsuAtual + 1;
    }

    return {
      sucesso: true,
      clienteId: cliente.id!,
      clienteCpfCnpj: cliente.cpfCnpj,
      ano: input.ano,
      mes: input.mes,
      ambienteFiscal,
      nsuInicial,
      ultimoNsuConsultado,
      maxNsu,
      total: notas.length,
      notas,
    };
  }

  private normalizarNsuInicial(nsuInicial?: number): number {
    if (nsuInicial === undefined) {
      return 0;
    }

    return Number.isSafeInteger(nsuInicial) && nsuInicial >= 0
      ? nsuInicial
      : 0;
  }

  private normalizarLimite(limiteConsultas?: number): number {
    if (limiteConsultas === undefined) {
      return LIMITE_CONSULTAS_PADRAO;
    }

    if (!Number.isSafeInteger(limiteConsultas) || limiteConsultas < 1) {
      return LIMITE_CONSULTAS_PADRAO;
    }

    return Math.min(limiteConsultas, LIMITE_CONSULTAS_MAXIMO);
  }

  private extrairDadosDaNfse(xml: string):
    | {
        chaveAcesso?: string;
        numeroNfse?: string;
        cpfCnpjTomador?: string;
        codigoStatus?: string;
        statusFiscal?: string;
        dataEmissao?: string;
        dataCompetencia?: string;
        valorServico?: number;
      }
    | undefined {
    const documento = new DOMParser().parseFromString(xml, 'application/xml');
    const todosElementos = Array.from(documento.getElementsByTagName('*'));

    if (!todosElementos.length) {
      return undefined;
    }

    const codigoStatus = this.buscarTexto(todosElementos, ['cStat']);

    return {
      chaveAcesso: this.extrairChaveAcesso(todosElementos),
      numeroNfse: this.buscarTexto(todosElementos, ['nNFSe']),
      cpfCnpjTomador: this.buscarDocumentoTomador(todosElementos),
      codigoStatus,
      statusFiscal: this.mapearStatusFiscal(codigoStatus),
      dataEmissao: this.buscarTexto(todosElementos, ['dhProc', 'dhEmi']),
      dataCompetencia: this.buscarTexto(todosElementos, ['dCompet']),
      valorServico: this.buscarValorServico(todosElementos),
    };
  }

  private extrairChaveAcesso(elementos: XmlElement[]): string | undefined {
    const infNfse = elementos.find(
      (elemento) => this.localName(elemento) === 'infNFSe',
    );
    const id = infNfse?.getAttribute('Id')?.trim();

    if (id?.startsWith('NFS')) {
      return id.slice(3);
    }

    return this.buscarTexto(elementos, ['chNFSe', 'chaveAcesso']);
  }

  private buscarDocumentoTomador(elementos: XmlElement[]): string | undefined {
    const tomador = elementos.find(
      (elemento) => this.localName(elemento) === 'toma',
    );

    if (!tomador) {
      return undefined;
    }

    const filhos = Array.from(tomador.getElementsByTagName('*'));

    return this.buscarTexto(filhos, ['CNPJ', 'CPF']);
  }

  private buscarValorServico(elementos: XmlElement[]): number | undefined {
    const valor = this.buscarTexto(elementos, ['vLiq', 'vServ']);

    if (!valor) {
      return undefined;
    }

    const numero = Number(valor.replace(',', '.'));

    return Number.isFinite(numero) ? numero : undefined;
  }

  private buscarTexto(
    elementos: XmlElement[],
    nomes: string[],
  ): string | undefined {
    for (const nome of nomes) {
      const elemento = elementos.find(
        (item) => this.localName(item).toLowerCase() === nome.toLowerCase(),
      );
      const texto = elemento?.textContent?.trim();

      if (texto) {
        return texto;
      }
    }

    return undefined;
  }

  private documentoPertenceAoCliente(
    cpfCnpjTomador: string | undefined,
    cpfCnpjCliente: string,
  ): boolean {
    return (
      this.apenasDigitos(cpfCnpjTomador) === this.apenasDigitos(cpfCnpjCliente)
    );
  }

  private documentoEstaNoPeriodo(
    nota: { dataEmissao?: string; dataCompetencia?: string },
    ano: number,
    mes: number,
  ): boolean {
    const data = this.extrairData(nota.dataEmissao ?? nota.dataCompetencia);

    return (
      data !== undefined &&
      data.getUTCFullYear() === ano &&
      data.getUTCMonth() + 1 === mes
    );
  }

  private extrairData(valor?: string): Date | undefined {
    if (!valor) {
      return undefined;
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return undefined;
    }

    return data;
  }

  private mapearStatusFiscal(codigoStatus?: string): string | undefined {
    if (codigoStatus === '100') {
      return 'AUTORIZADA';
    }

    if (codigoStatus === '101') {
      return 'CANCELADA';
    }

    return codigoStatus ? 'OUTRO' : undefined;
  }

  private localName(elemento: XmlElement): string {
    return elemento.localName || elemento.nodeName.split(':').pop() || '';
  }

  private apenasDigitos(valor?: string): string {
    return valor?.replace(/\D/g, '') ?? '';
  }
}
