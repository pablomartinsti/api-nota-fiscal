import { randomInt } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { prisma } from '../database/prisma.client';

const cnpjsCriados: string[] = [];

function criarCnpjUnico(): string {
  return randomInt(10_000_000_000_000, 100_000_000_000_000).toString();
}

function criarDadosEmpresa(cnpj: string) {
  return {
    razaoSocial: 'Empresa HTTP Ltda',
    nomeFantasia: 'Empresa HTTP',
    cnpj,
    inscricaoMunicipal: '123456',
    regimeTributario: 'SIMPLES_NACIONAL',
    cidade: 'Campinas',
    uf: 'SP',
  };
}

describe('POST /empresas', () => {
  afterAll(async () => {
    if (cnpjsCriados.length > 0) {
      await prisma.empresa.deleteMany({
        where: {
          cnpj: { in: cnpjsCriados },
        },
      });
    }

    await prisma.$disconnect();
  });

  it('deve cadastrar uma Empresa válida', async () => {
    const cnpj = criarCnpjUnico();
    cnpjsCriados.push(cnpj);

    const response = await request(app)
      .post('/empresas')
      .send(criarDadosEmpresa(cnpj));

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        razaoSocial: 'Empresa HTTP Ltda',
        nomeFantasia: 'Empresa HTTP',
        cnpj,
        inscricaoMunicipal: '123456',
        regimeTributario: 'SIMPLES_NACIONAL',
        cidade: 'Campinas',
        uf: 'SP',
        ativo: true,
      }),
    );
  });

  it('deve retornar 400 quando os dados forem inválidos', async () => {
    const response = await request(app).post('/empresas').send({
      razaoSocial: '',
      cnpj: '123',
      regimeTributario: 'REGIME_INEXISTENTE',
      cidade: '',
      uf: 'S',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'Dados inválidos.',
    });
  });

  it('deve retornar 409 quando o CNPJ já estiver cadastrado', async () => {
    const cnpj = criarCnpjUnico();
    cnpjsCriados.push(cnpj);
    const dadosEmpresa = criarDadosEmpresa(cnpj);

    await request(app).post('/empresas').send(dadosEmpresa);
    const response = await request(app).post('/empresas').send(dadosEmpresa);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: 'Já existe uma empresa cadastrada com este CNPJ.',
    });
  });
});
