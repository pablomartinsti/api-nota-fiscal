import { randomInt, randomUUID } from 'node:crypto';

import bcrypt from 'bcrypt';
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

async function criarContexto(perfil = PerfilUsuario.OPERADOR) {
  const empresa = await empresaRepository.salvar(
    new Empresa({
      razaoSocial: 'Empresa Conta Ltda',
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
      nome: 'Usuario Conta',
      email: `${randomUUID()}@exemplo.com`,
      senhaHash: await geradorHash.gerar('senha-segura'),
      perfil,
    }),
  );
  const login = await request(app).post('/sessoes').send({
    email: usuario.email,
    senha: 'senha-segura',
  });

  return {
    empresa,
    usuario,
    token: login.body.token as string,
  };
}

describe('Gestao da conta autenticada HTTP', () => {
  afterAll(async () => {
    await prisma.usuario.deleteMany({
      where: { empresaId: { in: empresaIdsCriados } },
    });
    await prisma.empresa.deleteMany({
      where: { id: { in: empresaIdsCriados } },
    });
    await prisma.$disconnect();
  });

  it('deve atualizar somente os dados pessoais do usuario autenticado', async () => {
    const contexto = await criarContexto();
    const outroContexto = await criarContexto(PerfilUsuario.DONO);
    const novoEmail = `${randomUUID()}@exemplo.com`;

    const response = await request(app)
      .put('/me')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        nome: 'Usuario Atualizado',
        email: novoEmail,
        usuarioId: outroContexto.usuario.id,
        empresaId: outroContexto.empresa.id,
        perfil: PerfilUsuario.DONO,
        ativo: false,
        senhaHash: 'hash-falsificado',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: contexto.usuario.id,
        empresaId: contexto.empresa.id,
        nome: 'Usuario Atualizado',
        email: novoEmail,
        perfil: PerfilUsuario.OPERADOR,
        ativo: true,
      }),
    );
    expect(response.body).not.toHaveProperty('senha');
    expect(response.body).not.toHaveProperty('senhaHash');

    const usuarioPersistido = await usuarioRepository.buscarPorId(
      contexto.usuario.id!,
    );
    const outroUsuario = await usuarioRepository.buscarPorId(
      outroContexto.usuario.id!,
    );

    expect(usuarioPersistido?.perfil).toBe(PerfilUsuario.OPERADOR);
    expect(usuarioPersistido?.empresaId).toBe(contexto.empresa.id);
    expect(usuarioPersistido?.ativo).toBe(true);
    expect(outroUsuario?.nome).toBe(outroContexto.usuario.nome);
  });

  it('deve rejeitar e-mail ja utilizado por outro usuario', async () => {
    const contexto = await criarContexto(PerfilUsuario.ADMIN);
    const outroContexto = await criarContexto();

    const response = await request(app)
      .put('/me')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        nome: 'Usuario Atualizado',
        email: outroContexto.usuario.email,
      });

    expect(response.status).toBe(409);
  });

  it('deve alterar senha somente quando a senha atual estiver correta', async () => {
    const contexto = await criarContexto(PerfilUsuario.DONO);

    const senhaIncorreta = await request(app)
      .put('/me/senha')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        senhaAtual: 'senha-incorreta',
        novaSenha: 'nova-senha-segura',
      });
    const alteracao = await request(app)
      .put('/me/senha')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        senhaAtual: 'senha-segura',
        novaSenha: 'nova-senha-segura',
      });

    expect(senhaIncorreta.status).toBe(401);
    expect(alteracao.status).toBe(200);
    expect(alteracao.body).not.toHaveProperty('senha');
    expect(alteracao.body).not.toHaveProperty('senhaHash');

    const usuarioPersistido = await prisma.usuario.findUnique({
      where: { id: contexto.usuario.id },
    });

    await expect(
      bcrypt.compare('nova-senha-segura', usuarioPersistido!.senhaHash),
    ).resolves.toBe(true);

    const loginSenhaAntiga = await request(app).post('/sessoes').send({
      email: contexto.usuario.email,
      senha: 'senha-segura',
    });
    const loginSenhaNova = await request(app).post('/sessoes').send({
      email: contexto.usuario.email,
      senha: 'nova-senha-segura',
    });

    expect(loginSenhaAntiga.status).toBe(401);
    expect(loginSenhaNova.status).toBe(200);
  });
});
