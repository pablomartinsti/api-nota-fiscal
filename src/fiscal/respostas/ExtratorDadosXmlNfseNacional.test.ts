import { describe, expect, it } from 'vitest';

import { extrairDadosXmlNfseNacional } from './ExtratorDadosXmlNfseNacional';

describe('extrairDadosXmlNfseNacional', () => {
  it('deve extrair dados principais de uma NFS-e autorizada', () => {
    const dados = extrairDadosXmlNfseNacional(
      criarXmlNfse({
        id: 'NFS31702062258504778000118000000000001026061900000000',
        cpfCnpjTomador: '53477940000132',
        codigoStatus: '100',
        valorServico: '100,50',
      }),
    );

    expect(dados).toEqual({
      chaveAcesso: '31702062258504778000118000000000001026061900000000',
      numeroNfse: '10',
      cpfCnpjTomador: '53477940000132',
      codigoStatus: '100',
      statusFiscal: 'AUTORIZADA',
      dataEmissao: '2026-06-19T10:00:00-03:00',
      dataCompetencia: '2026-06-19',
      valorServico: 100.5,
    });
  });

  it('deve aceitar XML com prefixo e mapear status de cancelamento', () => {
    const dados = extrairDadosXmlNfseNacional(
      criarXmlNfse({
        id: 'NFS31702062258504778000118000000000001126061900000000',
        cpfCnpjTomador: '12345678901',
        codigoStatus: '101',
        valorServico: '42.00',
        prefixo: 'nfse:',
        documentoTomador: 'CPF',
      }),
    );

    expect(dados).toMatchObject({
      chaveAcesso: '31702062258504778000118000000000001126061900000000',
      cpfCnpjTomador: '12345678901',
      codigoStatus: '101',
      statusFiscal: 'CANCELADA',
      valorServico: 42,
    });
  });

  it('deve retornar undefined quando XML nao possui elementos', () => {
    expect(extrairDadosXmlNfseNacional('')).toBeUndefined();
  });
});

function criarXmlNfse(input: {
  id: string;
  cpfCnpjTomador: string;
  codigoStatus: string;
  valorServico: string;
  prefixo?: string;
  documentoTomador?: 'CNPJ' | 'CPF';
}): string {
  const prefixo = input.prefixo ?? '';
  const documentoTomador = input.documentoTomador ?? 'CNPJ';

  return [
    `<${prefixo}NFSe xmlns:nfse="http://www.sped.fazenda.gov.br/nfse" versao="1.01">`,
    `<${prefixo}infNFSe Id="${input.id}">`,
    `<${prefixo}nNFSe>10</${prefixo}nNFSe>`,
    `<${prefixo}cStat>${input.codigoStatus}</${prefixo}cStat>`,
    `<${prefixo}dhProc>2026-06-19T10:00:00-03:00</${prefixo}dhProc>`,
    `<${prefixo}toma>`,
    `<${prefixo}${documentoTomador}>${input.cpfCnpjTomador}</${prefixo}${documentoTomador}>`,
    `</${prefixo}toma>`,
    `<${prefixo}valores>`,
    `<${prefixo}vLiq>${input.valorServico}</${prefixo}vLiq>`,
    `</${prefixo}valores>`,
    `<${prefixo}DPS>`,
    `<${prefixo}infDPS>`,
    `<${prefixo}dCompet>2026-06-19</${prefixo}dCompet>`,
    `</${prefixo}infDPS>`,
    `</${prefixo}DPS>`,
    `</${prefixo}infNFSe>`,
    `</${prefixo}NFSe>`,
  ].join('');
}
