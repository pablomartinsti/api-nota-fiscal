import { describe, expect, it } from 'vitest';

import { Cliente } from './Cliente';

const criarCliente = () =>
  new Cliente({
    empresaId: 'empresa-1',
    nomeRazaoSocial: 'Cliente Teste Ltda',
    cpfCnpj: '12345678000190',
    email: 'cliente@exemplo.com',
    cep: '12345678',
    cidade: 'Campinas',
    uf: 'SP',
  });

describe('Cliente', () => {
  it('deve criar um cliente válido e ativo por padrão', () => {
    const cliente = criarCliente();

    expect(cliente.empresaId).toBe('empresa-1');
    expect(cliente.nomeRazaoSocial).toBe('Cliente Teste Ltda');
    expect(cliente.ativo).toBe(true);
    expect(cliente.createdAt).toBeInstanceOf(Date);
    expect(cliente.updatedAt).toBeInstanceOf(Date);
  });

  it('deve normalizar empresa, nome, CPF/CNPJ, e-mail, CEP, cidade e UF', () => {
    const cliente = new Cliente({
      empresaId: ' empresa-1 ',
      nomeRazaoSocial: ' Cliente Teste Ltda ',
      cpfCnpj: '12.345.678/0001-90',
      email: ' CLIENTE@EXEMPLO.COM ',
      cep: '12345-678',
      cidade: ' Campinas ',
      uf: 'sp',
    });

    expect(cliente.empresaId).toBe('empresa-1');
    expect(cliente.nomeRazaoSocial).toBe('Cliente Teste Ltda');
    expect(cliente.cpfCnpj).toBe('12345678000190');
    expect(cliente.email).toBe('cliente@exemplo.com');
    expect(cliente.cep).toBe('12345678');
    expect(cliente.cidade).toBe('Campinas');
    expect(cliente.uf).toBe('SP');
  });

  it('deve permitir e-mail e CEP ausentes', () => {
    const cliente = new Cliente({
      empresaId: 'empresa-1',
      nomeRazaoSocial: 'Cliente Teste',
      cpfCnpj: '12345678901',
      cidade: 'Campinas',
      uf: 'SP',
    });

    expect(cliente.email).toBeUndefined();
    expect(cliente.cep).toBeUndefined();
  });

  it('deve rejeitar empresa vazia', () => {
    expect(
      () =>
        new Cliente({
          empresaId: ' ',
          nomeRazaoSocial: 'Cliente Teste',
          cpfCnpj: '12345678901',
          cidade: 'Campinas',
          uf: 'SP',
        }),
    ).toThrow('Empresa é obrigatória.');
  });

  it('deve rejeitar nome ou razão social vazio', () => {
    expect(
      () =>
        new Cliente({
          empresaId: 'empresa-1',
          nomeRazaoSocial: ' ',
          cpfCnpj: '12345678901',
          cidade: 'Campinas',
          uf: 'SP',
        }),
    ).toThrow('Nome ou razão social é obrigatório.');
  });

  it('deve rejeitar CPF/CNPJ sem 11 ou 14 dígitos', () => {
    expect(
      () =>
        new Cliente({
          empresaId: 'empresa-1',
          nomeRazaoSocial: 'Cliente Teste',
          cpfCnpj: '123',
          cidade: 'Campinas',
          uf: 'SP',
        }),
    ).toThrow('CPF/CNPJ deve conter 11 ou 14 dígitos.');
  });

  it('deve rejeitar e-mail inválido quando informado', () => {
    expect(
      () =>
        new Cliente({
          empresaId: 'empresa-1',
          nomeRazaoSocial: 'Cliente Teste',
          cpfCnpj: '12345678901',
          email: 'email-invalido',
          cidade: 'Campinas',
          uf: 'SP',
        }),
    ).toThrow('E-mail inválido.');
  });

  it('deve rejeitar CEP inválido quando informado', () => {
    expect(
      () =>
        new Cliente({
          empresaId: 'empresa-1',
          nomeRazaoSocial: 'Cliente Teste',
          cpfCnpj: '12345678901',
          cep: 'abc',
          cidade: 'Campinas',
          uf: 'SP',
        }),
    ).toThrow('CEP deve conter 8 dígitos.');
  });

  it('deve rejeitar cidade vazia', () => {
    expect(
      () =>
        new Cliente({
          empresaId: 'empresa-1',
          nomeRazaoSocial: 'Cliente Teste',
          cpfCnpj: '12345678901',
          cidade: ' ',
          uf: 'SP',
        }),
    ).toThrow('Cidade é obrigatória.');
  });

  it('deve rejeitar UF inválida', () => {
    expect(
      () =>
        new Cliente({
          empresaId: 'empresa-1',
          nomeRazaoSocial: 'Cliente Teste',
          cpfCnpj: '12345678901',
          cidade: 'Campinas',
          uf: 'São Paulo',
        }),
    ).toThrow('UF deve conter duas letras.');
  });

  it('deve alterar dados cadastrais, contato e endereço', () => {
    const cliente = criarCliente();

    cliente.alterarDadosCadastrais({
      nomeRazaoSocial: 'Cliente Atualizado Ltda',
      inscricaoMunicipal: '12345',
    });
    cliente.alterarContato({
      email: ' NOVO@EXEMPLO.COM ',
      telefone: '(11) 99999-9999',
    });
    cliente.alterarEndereco({
      cep: '87654-321',
      endereco: 'Rua Teste',
      numero: '100',
      bairro: 'Centro',
      cidade: ' Curitiba ',
      uf: 'pr',
    });

    expect(cliente.nomeRazaoSocial).toBe('Cliente Atualizado Ltda');
    expect(cliente.inscricaoMunicipal).toBe('12345');
    expect(cliente.email).toBe('novo@exemplo.com');
    expect(cliente.telefone).toBe('(11) 99999-9999');
    expect(cliente.cep).toBe('87654321');
    expect(cliente.endereco).toBe('Rua Teste');
    expect(cliente.numero).toBe('100');
    expect(cliente.bairro).toBe('Centro');
    expect(cliente.cidade).toBe('Curitiba');
    expect(cliente.uf).toBe('PR');
  });

  it('deve manter empresaId e CPF/CNPJ após alterações', () => {
    const cliente = criarCliente();
    const empresaIdOriginal = cliente.empresaId;
    const cpfCnpjOriginal = cliente.cpfCnpj;

    cliente.alterarDadosCadastrais({
      nomeRazaoSocial: 'Cliente Atualizado',
    });
    cliente.alterarContato({ email: 'novo@exemplo.com' });
    cliente.alterarEndereco({ cidade: 'Curitiba', uf: 'PR' });

    expect(cliente.empresaId).toBe(empresaIdOriginal);
    expect(cliente.cpfCnpj).toBe(cpfCnpjOriginal);
  });

  it('deve ativar e desativar o cliente', () => {
    const cliente = criarCliente();

    cliente.desativar();
    expect(cliente.ativo).toBe(false);

    cliente.ativar();
    expect(cliente.ativo).toBe(true);
  });
});
