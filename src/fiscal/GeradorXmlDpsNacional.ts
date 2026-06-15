import { create } from 'xmlbuilder2';

import {
  RegimeApuracaoSimplesNacional,
  RegimeEspecialTributacao,
  RegimeTributario,
} from '../entities/Empresa';
import {
  AmbienteFiscal,
  TipoRetencaoIssqn,
  TributacaoIssqn,
} from '../entities/NotaServico';
import { GeradorXmlDps, GerarXmlDpsInput } from './GeradorXmlDps';
import { listarPendenciasFiscaisDps } from './ProntidaoFiscalDps';

const NAMESPACE_NFSE = 'http://www.sped.fazenda.gov.br/nfse';
const VERSAO_LAYOUT = '1.01';
const VERSAO_APLICACAO = 'api-nota-fiscal-1.0';
type ElementoXml = ReturnType<typeof create>;

export class GeradorXmlDpsNacional implements GeradorXmlDps {
  gerar(input: GerarXmlDpsInput): string {
    const { empresa, cliente, servico, nota } = input;
    const dataHoraEmissao = input.dataHoraEmissao ?? new Date();

    const pendencias = listarPendenciasFiscaisDps({
      empresa,
      servico,
      nota,
    });

    if (pendencias.length > 0) {
      throw new Error(`Dados fiscais invalidos: ${pendencias.join(', ')}.`);
    }

    const codigoMunicipioEmpresa = empresa.codigoMunicipioIbge!;
    const serieDps = nota.serieDps!;
    const numeroDps = nota.numeroDps!;
    const dataCompetencia = nota.dataCompetencia!;

    const documento = create({ version: '1.0', encoding: 'UTF-8' });
    const dps = documento.ele('DPS', {
      xmlns: NAMESPACE_NFSE,
      versao: VERSAO_LAYOUT,
    });
    const infDps = dps.ele('infDPS', {
      Id: this.criarIdDps(
        codigoMunicipioEmpresa,
        empresa.cnpj,
        serieDps,
        numeroDps,
      ),
    });

    this.adicionarTexto(
      infDps,
      'tpAmb',
      this.mapearAmbiente(nota.ambienteFiscal),
    );
    this.adicionarTexto(
      infDps,
      'dhEmi',
      this.formatarDataHoraUtc(dataHoraEmissao),
    );
    this.adicionarTexto(infDps, 'verAplic', VERSAO_APLICACAO);
    this.adicionarTexto(infDps, 'serie', serieDps);
    this.adicionarTexto(infDps, 'nDPS', numeroDps);
    this.adicionarTexto(
      infDps,
      'dCompet',
      this.formatarData(dataCompetencia),
    );
    this.adicionarTexto(infDps, 'tpEmit', '1');
    this.adicionarTexto(infDps, 'cLocEmi', codigoMunicipioEmpresa);

    this.adicionarPrestador(infDps, input);
    this.adicionarTomador(infDps, input);
    this.adicionarServico(infDps, input);
    this.adicionarValores(infDps, input);

    return documento.end({ prettyPrint: true });
  }

  private adicionarPrestador(
    infDps: ElementoXml,
    input: GerarXmlDpsInput,
  ): void {
    const { empresa } = input;
    const prestador = infDps.ele('prest');

    this.adicionarTexto(prestador, 'CNPJ', empresa.cnpj);
    this.adicionarTextoOpcional(prestador, 'IM', empresa.inscricaoMunicipal);
    this.adicionarTexto(prestador, 'xNome', empresa.razaoSocial);

    const regime = prestador.ele('regTrib');
    this.adicionarTexto(
      regime,
      'opSimpNac',
      this.mapearOpcaoSimplesNacional(empresa.regimeTributario),
    );
    this.adicionarTextoOpcional(
      regime,
      'regApTribSN',
      this.mapearRegimeApuracao(empresa.regimeApuracaoSimplesNacional),
    );
    this.adicionarTexto(
      regime,
      'regEspTrib',
      this.mapearRegimeEspecial(empresa.regimeEspecialTributacao),
    );
  }

  private adicionarTomador(
    infDps: ElementoXml,
    input: GerarXmlDpsInput,
  ): void {
    const { cliente } = input;
    const tomador = infDps.ele('toma');
    const tipoDocumento = cliente.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ';

    this.adicionarTexto(tomador, tipoDocumento, cliente.cpfCnpj);
    this.adicionarTextoOpcional(tomador, 'IM', cliente.inscricaoMunicipal);
    this.adicionarTexto(tomador, 'xNome', cliente.nomeRazaoSocial);
  }

  private adicionarServico(
    infDps: ElementoXml,
    input: GerarXmlDpsInput,
  ): void {
    const { servico, nota } = input;
    const grupoServico = infDps.ele('serv');
    const localPrestacao = grupoServico.ele('locPrest');

    this.adicionarTexto(
      localPrestacao,
      'cLocPrestacao',
      nota.codigoMunicipioPrestacao!,
    );

    const codigoServico = grupoServico.ele('cServ');
    this.adicionarTexto(
      codigoServico,
      'cTribNac',
      servico.codigoTributacaoNacional!,
    );
    this.adicionarTextoOpcional(
      codigoServico,
      'cTribMun',
      servico.codigoTributacaoMunicipal,
    );
    this.adicionarTexto(codigoServico, 'xDescServ', nota.descricao);
    this.adicionarTextoOpcional(codigoServico, 'cNBS', servico.codigoNbs);

    if (nota.informacoesComplementares) {
      const informacoesComplementares = grupoServico.ele('infoCompl');
      this.adicionarTexto(
        informacoesComplementares,
        'xInfComp',
        nota.informacoesComplementares,
      );
    }
  }

  private adicionarValores(
    infDps: ElementoXml,
    input: GerarXmlDpsInput,
  ): void {
    const { nota } = input;
    const valores = infDps.ele('valores');
    const valoresServico = valores.ele('vServPrest');

    this.adicionarTexto(
      valoresServico,
      'vServ',
      this.formatarDecimal(nota.valorServico),
    );

    const tributacao = valores.ele('trib');
    const tributacaoMunicipal = tributacao.ele('tribMun');
    this.adicionarTexto(
      tributacaoMunicipal,
      'tribISSQN',
      this.mapearTributacaoIssqn(nota.tributacaoIssqn),
    );
    this.adicionarTexto(
      tributacaoMunicipal,
      'tpRetISSQN',
      this.mapearRetencaoIssqn(nota.tipoRetencaoIssqn),
    );
    this.adicionarTexto(
      tributacaoMunicipal,
      'pAliq',
      this.formatarDecimal(nota.aliquotaIss),
    );

    const totalTributos = tributacao.ele('totTrib');
    this.adicionarTexto(totalTributos, 'indTotTrib', '0');
  }

  private criarIdDps(
    codigoMunicipio: string,
    cnpj: string,
    serie: string,
    numeroDps: string,
  ): string {
    const serieNormalizada = serie.padStart(5, '0');
    const numeroNormalizado = numeroDps.padStart(15, '0');

    return `DPS${codigoMunicipio}2${cnpj}${serieNormalizada}${numeroNormalizado}`;
  }

  private formatarData(data: Date): string {
    return data.toISOString().slice(0, 10);
  }

  private formatarDataHoraUtc(data: Date): string {
    return `${data.toISOString().slice(0, 19)}+00:00`;
  }

  private formatarDecimal(valor: number): string {
    return valor.toFixed(2);
  }

  private mapearAmbiente(ambiente: AmbienteFiscal): string {
    return ambiente === AmbienteFiscal.PRODUCAO ? '1' : '2';
  }

  private mapearOpcaoSimplesNacional(regime: RegimeTributario): string {
    if (regime === RegimeTributario.MEI) {
      return '2';
    }

    if (regime === RegimeTributario.SIMPLES_NACIONAL) {
      return '3';
    }

    return '1';
  }

  private mapearRegimeApuracao(
    regime?: RegimeApuracaoSimplesNacional,
  ): string | undefined {
    const codigos: Record<RegimeApuracaoSimplesNacional, string> = {
      [RegimeApuracaoSimplesNacional.TRIBUTOS_FEDERAIS_E_MUNICIPAL_PELO_SN]:
        '1',
      [RegimeApuracaoSimplesNacional.TRIBUTOS_FEDERAIS_PELO_SN_E_ISS_FORA]:
        '2',
      [RegimeApuracaoSimplesNacional.TRIBUTOS_FEDERAIS_E_MUNICIPAL_FORA_DO_SN]:
        '3',
    };

    return regime ? codigos[regime] : undefined;
  }

  private mapearRegimeEspecial(regime: RegimeEspecialTributacao): string {
    const codigos: Record<RegimeEspecialTributacao, string> = {
      [RegimeEspecialTributacao.NENHUM]: '0',
      [RegimeEspecialTributacao.ATO_COOPERADO]: '1',
      [RegimeEspecialTributacao.ESTIMATIVA]: '2',
      [RegimeEspecialTributacao.MICROEMPRESA_MUNICIPAL]: '3',
      [RegimeEspecialTributacao.NOTARIO_REGISTRADOR]: '4',
      [RegimeEspecialTributacao.PROFISSIONAL_AUTONOMO]: '5',
      [RegimeEspecialTributacao.SOCIEDADE_PROFISSIONAIS]: '6',
      [RegimeEspecialTributacao.OUTROS]: '9',
    };

    return codigos[regime];
  }

  private mapearTributacaoIssqn(tributacao: TributacaoIssqn): string {
    const codigos: Record<TributacaoIssqn, string> = {
      [TributacaoIssqn.TRIBUTAVEL]: '1',
      [TributacaoIssqn.IMUNIDADE]: '2',
      [TributacaoIssqn.EXPORTACAO]: '3',
      [TributacaoIssqn.NAO_INCIDENCIA]: '4',
    };

    return codigos[tributacao];
  }

  private mapearRetencaoIssqn(retencao: TipoRetencaoIssqn): string {
    const codigos: Record<TipoRetencaoIssqn, string> = {
      [TipoRetencaoIssqn.NAO_RETIDO]: '1',
      [TipoRetencaoIssqn.RETIDO_PELO_TOMADOR]: '2',
      [TipoRetencaoIssqn.RETIDO_PELO_INTERMEDIARIO]: '3',
    };

    return codigos[retencao];
  }

  private adicionarTexto(
    elemento: ElementoXml,
    nome: string,
    valor: string,
  ): void {
    elemento.ele(nome).txt(valor);
  }

  private adicionarTextoOpcional(
    elemento: ElementoXml,
    nome: string,
    valor?: string,
  ): void {
    if (valor) {
      this.adicionarTexto(elemento, nome, valor);
    }
  }
}
