import { describe, expect, it } from 'vitest';

import { Empresa, RegimeTributario } from './Empresa';

function dadosBase() {
  return {
    razaoSocial: 'Empresa Teste Ltda',
    cnpj: '12345678000190',
    regimeTributario: RegimeTributario.MEI,
    cidade: 'Campinas',
    uf: 'SP',
  };
}

describe('Contato e endereco da Empresa', () => {
  it('deve normalizar contato e endereco opcionais', () => {
    const empresa = new Empresa({
      ...dadosBase(),
      email: ' CONTATO@EXEMPLO.COM ',
      cep: '12.345-678',
    });

    empresa.alterarDadosCadastrais({
      razaoSocial: 'Empresa Atualizada Ltda',
      email: ' NOVO@EXEMPLO.COM ',
      telefone: '(41) 99999-9999',
      cep: '80.000-000',
      endereco: 'Rua Atualizada',
      numero: '100',
      bairro: 'Centro',
      cidade: 'Curitiba',
      uf: 'PR',
    });

    expect(empresa.email).toBe('novo@exemplo.com');
    expect(empresa.telefone).toBe('(41) 99999-9999');
    expect(empresa.cep).toBe('80000000');
    expect(empresa.endereco).toBe('Rua Atualizada');
    expect(empresa.numero).toBe('100');
    expect(empresa.bairro).toBe('Centro');
  });

  it('deve rejeitar e-mail e CEP invalidos', () => {
    expect(
      () =>
        new Empresa({
          ...dadosBase(),
          email: 'email-invalido',
        }),
    ).toThrow('E-mail invalido.');

    expect(
      () =>
        new Empresa({
          ...dadosBase(),
          cep: '123',
        }),
    ).toThrow('CEP deve conter 8 digitos.');
  });
});
