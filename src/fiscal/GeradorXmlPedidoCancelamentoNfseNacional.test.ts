import { describe, expect, it } from 'vitest';

import { Empresa, RegimeTributario } from '../entities/Empresa';
import { AmbienteFiscal, NotaServico, StatusNota } from '../entities/NotaServico';
import { GeradorXmlPedidoCancelamentoNfseNacional } from './GeradorXmlPedidoCancelamentoNfseNacional';

const chaveAcesso = '12345678901234567890123456789012345678901234567890';

describe('GeradorXmlPedidoCancelamentoNfseNacional', () => {
  it('deve gerar pedido de evento e101101 no layout nacional', () => {
    const xml = new GeradorXmlPedidoCancelamentoNfseNacional().gerar({
      empresa: criarEmpresa(),
      nota: criarNotaEmitida(),
      codigoMotivo: '1',
      motivo: 'Erro na emissao em ambiente de homologacao',
      dataHoraEvento: new Date('2026-06-17T15:30:45.000Z'),
    });

    expect(xml).toContain(
      '<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">',
    );
    expect(xml).toContain(
      `<infPedReg Id="PRE${chaveAcesso}101101">`,
    );
    expect(xml).toContain('<tpAmb>2</tpAmb>');
    expect(xml).toContain('<verAplic>api-nota-fiscal-1.0</verAplic>');
    expect(xml).toContain('<CNPJAutor>12345678000199</CNPJAutor>');
    expect(xml).toContain(`<chNFSe>${chaveAcesso}</chNFSe>`);
    expect(xml).toContain('<e101101>');
    expect(xml).toContain('<xDesc>Cancelamento de NFS-e</xDesc>');
    expect(xml).toContain('<cMotivo>1</cMotivo>');
    expect(xml).toContain(
      '<xMotivo>Erro na emissao em ambiente de homologacao</xMotivo>',
    );
  });

  it('deve validar chave, codigo e motivo antes de gerar', () => {
    const gerador = new GeradorXmlPedidoCancelamentoNfseNacional();

    expect(() =>
      gerador.gerar({
        empresa: criarEmpresa(),
        nota: criarNotaEmitida({ chaveAcesso: '123' }),
        codigoMotivo: '1',
        motivo: 'Erro na emissao em ambiente de homologacao',
      }),
    ).toThrow('Chave de acesso da NFS-e deve conter 50 digitos.');

    expect(() =>
      gerador.gerar({
        empresa: criarEmpresa(),
        nota: criarNotaEmitida(),
        codigoMotivo: '9',
        motivo: 'curto',
      }),
    ).toThrow('Motivo do cancelamento deve conter entre 15 e 255 caracteres.');
  });
});

function criarEmpresa(): Empresa {
  return new Empresa({
    id: 'empresa-1',
    razaoSocial: 'Empresa Teste Ltda',
    cnpj: '12345678000199',
    regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
    cidade: 'Campinas',
    uf: 'SP',
  });
}

function criarNotaEmitida(props?: { chaveAcesso?: string }): NotaServico {
  return new NotaServico({
    id: 'nota-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 100,
    aliquotaIss: 5,
    descricao: 'Consultoria',
    status: StatusNota.EMITIDA,
    ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
    chaveAcesso: props?.chaveAcesso ?? chaveAcesso,
    dataEmissao: new Date('2026-06-16T10:00:00.000Z'),
  });
}
