import { describe, expect, it } from 'vitest';

import { Empresa, RegimeTributario } from './Empresa';

const criarEmpresa = () =>
  new Empresa({
    razaoSocial: 'Empresa Teste Ltda',
    cnpj: '12345678000190',
    regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
    cidade: 'Campinas',
    uf: 'SP',
  });

describe('Empresa', () => {
  it('deve criar uma empresa válida e ativa por padrão', () => {
    const empresa = criarEmpresa();

    expect(empresa.razaoSocial).toBe('Empresa Teste Ltda');
    expect(empresa.ativo).toBe(true);
    expect(empresa.createdAt).toBeInstanceOf(Date);
    expect(empresa.updatedAt).toBeInstanceOf(Date);
  });

  it('deve normalizar razão social, CNPJ, cidade e UF', () => {
    const empresa = new Empresa({
      razaoSocial: ' Empresa Teste Ltda ',
      cnpj: '12.345.678/0001-90',
      regimeTributario: RegimeTributario.MEI,
      cidade: ' Campinas ',
      uf: 'sp',
    });

    expect(empresa.razaoSocial).toBe('Empresa Teste Ltda');
    expect(empresa.cnpj).toBe('12345678000190');
    expect(empresa.cidade).toBe('Campinas');
    expect(empresa.uf).toBe('SP');
  });

  it('deve rejeitar razão social vazia', () => {
    expect(
      () =>
        new Empresa({
          razaoSocial: ' ',
          cnpj: '12345678000190',
          regimeTributario: RegimeTributario.MEI,
          cidade: 'Campinas',
          uf: 'SP',
        }),
    ).toThrow('Razão social é obrigatória.');
  });

  it('deve rejeitar CNPJ sem 14 dígitos', () => {
    expect(
      () =>
        new Empresa({
          razaoSocial: 'Empresa Teste',
          cnpj: '123',
          regimeTributario: RegimeTributario.MEI,
          cidade: 'Campinas',
          uf: 'SP',
        }),
    ).toThrow('CNPJ deve conter 14 dígitos.');
  });

  it('deve rejeitar cidade vazia', () => {
    expect(
      () =>
        new Empresa({
          razaoSocial: 'Empresa Teste',
          cnpj: '12345678000190',
          regimeTributario: RegimeTributario.MEI,
          cidade: ' ',
          uf: 'SP',
        }),
    ).toThrow('Cidade é obrigatória.');
  });

  it('deve rejeitar UF inválida', () => {
    expect(
      () =>
        new Empresa({
          razaoSocial: 'Empresa Teste',
          cnpj: '12345678000190',
          regimeTributario: RegimeTributario.MEI,
          cidade: 'Campinas',
          uf: 'São Paulo',
        }),
    ).toThrow('UF deve conter duas letras.');
  });

  it('deve rejeitar regime tributário inválido', () => {
    expect(
      () =>
        new Empresa({
          razaoSocial: 'Empresa Teste',
          cnpj: '12345678000190',
          regimeTributario: 'INVALIDO' as RegimeTributario,
          cidade: 'Campinas',
          uf: 'SP',
        }),
    ).toThrow('Regime tributário inválido.');
  });

  it('deve alterar dados cadastrais sem alterar o CNPJ', () => {
    const empresa = criarEmpresa();
    const cnpjOriginal = empresa.cnpj;

    empresa.alterarDadosCadastrais({
      razaoSocial: 'Nova Razão Social',
      nomeFantasia: 'Novo Nome',
      inscricaoMunicipal: '12345',
      cidade: 'Curitiba',
      uf: 'pr',
    });

    expect(empresa.razaoSocial).toBe('Nova Razão Social');
    expect(empresa.nomeFantasia).toBe('Novo Nome');
    expect(empresa.inscricaoMunicipal).toBe('12345');
    expect(empresa.cidade).toBe('Curitiba');
    expect(empresa.uf).toBe('PR');
    expect(empresa.cnpj).toBe(cnpjOriginal);
  });

  it('deve alterar o regime tributário', () => {
    const empresa = criarEmpresa();

    empresa.alterarRegimeTributario(RegimeTributario.LUCRO_PRESUMIDO);

    expect(empresa.regimeTributario).toBe(RegimeTributario.LUCRO_PRESUMIDO);
  });

  it('deve ativar e desativar a empresa', () => {
    const empresa = criarEmpresa();

    empresa.desativar();
    expect(empresa.ativo).toBe(false);

    empresa.ativar();
    expect(empresa.ativo).toBe(true);
  });
});
