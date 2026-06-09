import { randomInt, randomUUID } from 'node:crypto';

import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { prisma } from '../database/prisma.client';
import { Empresa, RegimeTributario } from '../entities/Empresa';

const empresaIdsCriados: string[] = [];
const empresaRepository = new PrismaEmpresaRepository();

function criarCnpjUnico(): string {
  return randomInt(10_000_000_000_000, 100_000_000_000_000).toString();
}

function criarEmailUnico(): string {
  return `${randomUUID()}@exemplo.com`;
}

async function criarEmpresa(ativo = true): Promise<Empresa> {
  const empresa = await empresaRepository.salvar(
    new Empresa({
      razaoSocial: 'Empresa Proprietário HTTP Ltda',
      cnpj: criarCnpjUnico(),
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      cidade: 'Campinas',
      uf: 'SP',
      ativo,
    }),
  );
  empresaIdsCriados.push(empresa.id!);

  return empresa;
}

describe('POST /empresas/:empresaId/usuarios/dono', () => {
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

  it('deve cadastrar o primeiro proprietário sem expor a senha', async () => {
    const empresa = await criarEmpresa();
    const email = criarEmailUnico();

    const response = await request(app)
      .post(`/empresas/${empresa.id}/usuarios/dono`)
      .send({
        nome: 'Maria Silva',
        email,
        senha: 'senha-segura',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        empresaId: empresa.id,
        nome: 'Maria Silva',
        email,
        perfil: 'DONO',
        ativo: true,
      }),
    );
    expect(response.body).not.toHaveProperty('senha');
    expect(response.body).not.toHaveProperty('senhaHash');

    const usuarioPersistido = await prisma.usuario.findUnique({
      where: { email },
    });

    expect(usuarioPersistido?.senhaHash).not.toBe('senha-segura');
    await expect(
      bcrypt.compare('senha-segura', usuarioPersistido!.senhaHash),
    ).resolves.toBe(true);
  });

  it('deve retornar 400 quando os dados forem inválidos', async () => {
    const empresa = await criarEmpresa();

    const responseDadosInvalidos = await request(app)
      .post(`/empresas/${empresa.id}/usuarios/dono`)
      .send({
        nome: '',
        email: 'email-invalido',
        senha: 'curta',
      });
    const responseSenhaVazia = await request(app)
      .post(`/empresas/${empresa.id}/usuarios/dono`)
      .send({
        nome: 'Maria Silva',
        email: criarEmailUnico(),
        senha: '        ',
      });

    expect(responseDadosInvalidos.status).toBe(400);
    expect(responseDadosInvalidos.body).toEqual({
      message: 'Dados inválidos.',
    });
    expect(responseSenhaVazia.status).toBe(400);
    expect(responseSenhaVazia.body).toEqual({
      message: 'Dados inválidos.',
    });
  });

  it('deve retornar 404 quando a Empresa não existir', async () => {
    const response = await request(app)
      .post(`/empresas/${randomUUID()}/usuarios/dono`)
      .send({
        nome: 'Maria Silva',
        email: criarEmailUnico(),
        senha: 'senha-segura',
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: 'Empresa não encontrada.',
    });
  });

  it('deve retornar 409 quando a Empresa estiver inativa', async () => {
    const empresa = await criarEmpresa(false);

    const response = await request(app)
      .post(`/empresas/${empresa.id}/usuarios/dono`)
      .send({
        nome: 'Maria Silva',
        email: criarEmailUnico(),
        senha: 'senha-segura',
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: 'A empresa está inativa.',
    });
  });

  it('deve retornar 409 quando o e-mail já estiver cadastrado', async () => {
    const primeiraEmpresa = await criarEmpresa();
    const segundaEmpresa = await criarEmpresa();
    const email = criarEmailUnico();
    const dados = {
      nome: 'Maria Silva',
      email,
      senha: 'senha-segura',
    };

    await request(app)
      .post(`/empresas/${primeiraEmpresa.id}/usuarios/dono`)
      .send(dados);
    const response = await request(app)
      .post(`/empresas/${segundaEmpresa.id}/usuarios/dono`)
      .send(dados);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: 'Já existe um usuário cadastrado com este e-mail.',
    });
  });

  it('deve retornar 409 quando a Empresa já possuir proprietário', async () => {
    const empresa = await criarEmpresa();

    await request(app)
      .post(`/empresas/${empresa.id}/usuarios/dono`)
      .send({
        nome: 'Maria Silva',
        email: criarEmailUnico(),
        senha: 'senha-segura',
      });
    const response = await request(app)
      .post(`/empresas/${empresa.id}/usuarios/dono`)
      .send({
        nome: 'João Silva',
        email: criarEmailUnico(),
        senha: 'outra-senha',
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: 'A empresa já possui um usuário proprietário.',
    });
  });
});
