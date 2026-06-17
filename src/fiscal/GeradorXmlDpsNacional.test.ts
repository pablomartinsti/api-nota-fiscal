import { describe, expect, it } from 'vitest';

import { Cliente } from '../entities/Cliente';
import {
  Empresa,
  RegimeApuracaoSimplesNacional,
  RegimeEspecialTributacao,
  RegimeTributario,
} from '../entities/Empresa';
import {
  NotaServico,
  StatusNota,
  TipoRetencaoIssqn,
} from '../entities/NotaServico';
import { Servico } from '../entities/Servico';
import { GeradorXmlDpsNacional } from './GeradorXmlDpsNacional';

describe('GeradorXmlDpsNacional', () => {
  it('deve gerar o XML basico da DPS sem alterar a nota', () => {
    const empresa = new Empresa({
      id: 'empresa-1',
      razaoSocial: 'Empresa & Tecnologia Ltda',
      cnpj: '12345678000199',
      inscricaoMunicipal: '123456',
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      regimeEspecialTributacao:
        RegimeEspecialTributacao.SOCIEDADE_PROFISSIONAIS,
      regimeApuracaoSimplesNacional:
        RegimeApuracaoSimplesNacional.TRIBUTOS_FEDERAIS_E_MUNICIPAL_PELO_SN,
      codigoMunicipioIbge: '3509502',
      cidade: 'Campinas',
      uf: 'SP',
    });
    const cliente = new Cliente({
      id: 'cliente-1',
      empresaId: 'empresa-1',
      nomeRazaoSocial: 'Cliente & Parceiro',
      cpfCnpj: '12345678901',
      cidade: 'Campinas',
      uf: 'SP',
    });
    const servico = new Servico({
      id: 'servico-1',
      empresaId: 'empresa-1',
      descricao: 'Consultoria',
      codigoServico: '01.01',
      codigoTributacaoNacional: '010101',
      codigoTributacaoMunicipal: '101',
      codigoNbs: '123456789',
      aliquotaIss: 5,
    });
    const nota = new NotaServico({
      id: 'nota-1',
      empresaId: 'empresa-1',
      usuarioId: 'usuario-1',
      clienteId: 'cliente-1',
      servicoId: 'servico-1',
      serieDps: '1',
      numeroDps: '100',
      dataCompetencia: new Date('2026-06-15T00:00:00.000Z'),
      codigoMunicipioPrestacao: '3509502',
      tipoRetencaoIssqn: TipoRetencaoIssqn.RETIDO_PELO_TOMADOR,
      informacoesComplementares: 'Contrato 10 & aditivo 2',
      valorServico: 500,
      aliquotaIss: 5,
      descricao: 'Consultoria & desenvolvimento',
    });

    const dataHoraEmissao = new Date('2026-06-15T18:30:00.000Z');
    const xml = new GeradorXmlDpsNacional().gerar({
      empresa,
      cliente,
      servico,
      nota,
      dataHoraEmissao,
    });

    expect(xml).toContain(
      '<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">',
    );
    expect(xml).toContain(
      'Id="DPS350950221234567800019900001000000000000100"',
    );
    expect(xml).toContain('<tpAmb>2</tpAmb>');
    expect(xml).toContain(`<dhEmi>${formatarDataHoraLocal(dataHoraEmissao)}</dhEmi>`);
    expect(xml).toContain('<dCompet>2026-06-15</dCompet>');
    expect(xml).toContain('<CNPJ>12345678000199</CNPJ>');
    expect(xml).toContain('<CPF>12345678901</CPF>');
    expect(xml).not.toContain('<xNome>Empresa &amp; Tecnologia Ltda</xNome>');
    expect(xml).toContain('<xNome>Cliente &amp; Parceiro</xNome>');
    expect(xml).toContain('<opSimpNac>3</opSimpNac>');
    expect(xml).toContain('<regApTribSN>1</regApTribSN>');
    expect(xml).toContain('<regEspTrib>6</regEspTrib>');
    expect(xml).toContain('<cTribNac>010101</cTribNac>');
    expect(xml).toContain(
      '<xDescServ>Consultoria &amp; desenvolvimento</xDescServ>',
    );
    expect(xml).toContain('<vServ>500.00</vServ>');
    expect(xml).toContain('<tpRetISSQN>2</tpRetISSQN>');
    expect(xml).toContain('<pAliq>5.00</pAliq>');
    expect(xml).toContain('<pTotTribSN>5.00</pTotTribSN>');
    expect(xml).not.toContain('<indTotTrib>');
    expect(xml).toContain('<xInfComp>Contrato 10 &amp; aditivo 2</xInfComp>');
    expect(xml).not.toContain('<Signature');
    expect(nota.status).toBe(StatusNota.RASCUNHO);
  });

  it('nao deve informar aliquota para simples nacional sem retencao de ISS', () => {
    const empresa = new Empresa({
      id: 'empresa-1',
      razaoSocial: 'Empresa Simples Ltda',
      cnpj: '12345678000199',
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      regimeApuracaoSimplesNacional:
        RegimeApuracaoSimplesNacional.TRIBUTOS_FEDERAIS_E_MUNICIPAL_PELO_SN,
      codigoMunicipioIbge: '3509502',
      cidade: 'Campinas',
      uf: 'SP',
    });
    const cliente = new Cliente({
      id: 'cliente-1',
      empresaId: 'empresa-1',
      nomeRazaoSocial: 'Cliente Teste',
      cpfCnpj: '12345678901',
      cidade: 'Campinas',
      uf: 'SP',
    });
    const servico = new Servico({
      id: 'servico-1',
      empresaId: 'empresa-1',
      descricao: 'Consultoria',
      codigoServico: '01.01',
      codigoTributacaoNacional: '010101',
      aliquotaIss: 2,
    });
    const nota = new NotaServico({
      id: 'nota-1',
      empresaId: 'empresa-1',
      usuarioId: 'usuario-1',
      clienteId: 'cliente-1',
      servicoId: 'servico-1',
      serieDps: '1',
      numeroDps: '100',
      dataCompetencia: new Date('2026-06-15T00:00:00.000Z'),
      codigoMunicipioPrestacao: '3509502',
      valorServico: 500,
      aliquotaIss: 2,
      descricao: 'Consultoria contabil',
    });

    const xml = new GeradorXmlDpsNacional().gerar({
      empresa,
      cliente,
      servico,
      nota,
      dataHoraEmissao: new Date('2026-06-15T18:30:00.000Z'),
    });

    expect(xml).toContain('<opSimpNac>3</opSimpNac>');
    expect(xml).toContain('<regApTribSN>1</regApTribSN>');
    expect(xml).toContain('<tpRetISSQN>1</tpRetISSQN>');
    expect(xml).not.toContain('<pAliq>');
    expect(xml).toContain('<pTotTribSN>2.00</pTotTribSN>');
    expect(xml).not.toContain('<indTotTrib>');
  });
});

function formatarDataHoraLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = formatarNumeroData(data.getMonth() + 1);
  const dia = formatarNumeroData(data.getDate());
  const hora = formatarNumeroData(data.getHours());
  const minuto = formatarNumeroData(data.getMinutes());
  const segundo = formatarNumeroData(data.getSeconds());
  const offsetEmMinutos = -data.getTimezoneOffset();
  const sinal = offsetEmMinutos >= 0 ? '+' : '-';
  const absoluto = Math.abs(offsetEmMinutos);
  const horasOffset = formatarNumeroData(Math.floor(absoluto / 60));
  const minutosOffset = formatarNumeroData(absoluto % 60);

  return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}${sinal}${horasOffset}:${minutosOffset}`;
}

function formatarNumeroData(valor: number): string {
  return String(valor).padStart(2, '0');
}
