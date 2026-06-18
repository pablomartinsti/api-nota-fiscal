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

    this.adicionarSubstituicao(infDps, input);
    this.adicionarPrestador(infDps, input);
    this.adicionarTomador(infDps, input);
    this.adicionarServico(infDps, input);
    this.adicionarValores(infDps, input);

    return documento.end({ prettyPrint: true });
  }

  private adicionarSubstituicao(
    infDps: ElementoXml,
    input: GerarXmlDpsInput,
  ): void {
    const { nota } = input;

    if (!nota.chaveAcessoSubstituida || !nota.codigoMotivoSubstituicao) {
      return;
    }

    const substituicao = infDps.ele('subst');
    this.adicionarTexto(
      substituicao,
      'chSubstda',
      nota.chaveAcessoSubstituida,
    );
    this.adicionarTexto(
      substituicao,
      'cMotivo',
      nota.codigoMotivoSubstituicao,
    );
    this.adicionarTextoOpcional(
      substituicao,
      'xMotivo',
      nota.motivoSubstituicao,
    );
  }

  private adicionarPrestador(
    infDps: ElementoXml,
    input: GerarXmlDpsInput,
  ): void {
    const { empresa } = input;
    const prestador = infDps.ele('prest');

    this.adicionarTexto(prestador, 'CNPJ', empresa.cnpj);
    this.adicionarTextoOpcional(prestador, 'IM', empresa.inscricaoMunicipal);

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
    if (this.deveInformarAliquotaIss(input)) {
      this.adicionarTexto(
        tributacaoMunicipal,
        'pAliq',
        this.formatarDecimal(nota.aliquotaIss),
      );
    }

    this.adicionarTotalTributos(tributacao, input);
  }

  private deveInformarAliquotaIss(input: GerarXmlDpsInput): boolean {
    const { empresa, nota } = input;
    const apuraIssPeloSimples =
      empresa.regimeTributario === RegimeTributario.SIMPLES_NACIONAL &&
      empresa.regimeApuracaoSimplesNacional ===
        RegimeApuracaoSimplesNacional.TRIBUTOS_FEDERAIS_E_MUNICIPAL_PELO_SN;
    const semRetencao =
      nota.tipoRetencaoIssqn === TipoRetencaoIssqn.NAO_RETIDO;

    return !(apuraIssPeloSimples && semRetencao);
  }

  private adicionarTotalTributos(
    tributacao: ElementoXml,
    input: GerarXmlDpsInput,
  ): void {
    const totalTributos = tributacao.ele('totTrib');

    if (input.empresa.regimeTributario === RegimeTributario.SIMPLES_NACIONAL) {
      this.adicionarTexto(
        totalTributos,
        'pTotTribSN',
        this.formatarDecimal(input.nota.aliquotaIss),
      );
      return;
    }

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
    const ano = data.getFullYear();
    const mes = this.formatarNumeroData(data.getMonth() + 1);
    const dia = this.formatarNumeroData(data.getDate());
    const hora = this.formatarNumeroData(data.getHours());
    const minuto = this.formatarNumeroData(data.getMinutes());
    const segundo = this.formatarNumeroData(data.getSeconds());
    const offset = this.formatarOffset(data);

    return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}${offset}`;
  }

  private formatarDecimal(valor: number): string {
    return valor.toFixed(2);
  }

  private formatarNumeroData(valor: number): string {
    return String(valor).padStart(2, '0');
  }

  private formatarOffset(data: Date): string {
    const offsetEmMinutos = -data.getTimezoneOffset();
    const sinal = offsetEmMinutos >= 0 ? '+' : '-';
    const absoluto = Math.abs(offsetEmMinutos);
    const horas = this.formatarNumeroData(Math.floor(absoluto / 60));
    const minutos = this.formatarNumeroData(absoluto % 60);

    return `${sinal}${horas}:${minutos}`;
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
