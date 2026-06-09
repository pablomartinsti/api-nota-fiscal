import { describe, expect, it } from 'vitest';

import { Servico } from './Servico';

const criarServico = () =>
  new Servico({
    empresaId: 'empresa-1',
    descricao: 'Consultoria',
    codigoServico: '01.01',
    aliquotaIss: 5,
    valorPadrao: 150,
  });

describe('Servico', () => {
  it('deve criar um serviço válido e ativo por padrão', () => {
    const servico = criarServico();

    expect(servico.empresaId).toBe('empresa-1');
    expect(servico.descricao).toBe('Consultoria');
    expect(servico.ativo).toBe(true);
    expect(servico.createdAt).toBeInstanceOf(Date);
    expect(servico.updatedAt).toBeInstanceOf(Date);
  });

  it('deve normalizar empresa, descrição e código do serviço', () => {
    const servico = new Servico({
      empresaId: ' empresa-1 ',
      descricao: ' Consultoria ',
      codigoServico: ' 01.01 ',
      aliquotaIss: 5,
    });

    expect(servico.empresaId).toBe('empresa-1');
    expect(servico.descricao).toBe('Consultoria');
    expect(servico.codigoServico).toBe('01.01');
  });

  it('deve permitir alíquota zero e valor padrão ausente', () => {
    const servico = new Servico({
      empresaId: 'empresa-1',
      descricao: 'Serviço isento',
      codigoServico: '01.02',
      aliquotaIss: 0,
    });

    expect(servico.aliquotaIss).toBe(0);
    expect(servico.valorPadrao).toBeUndefined();
  });

  it('deve rejeitar empresa vazia', () => {
    expect(
      () =>
        new Servico({
          empresaId: ' ',
          descricao: 'Consultoria',
          codigoServico: '01.01',
          aliquotaIss: 5,
        }),
    ).toThrow('Empresa é obrigatória.');
  });

  it('deve rejeitar descrição vazia', () => {
    expect(
      () =>
        new Servico({
          empresaId: 'empresa-1',
          descricao: ' ',
          codigoServico: '01.01',
          aliquotaIss: 5,
        }),
    ).toThrow('Descrição é obrigatória.');
  });

  it('deve rejeitar código do serviço vazio', () => {
    expect(
      () =>
        new Servico({
          empresaId: 'empresa-1',
          descricao: 'Consultoria',
          codigoServico: ' ',
          aliquotaIss: 5,
        }),
    ).toThrow('Código do serviço é obrigatório.');
  });

  it('deve rejeitar alíquota de ISS menor que zero', () => {
    expect(
      () =>
        new Servico({
          empresaId: 'empresa-1',
          descricao: 'Consultoria',
          codigoServico: '01.01',
          aliquotaIss: -1,
        }),
    ).toThrow('Alíquota de ISS deve estar entre 0 e 100.');
  });

  it('deve rejeitar alíquota de ISS maior que cem', () => {
    expect(
      () =>
        new Servico({
          empresaId: 'empresa-1',
          descricao: 'Consultoria',
          codigoServico: '01.01',
          aliquotaIss: 101,
        }),
    ).toThrow('Alíquota de ISS deve estar entre 0 e 100.');
  });

  it('deve rejeitar alíquota de ISS não finita', () => {
    expect(
      () =>
        new Servico({
          empresaId: 'empresa-1',
          descricao: 'Consultoria',
          codigoServico: '01.01',
          aliquotaIss: Number.NaN,
        }),
    ).toThrow('Alíquota de ISS deve ser um número válido.');
  });

  it('deve rejeitar valor padrão igual ou menor que zero', () => {
    expect(
      () =>
        new Servico({
          empresaId: 'empresa-1',
          descricao: 'Consultoria',
          codigoServico: '01.01',
          aliquotaIss: 5,
          valorPadrao: 0,
        }),
    ).toThrow('Valor padrão deve ser maior que zero.');
  });

  it('deve rejeitar valor padrão não finito', () => {
    expect(
      () =>
        new Servico({
          empresaId: 'empresa-1',
          descricao: 'Consultoria',
          codigoServico: '01.01',
          aliquotaIss: 5,
          valorPadrao: Number.POSITIVE_INFINITY,
        }),
    ).toThrow('Valor padrão deve ser um número válido.');
  });

  it('deve alterar dados, alíquota e valor padrão', () => {
    const servico = criarServico();

    servico.alterarDados({
      descricao: 'Consultoria técnica',
      codigoServico: '01.02',
      codigoTributacaoMunicipal: '1001',
    });
    servico.alterarAliquotaIss(2.5);
    servico.alterarValorPadrao(250);

    expect(servico.descricao).toBe('Consultoria técnica');
    expect(servico.codigoServico).toBe('01.02');
    expect(servico.codigoTributacaoMunicipal).toBe('1001');
    expect(servico.aliquotaIss).toBe(2.5);
    expect(servico.valorPadrao).toBe(250);
  });

  it('deve permitir remover o valor padrão', () => {
    const servico = criarServico();

    servico.alterarValorPadrao(undefined);

    expect(servico.valorPadrao).toBeUndefined();
  });

  it('deve manter empresaId após alterações', () => {
    const servico = criarServico();
    const empresaIdOriginal = servico.empresaId;

    servico.alterarDados({
      descricao: 'Consultoria atualizada',
      codigoServico: '01.03',
    });
    servico.alterarAliquotaIss(3);
    servico.alterarValorPadrao(300);

    expect(servico.empresaId).toBe(empresaIdOriginal);
  });

  it('deve ativar e desativar o serviço', () => {
    const servico = criarServico();

    servico.desativar();
    expect(servico.ativo).toBe(false);

    servico.ativar();
    expect(servico.ativo).toBe(true);
  });
});
