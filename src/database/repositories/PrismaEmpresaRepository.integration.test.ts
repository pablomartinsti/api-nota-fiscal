import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { Empresa, RegimeTributario } from '../../entities/Empresa';
import { prisma } from '../prisma.client';
import { PrismaEmpresaRepository } from './PrismaEmpresaRepository';

const idsCriados: string[] = [];

describe('PrismaEmpresaRepository', () => {
  const repository = new PrismaEmpresaRepository();

  afterAll(async () => {
    if (idsCriados.length > 0) {
      await prisma.empresa.deleteMany({
        where: {
          id: { in: idsCriados },
        },
      });
    }

    await prisma.$disconnect();
  });

  it('deve criar e buscar uma Empresa por ID e CNPJ', async () => {
    const sufixo = randomUUID().replace(/\D/g, '').slice(0, 8).padEnd(8, '0');
    const cnpj = `123456${sufixo}`;
    const empresa = new Empresa({
      razaoSocial: 'Empresa Integração Ltda',
      cnpj,
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      cidade: 'Campinas',
      uf: 'SP',
    });

    const empresaPersistida = await repository.salvar(empresa);
    idsCriados.push(empresaPersistida.id!);

    expect(empresaPersistida.id).toBeDefined();
    await expect(repository.buscarPorId(empresaPersistida.id!)).resolves.toEqual(
      empresaPersistida,
    );
    await expect(repository.buscarPorCnpj(cnpj)).resolves.toEqual(
      empresaPersistida,
    );
  });

  it('deve atualizar uma Empresa existente sem duplicá-la', async () => {
    const sufixo = randomUUID().replace(/\D/g, '').slice(0, 8).padEnd(8, '0');
    const empresa = new Empresa({
      razaoSocial: 'Empresa Antes da Atualização',
      cnpj: `987654${sufixo}`,
      regimeTributario: RegimeTributario.MEI,
      cidade: 'Campinas',
      uf: 'SP',
    });

    const empresaPersistida = await repository.salvar(empresa);
    idsCriados.push(empresaPersistida.id!);

    empresaPersistida.alterarDadosCadastrais({
      razaoSocial: 'Empresa Atualizada',
      cidade: 'Curitiba',
      uf: 'PR',
    });

    const empresaAtualizada = await repository.salvar(empresaPersistida);

    expect(empresaAtualizada.id).toBe(empresaPersistida.id);
    expect(empresaAtualizada.razaoSocial).toBe('Empresa Atualizada');
    expect(empresaAtualizada.cidade).toBe('Curitiba');
  });

  it('deve retornar null ao buscar Empresa inexistente', async () => {
    await expect(repository.buscarPorId(randomUUID())).resolves.toBeNull();
    await expect(
      repository.buscarPorCnpj('00000000000000'),
    ).resolves.toBeNull();
  });
});
