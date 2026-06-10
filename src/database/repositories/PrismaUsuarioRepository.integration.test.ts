import { randomInt, randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { Empresa, RegimeTributario } from '../../entities/Empresa';
import { PerfilUsuario, Usuario } from '../../entities/Usuario';
import { PrismaEmpresaRepository } from './PrismaEmpresaRepository';
import { PrismaUsuarioRepository } from './PrismaUsuarioRepository';
import { prisma } from '../prisma.client';

const empresaIdsCriados: string[] = [];

function criarCnpjUnico(): string {
  return randomInt(10_000_000_000_000, 100_000_000_000_000).toString();
}

describe('PrismaUsuarioRepository', () => {
  const empresaRepository = new PrismaEmpresaRepository();
  const usuarioRepository = new PrismaUsuarioRepository();

  afterAll(async () => {
    if (empresaIdsCriados.length > 0) {
      await prisma.usuario.deleteMany({
        where: {
          empresaId: { in: empresaIdsCriados },
        },
      });
      await prisma.empresa.deleteMany({
        where: {
          id: { in: empresaIdsCriados },
        },
      });
    }

    await prisma.$disconnect();
  });

  it('deve criar e buscar um usuário por e-mail e proprietário por Empresa', async () => {
    const empresa = await empresaRepository.salvar(
      new Empresa({
        razaoSocial: 'Empresa Repository Usuario Ltda',
        cnpj: criarCnpjUnico(),
        regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
        cidade: 'Campinas',
        uf: 'SP',
      }),
    );
    empresaIdsCriados.push(empresa.id!);

    const usuario = await usuarioRepository.salvar(
      new Usuario({
        empresaId: empresa.id!,
        nome: 'Maria Silva',
        email: `maria.${randomUUID()}@exemplo.com`,
        senhaHash: 'hash-seguro',
        perfil: PerfilUsuario.DONO,
      }),
    );

    expect(usuario.id).toBeDefined();
    await expect(usuarioRepository.buscarPorId(usuario.id!)).resolves.toEqual(
      usuario,
    );
    await expect(usuarioRepository.buscarPorEmail(usuario.email)).resolves.toEqual(
      usuario,
    );
    await expect(
      usuarioRepository.buscarDonoPorEmpresaId(empresa.id!),
    ).resolves.toEqual(usuario);
  });

  it('deve retornar null quando não encontrar usuário', async () => {
    await expect(
      usuarioRepository.buscarPorId(randomUUID()),
    ).resolves.toBeNull();
    await expect(
      usuarioRepository.buscarPorEmail('inexistente@exemplo.com'),
    ).resolves.toBeNull();
    await expect(
      usuarioRepository.buscarDonoPorEmpresaId('empresa-inexistente'),
    ).resolves.toBeNull();
  });
});
