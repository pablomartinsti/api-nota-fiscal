import { describe, expect, it } from 'vitest';

import { AmbienteFiscal, NotaServico, StatusNota } from '../../entities/NotaServico';
import { GeradorPdfDanfseNacional } from './GeradorPdfDanfseNacional';

const chaveAcesso = '12345678901234567890123456789012345678901234567890';

const xmlAutorizado = `
<NFSe>
  <infNFSe Id="NFS${chaveAcesso}">
    <nNFSe>100</nNFSe>
    <ambGer>1</ambGer>
    <dhProc>2026-08-12T13:00:00-03:00</dhProc>
    <cStat>100</cStat>
    <xMotivo>NFS-e Gerada</xMotivo>
    <emit>
      <CNPJ>58504778000118</CNPJ>
      <xNome>MARTIR ASSESSORIA CONTABIL</xNome>
      <email>fiscal@martircontabil.com.br</email>
      <fone>3497624502</fone>
      <enderNac>
        <xLgr>RUA ALAMBIQUE</xLgr>
        <nro>229</nro>
        <xBairro>MORUMBI</xBairro>
        <cMun>3170206</cMun>
        <UF>MG</UF>
        <CEP>38407309</CEP>
      </enderNac>
    </emit>
    <cTribNac>171901</cTribNac>
    <xTribNac>Contabilidade, inclusive servicos tecnicos e auxiliares.</xTribNac>
    <xLocEmi>Uberlandia</xLocEmi>
    <xLocPrestacao>Uberlandia</xLocPrestacao>
    <cLocIncid>3170206</cLocIncid>
    <xLocIncid>Uberlandia</xLocIncid>
    <valores>
      <vBC>250.00</vBC>
      <pAliqAplic>2.00</pAliqAplic>
      <vISSQN>5.00</vISSQN>
      <vLiq>250.00</vLiq>
    </valores>
    <DPS>
      <infDPS Id="DPS317020658504778000118900000000000000000000000033">
        <tpAmb>1</tpAmb>
        <dhEmi>2026-08-12T13:00:00-03:00</dhEmi>
        <verAplic>Martir Gestao</verAplic>
        <serie>1</serie>
        <nDPS>33</nDPS>
        <dCompet>20260801</dCompet>
        <tpEmit>1</tpEmit>
        <cLocEmi>3170206</cLocEmi>
        <prest>
          <CNPJ>58504778000118</CNPJ>
          <fone>3497624502</fone>
          <email>fiscal@martircontabil.com.br</email>
          <regTrib>
            <opSimpNac>3</opSimpNac>
            <regApTribSN>1</regApTribSN>
            <regEspTrib>0</regEspTrib>
          </regTrib>
        </prest>
        <toma>
          <CNPJ>37322907000187</CNPJ>
          <xNome>CARLA CAPANEMA ABRAO LTDA</xNome>
          <end>
            <endNac>
              <cMun>3170206</cMun>
              <CEP>38407309</CEP>
            </endNac>
            <xLgr>RUA ALAMBIQUE</xLgr>
            <nro>229</nro>
            <xBairro>MORUMBI</xBairro>
          </end>
          <email>carla@example.com</email>
        </toma>
        <serv>
          <locPrest>
            <cLocPrestacao>3170206</cLocPrestacao>
          </locPrest>
          <cServ>
            <cTribNac>171901</cTribNac>
            <xDescServ>Honorarios contabeis referentes a competencia 07/2026.</xDescServ>
          </cServ>
        </serv>
        <valores>
          <vServPrest>
            <vServ>250.00</vServ>
          </vServPrest>
          <trib>
            <tribMun>
              <tribISSQN>1</tribISSQN>
              <tpRetISSQN>1</tpRetISSQN>
              <pAliq>2.00</pAliq>
            </tribMun>
            <totTrib>
              <indTotTrib>0</indTotTrib>
            </totTrib>
          </trib>
        </valores>
      </infDPS>
    </DPS>
  </infNFSe>
</NFSe>
`;

describe('GeradorPdfDanfseNacional', () => {
  it('deve gerar PDF a partir do XML autorizado salvo na nota', async () => {
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
      xmlAutorizado,
    });

    const resultado = await new GeradorPdfDanfseNacional().gerar(nota);

    expect(resultado?.chaveAcesso).toBe(chaveAcesso);
    expect(resultado?.pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(resultado?.pdf.length).toBeGreaterThan(1000);
  });

  it('nao deve gerar PDF quando a nota nao tiver XML autorizado', async () => {
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

    await expect(new GeradorPdfDanfseNacional().gerar(nota)).resolves.toBeUndefined();
  });
});
