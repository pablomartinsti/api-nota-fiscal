import { randomInt, randomUUID } from 'node:crypto';

import bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { prisma } from '../database/prisma.client';

const cnpjsUtilizados: string[] = [];
const emailsUtilizados: string[] = [];

function criarCnpjUnico(): string {
  const cnpj = randomInt(
    10_000_000_000_000,
    100_000_000_000_000,
  ).toString();
  cnpjsUtilizados.push(cnpj);

  return cnpj;
}

function criarEmailUnico(): string {
  const email = `${randomUUID()}@exemplo.com`;
  emailsUtilizados.push(email);

  return email;
}

function dadosOnboarding(cnpj = criarCnpjUnico(), email = criarEmailUnico()) {
  return {
    empresa: {
      razaoSocial: 'Empresa Onboarding Ltda',
      nomeFantasia: 'Empresa Onboarding',
      cnpj,
      inscricaoMunicipal: '123456',
      regimeTributario: 'SIMPLES_NACIONAL',
      cidade: 'Campinas',
      uf: 'SP',
    },
    proprietario: {
      nome: 'Maria Silva',
      email,
      senha: 'senha-segura',
      perfil: 'OPERADOR',
    },
  };
}

describe('POST /onboarding', () => {
  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: { email: { in: emailsUtilizados } },
    });
    await prisma.empresa.deleteMany({
      where: { cnpj: { in: cnpjsUtilizados } },
    });
    await prisma.$disconnect();
  });

  it('deve criar Empresa e proprietario juntos e permitir autenticacao', async () => {
    const dados = dadosOnboarding();
    const response = await request(app).post('/onboarding').send(dados);

    expect(response.status).toBe(201);
    expect(response.body.empresa).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        razaoSocial: dados.empresa.razaoSocial,
        cnpj: dados.empresa.cnpj,
        ativo: true,
      }),
    );
    expect(response.body.proprietario).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        empresaId: response.body.empresa.id,
        nome: dados.proprietario.nome,
        email: dados.proprietario.email,
        perfil: 'DONO',
        ativo: true,
      }),
    );
    expect(response.body.proprietario).not.toHaveProperty('senha');
    expect(response.body.proprietario).not.toHaveProperty('senhaHash');

    const proprietarioPersistido = await prisma.usuario.findUnique({
      where: { email: dados.proprietario.email },
    });

    expect(proprietarioPersistido?.senhaHash).not.toBe(
      dados.proprietario.senha,
    );
    await expect(
      bcrypt.compare(
        dados.proprietario.senha,
        proprietarioPersistido!.senhaHash,
      ),
    ).resolves.toBe(true);

    const login = await request(app).post('/sessoes').send({
      email: dados.proprietario.email,
      senha: dados.proprietario.senha,
    });

    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
  });

  it('deve rejeitar CNPJ duplicado sem criar outro proprietario', async () => {
    const cnpj = criarCnpjUnico();
    const primeiro = dadosOnboarding(cnpj);
    const segundo = dadosOnboarding(cnpj);

    await request(app).post('/onboarding').send(primeiro);
    const response = await request(app).post('/onboarding').send(segundo);
    const proprietarioNaoCriado = await prisma.usuario.findUnique({
      where: { email: segundo.proprietario.email },
    });

    expect(response.status).toBe(409);
    expect(proprietarioNaoCriado).toBeNull();
  });

  it('deve desfazer a Empresa quando o e-mail estiver duplicado', async () => {
    const email = criarEmailUnico();
    const primeiro = dadosOnboarding(criarCnpjUnico(), email);
    const segundo = dadosOnboarding(criarCnpjUnico(), email);

    await request(app).post('/onboarding').send(primeiro);
    const response = await request(app).post('/onboarding').send(segundo);
    const empresaDesfeita = await prisma.empresa.findUnique({
      where: { cnpj: segundo.empresa.cnpj },
    });

    expect(response.status).toBe(409);
    expect(empresaDesfeita).toBeNull();
  });

  it('deve rejeitar dados invalidos e remover as rotas publicas antigas', async () => {
    const dados = dadosOnboarding();
    const invalido = await request(app)
      .post('/onboarding')
      .send({
        ...dados,
        proprietario: {
          nome: '',
          email: 'email-invalido',
          senha: 'curta',
        },
      });
    const cadastroEmpresaAntigo = await request(app)
      .post('/empresas')
      .send(dados.empresa);
    const cadastroDonoAntigo = await request(app)
      .post(`/empresas/${randomUUID()}/usuarios/dono`)
      .send(dados.proprietario);

    expect(invalido.status).toBe(400);
    expect(cadastroEmpresaAntigo.status).toBe(401);
    expect(cadastroDonoAntigo.status).toBe(401);
  });
});
