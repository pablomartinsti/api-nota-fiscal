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

async function criarEmpresa(): Promise<Empresa> {
  const empresa = await empresaRepository.salvar(
    new Empresa({
      razaoSocial: 'Empresa Gestão Usuários Ltda',
      cnpj: randomInt(10_000_000_000_000, 100_000_000_000_000).toString(),
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      cidade: 'Campinas',
      uf: 'SP',
    }),
  );
  empresaIdsCriados.push(empresa.id!);

  return empresa;
}

async function criarUsuario(
  empresaId: string,
  perfil: PerfilUsuario,
): Promise<Usuario> {
  return usuarioRepository.salvar(
    new Usuario({
      empresaId,
      nome: `Usuário ${perfil}`,
      email: `${randomUUID()}@exemplo.com`,
      senhaHash: await geradorHash.gerar('senha-segura'),
      perfil,
    }),
  );
}

async function autenticar(usuario: Usuario): Promise<string> {
  const response = await request(app).post('/sessoes').send({
    email: usuario.email,
    senha: 'senha-segura',
  });

  return response.body.token;
}

describe('Gestão de usuários HTTP', () => {
  afterAll(async () => {
    if (empresaIdsCriados.length > 0) {
      await prisma.usuario.deleteMany({
        where: { empresaId: { in: empresaIdsCriados } },
      });
      await prisma.empresa.deleteMany({
        where: { id: { in: empresaIdsCriados } },
      });
    }

    await prisma.$disconnect();
  });

  it('deve permitir ao DONO gerenciar usuários da própria Empresa', async () => {
    const empresa = await criarEmpresa();
    const outraEmpresa = await criarEmpresa();
    const dono = await criarUsuario(empresa.id!, PerfilUsuario.DONO);
    const token = await autenticar(dono);

    const cadastro = await request(app)
      .post('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({
        empresaId: outraEmpresa.id,
        nome: 'Novo Admin',
        email: `${randomUUID()}@exemplo.com`,
        senha: 'senha-segura',
        perfil: PerfilUsuario.ADMIN,
      });

    expect(cadastro.status).toBe(201);
    expect(cadastro.body.empresaId).toBe(empresa.id);
    expect(cadastro.body).not.toHaveProperty('senhaHash');

    const listagem = await request(app)
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`);

    expect(listagem.status).toBe(200);
    expect(listagem.body).toHaveLength(2);
    expect(
      listagem.body.every(
        (usuario: { empresaId: string }) => usuario.empresaId === empresa.id,
      ),
    ).toBe(true);

    const perfil = await request(app)
      .patch(`/usuarios/${cadastro.body.id}/perfil`)
      .set('Authorization', `Bearer ${token}`)
      .send({ perfil: PerfilUsuario.OPERADOR });
    const status = await request(app)
      .patch(`/usuarios/${cadastro.body.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ativo: false });

    expect(perfil.status).toBe(200);
    expect(perfil.body.perfil).toBe(PerfilUsuario.OPERADOR);
    expect(status.status).toBe(200);
    expect(status.body.ativo).toBe(false);
  });

  it('deve limitar ADMIN à gestão de OPERADOR', async () => {
    const empresa = await criarEmpresa();
    const admin = await criarUsuario(empresa.id!, PerfilUsuario.ADMIN);
    const operador = await criarUsuario(empresa.id!, PerfilUsuario.OPERADOR);
    const token = await autenticar(admin);

    const cadastroOperador = await request(app)
      .post('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Novo Operador',
        email: `${randomUUID()}@exemplo.com`,
        senha: 'senha-segura',
        perfil: PerfilUsuario.OPERADOR,
      });
    const cadastroAdmin = await request(app)
      .post('/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Novo Admin',
        email: `${randomUUID()}@exemplo.com`,
        senha: 'senha-segura',
        perfil: PerfilUsuario.ADMIN,
      });
    const alterarPerfil = await request(app)
      .patch(`/usuarios/${operador.id}/perfil`)
      .set('Authorization', `Bearer ${token}`)
      .send({ perfil: PerfilUsuario.ADMIN });
    const desativarOperador = await request(app)
      .patch(`/usuarios/${operador.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ativo: false });
    const listagem = await request(app)
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`);

    expect(cadastroOperador.status).toBe(201);
    expect(cadastroAdmin.status).toBe(403);
    expect(alterarPerfil.status).toBe(403);
    expect(desativarOperador.status).toBe(200);
    expect(listagem.status).toBe(200);
    expect(
      listagem.body.every(
        (usuario: { perfil: PerfilUsuario }) =>
          usuario.perfil === PerfilUsuario.OPERADOR,
      ),
    ).toBe(true);
  });

  it('deve impedir OPERADOR e proteger o proprietário', async () => {
    const empresa = await criarEmpresa();
    const dono = await criarUsuario(empresa.id!, PerfilUsuario.DONO);
    const operador = await criarUsuario(empresa.id!, PerfilUsuario.OPERADOR);
    const tokenOperador = await autenticar(operador);
    const tokenDono = await autenticar(dono);

    const listarComoOperador = await request(app)
      .get('/usuarios')
      .set('Authorization', `Bearer ${tokenOperador}`);
    const criarDono = await request(app)
      .post('/usuarios')
      .set('Authorization', `Bearer ${tokenDono}`)
      .send({
        nome: 'Outro Dono',
        email: `${randomUUID()}@exemplo.com`,
        senha: 'senha-segura',
        perfil: PerfilUsuario.DONO,
      });
    const desativarProprioDono = await request(app)
      .patch(`/usuarios/${dono.id}/status`)
      .set('Authorization', `Bearer ${tokenDono}`)
      .send({ ativo: false });

    expect(listarComoOperador.status).toBe(403);
    expect(criarDono.status).toBe(403);
    expect(desativarProprioDono.status).toBe(403);
  });

  it('deve ocultar usuários pertencentes a outra Empresa', async () => {
    const primeiraEmpresa = await criarEmpresa();
    const segundaEmpresa = await criarEmpresa();
    const primeiroDono = await criarUsuario(
      primeiraEmpresa.id!,
      PerfilUsuario.DONO,
    );
    const usuarioOutraEmpresa = await criarUsuario(
      segundaEmpresa.id!,
      PerfilUsuario.ADMIN,
    );
    const token = await autenticar(primeiroDono);

    const alterarStatus = await request(app)
      .patch(`/usuarios/${usuarioOutraEmpresa.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ativo: false });
    const listagem = await request(app)
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`);

    expect(alterarStatus.status).toBe(404);
    expect(listagem.body).toHaveLength(1);
    expect(listagem.body[0].id).toBe(primeiroDono.id);
  });
});
