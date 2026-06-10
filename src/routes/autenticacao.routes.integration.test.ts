import { randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { PrismaUsuarioRepository } from '../database/repositories/PrismaUsuarioRepository';
import { prisma } from '../database/prisma.client';
import { Empresa, RegimeTributario } from '../entities/Empresa';
import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { BcryptGeradorHash } from '../security/BcryptGeradorHash';

const empresaIdsCriados: string[] = [];
const empresaRepository = new PrismaEmpresaRepository();
const usuarioRepository = new PrismaUsuarioRepository();
const geradorHash = new BcryptGeradorHash(4);

function criarCnpjUnico(): string {
  return randomInt(10_000_000_000_000, 100_000_000_000_000).toString();
}

async function criarUsuarioAutenticavel() {
  const empresa = await empresaRepository.salvar(
    new Empresa({
      razaoSocial: 'Empresa Autenticação HTTP Ltda',
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
      email: `${randomUUID()}@exemplo.com`,
      senhaHash: await geradorHash.gerar('senha-segura'),
      perfil: PerfilUsuario.DONO,
    }),
  );

  return { empresa, usuario };
}

describe('Autenticação HTTP', () => {
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

  it('deve autenticar e retornar token sem expor senha', async () => {
    const { empresa, usuario } = await criarUsuarioAutenticavel();

    const response = await request(app).post('/sessoes').send({
      email: usuario.email,
      senha: 'senha-segura',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      token: expect.any(String),
      usuario: {
        id: usuario.id,
        empresaId: empresa.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ativo: true,
      },
    });
    expect(response.body.usuario).not.toHaveProperty('senha');
    expect(response.body.usuario).not.toHaveProperty('senhaHash');
  });

  it('deve rejeitar credenciais inválidas com mensagem genérica', async () => {
    const { usuario } = await criarUsuarioAutenticavel();

    const senhaIncorreta = await request(app).post('/sessoes').send({
      email: usuario.email,
      senha: 'senha-incorreta',
    });
    const emailInexistente = await request(app).post('/sessoes').send({
      email: `${randomUUID()}@exemplo.com`,
      senha: 'senha-segura',
    });

    expect(senhaIncorreta.status).toBe(401);
    expect(emailInexistente.status).toBe(401);
    expect(senhaIncorreta.body).toEqual({
      message: 'E-mail ou senha inválidos.',
    });
    expect(emailInexistente.body).toEqual(senhaIncorreta.body);
  });

  it('deve retornar o usuário e a Empresa autenticados em GET /me', async () => {
    const { empresa, usuario } = await criarUsuarioAutenticavel();
    const login = await request(app).post('/sessoes').send({
      email: usuario.email,
      senha: 'senha-segura',
    });

    const response = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      usuario: {
        id: usuario.id,
        empresaId: empresa.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ativo: true,
      },
      empresa: {
        id: empresa.id,
        razaoSocial: empresa.razaoSocial,
        nomeFantasia: empresa.nomeFantasia,
        cnpj: empresa.cnpj,
        inscricaoMunicipal: empresa.inscricaoMunicipal,
        regimeTributario: empresa.regimeTributario,
        cidade: empresa.cidade,
        uf: empresa.uf,
        ativo: true,
      },
    });
  });

  it('deve rejeitar token ausente ou inválido', async () => {
    const semToken = await request(app).get('/me');
    const tokenInvalido = await request(app)
      .get('/me')
      .set('Authorization', 'Bearer token-invalido');

    expect(semToken.status).toBe(401);
    expect(tokenInvalido.status).toBe(401);
    expect(semToken.body).toEqual({
      message: 'Autenticação inválida.',
    });
    expect(tokenInvalido.body).toEqual(semToken.body);
  });

  it('deve rejeitar token após usuário ou Empresa ser desativada', async () => {
    const primeiroContexto = await criarUsuarioAutenticavel();
    const segundoContexto = await criarUsuarioAutenticavel();
    const primeiroLogin = await request(app).post('/sessoes').send({
      email: primeiroContexto.usuario.email,
      senha: 'senha-segura',
    });
    const segundoLogin = await request(app).post('/sessoes').send({
      email: segundoContexto.usuario.email,
      senha: 'senha-segura',
    });

    primeiroContexto.usuario.desativar();
    segundoContexto.empresa.desativar();
    await usuarioRepository.salvar(primeiroContexto.usuario);
    await empresaRepository.salvar(segundoContexto.empresa);

    const usuarioInativo = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${primeiroLogin.body.token}`);
    const empresaInativa = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${segundoLogin.body.token}`);

    expect(usuarioInativo.status).toBe(401);
    expect(empresaInativa.status).toBe(401);
  });
});
