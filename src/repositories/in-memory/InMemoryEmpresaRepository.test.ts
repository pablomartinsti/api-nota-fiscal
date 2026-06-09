import { describe, expect, it } from 'vitest';

import { Empresa, RegimeTributario } from '../../entities/Empresa';
import { InMemoryEmpresaRepository } from './InMemoryEmpresaRepository';

const criarEmpresa = (id: string | undefined, cnpj: string) =>
  new Empresa({
    id,
    razaoSocial: 'Empresa Teste Ltda',
    cnpj,
    regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
    cidade: 'Campinas',
    uf: 'SP',
  });

describe('InMemoryEmpresaRepository', () => {
  it('deve salvar e buscar uma empresa por ID', async () => {
    const repository = new InMemoryEmpresaRepository();
    const empresa = criarEmpresa('empresa-1', '12345678000190');

    await repository.salvar(empresa);

    await expect(repository.buscarPorId('empresa-1')).resolves.toBe(empresa);
  });

  it('deve buscar uma empresa por CNPJ', async () => {
    const repository = new InMemoryEmpresaRepository();
    const empresa = criarEmpresa('empresa-1', '12345678000190');

    await repository.salvar(empresa);

    await expect(repository.buscarPorCnpj('12345678000190')).resolves.toBe(
      empresa,
    );
  });

  it('deve retornar null ao buscar uma empresa inexistente', async () => {
    const repository = new InMemoryEmpresaRepository();

    await expect(repository.buscarPorId('inexistente')).resolves.toBeNull();
    await expect(
      repository.buscarPorCnpj('99999999000199'),
    ).resolves.toBeNull();
  });

  it('deve atualizar uma empresa existente sem duplicá-la', async () => {
    const repository = new InMemoryEmpresaRepository();
    const empresa = criarEmpresa('empresa-1', '12345678000190');

    await repository.salvar(empresa);
    empresa.alterarDadosCadastrais({
      razaoSocial: 'Empresa Atualizada Ltda',
      cidade: 'Curitiba',
      uf: 'PR',
    });
    await repository.salvar(empresa);

    const empresaSalva = await repository.buscarPorId('empresa-1');

    expect(empresaSalva?.razaoSocial).toBe('Empresa Atualizada Ltda');
    expect(repository.items).toHaveLength(1);
  });

  it('deve salvar empresas diferentes sem ID', async () => {
    const repository = new InMemoryEmpresaRepository();
    const primeiraEmpresa = criarEmpresa(undefined, '12345678000190');
    const segundaEmpresa = criarEmpresa(undefined, '98765432000199');

    await repository.salvar(primeiraEmpresa);
    await repository.salvar(segundaEmpresa);

    expect(repository.items).toHaveLength(2);
  });
});
