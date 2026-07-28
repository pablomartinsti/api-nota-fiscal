import { describe, expect, it } from 'vitest';

import { AmbienteFiscal } from './NotaServico';
import { ConfiguracaoFiscalEmpresa } from './ConfiguracaoFiscalEmpresa';

describe('ConfiguracaoFiscalEmpresa', () => {
  it('deve criar configuracao fiscal padrao para empresa', () => {
    const configuracao = new ConfiguracaoFiscalEmpresa({
      empresaId: 'empresa-1',
    });

    expect(configuracao.empresaId).toBe('empresa-1');
    expect(configuracao.ambienteFiscalPadrao).toBe(AmbienteFiscal.HOMOLOGACAO);
    expect(configuracao.serieDpsPadrao).toBe('1');
    expect(configuracao.ativo).toBe(true);
    expect(configuracao.createdAt).toBeInstanceOf(Date);
    expect(configuracao.updatedAt).toBeInstanceOf(Date);
  });

  it('deve armazenar certificado A1 por conteudo criptografado', () => {
    const configuracao = new ConfiguracaoFiscalEmpresa({
      empresaId: 'empresa-1',
      ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
      serieDpsPadrao: '10',
      certificadoA1NomeArquivo: ' empresa.pfx ',
      certificadoA1Conteudo: ' base64-criptografado ',
      certificadoA1Senha: ' senha-segura ',
    });

    expect(configuracao.ambienteFiscalPadrao).toBe(AmbienteFiscal.PRODUCAO);
    expect(configuracao.serieDpsPadrao).toBe('10');
    expect(configuracao.certificadoA1NomeArquivo).toBe('empresa.pfx');
    expect(configuracao.certificadoA1Conteudo).toBe('base64-criptografado');
    expect(configuracao.certificadoA1Senha).toBe('senha-segura');
    expect(configuracao.possuiCertificadoA1()).toBe(true);
  });

  it('deve alterar dados fiscais e ativar/desativar configuracao', () => {
    const configuracao = new ConfiguracaoFiscalEmpresa({
      empresaId: 'empresa-1',
    });

    configuracao.alterarDados({
      ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
      serieDpsPadrao: '2',
      certificadoA1NomeArquivo: 'producao.pfx',
      certificadoA1Conteudo: 'novo-base64',
      certificadoA1Senha: 'nova-senha',
    });
    configuracao.desativar();

    expect(configuracao.ambienteFiscalPadrao).toBe(AmbienteFiscal.PRODUCAO);
    expect(configuracao.serieDpsPadrao).toBe('2');
    expect(configuracao.certificadoA1NomeArquivo).toBe('producao.pfx');
    expect(configuracao.certificadoA1Conteudo).toBe('novo-base64');
    expect(configuracao.certificadoA1Senha).toBe('nova-senha');
    expect(configuracao.ativo).toBe(false);

    configuracao.ativar();

    expect(configuracao.ativo).toBe(true);
  });

  it('deve rejeitar dados invalidos', () => {
    expect(
      () =>
        new ConfiguracaoFiscalEmpresa({
          empresaId: ' ',
        }),
    ).toThrow('Empresa e obrigatoria.');

    expect(
      () =>
        new ConfiguracaoFiscalEmpresa({
          empresaId: 'empresa-1',
          ambienteFiscalPadrao: 'INVALIDO' as AmbienteFiscal,
        }),
    ).toThrow('Ambiente fiscal padrao invalido.');

    expect(
      () =>
        new ConfiguracaoFiscalEmpresa({
          empresaId: 'empresa-1',
          serieDpsPadrao: 'ABC',
        }),
    ).toThrow('Serie padrao da DPS deve conter de 1 a 5 digitos.');
  });
});
