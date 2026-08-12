import { describe, expect, it } from 'vitest';

import { AmbienteFiscal, NotaServico, StatusNota } from '../entities/NotaServico';
import { GeradorPdfDanfseNacional } from './GeradorPdfDanfseNacional';

const chaveAcesso = '12345678901234567890123456789012345678901234567890';

describe('GeradorPdfDanfseNacional', () => {
  it('deve gerar PDF a partir do XML autorizado salvo na nota', () => {
    const nota = new NotaServico({
      id: 'nota-1',
      empresaId: 'empresa-1',
      usuarioId: 'usuario-1',
      clienteId: 'cliente-1',
      servicoId: 'servico-1',
      status: StatusNota.EMITIDA,
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
      numeroNfse: '100',
      serieDps: '1',
      numeroDps: '33',
      chaveAcesso,
      dataCompetencia: new Date('2026-08-01T00:00:00.000Z'),
      dataEmissao: new Date('2026-08-12T13:00:00.000Z'),
      valorServico: 250,
      aliquotaIss: 2,
      descricao: 'Honorarios contabeis',
      xmlAutorizado: `
        <NFSe>
          <infNFSe Id="NFS${chaveAcesso}">
            <nNFSe>100</nNFSe>
            <dCompet>2026-08-01</dCompet>
            <emit>
              <CNPJ>58504778000118</CNPJ>
              <xNome>MARTIR ASSESSORIA CONTABIL</xNome>
              <email>fiscal@martircontabil.com.br</email>
              <fone>3497624502</fone>
              <end>
                <xLgr>RUA ALAMBIQUE</xLgr>
                <nro>229</nro>
                <xBairro>MORUMBI</xBairro>
                <cMun>3170206</cMun>
                <xMun>Uberlandia</xMun>
                <UF>MG</UF>
                <CEP>38407309</CEP>
              </end>
            </emit>
            <toma>
              <CNPJ>37322907000187</CNPJ>
              <xNome>CARLA CAPANEMA ABRAO LTDA</xNome>
            </toma>
            <serv>
              <cServ>
                <cTribNac>17.19.01</cTribNac>
                <xDescServ>Honorarios contabeis referentes a competencia 07/2026.</xDescServ>
              </cServ>
              <locPrest>
                <cLocPrestacao>3170206</cLocPrestacao>
                <xLocPrestacao>Uberlandia</xLocPrestacao>
                <UF>MG</UF>
              </locPrest>
            </serv>
            <valores>
              <vServ>250.00</vServ>
              <pAliq>2.00</pAliq>
              <vISSQN>5.00</vISSQN>
            </valores>
          </infNFSe>
        </NFSe>
      `,
    });

    const resultado = new GeradorPdfDanfseNacional().gerar(nota);

    expect(resultado?.chaveAcesso).toBe(chaveAcesso);
    expect(resultado?.pdf.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4');
    expect(resultado?.pdf.length).toBeGreaterThan(1000);
  });

  it('nao deve gerar PDF quando a nota nao tiver XML autorizado', () => {
    const nota = new NotaServico({
      id: 'nota-1',
      empresaId: 'empresa-1',
      usuarioId: 'usuario-1',
      clienteId: 'cliente-1',
      servicoId: 'servico-1',
      status: StatusNota.EMITIDA,
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
      numeroNfse: '100',
      chaveAcesso,
      dataEmissao: new Date('2026-08-12T13:00:00.000Z'),
      valorServico: 250,
      aliquotaIss: 2,
      descricao: 'Honorarios contabeis',
    });

    expect(new GeradorPdfDanfseNacional().gerar(nota)).toBeUndefined();
  });
});
