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

function documentoUnico(): string {
  return randomInt(10_000_000_000_000, 100_000_000_000_000).toString();
}

async function criarContexto(perfil = PerfilUsuario.OPERADOR) {
  const empresa = await empresaRepository.salvar(
    new Empresa({
      razaoSocial: 'Empresa Servicos Ltda',
      cnpj: documentoUnico(),
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      cidade: 'Campinas',
      uf: 'SP',
    }),
  );
  empresaIdsCriados.push(empresa.id!);

  const usuario = await usuarioRepository.salvar(
    new Usuario({
      empresaId: empresa.id!,
      nome: 'Usuario Servicos',
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
    token: login.body.token as string,
  };
}

function dadosServico() {
  return {
    descricao: 'Consultoria tecnica',
    codigoServico: '01.01',
    codigoTributacaoMunicipal: '1001',
    aliquotaIss: 5,
    valorPadrao: 150,
  };
}

describe('Gestao de servicos HTTP', () => {
  afterAll(async () => {
    if (empresaIdsCriados.length > 0) {
      await prisma.servico.deleteMany({
        where: { empresaId: { in: empresaIdsCriados } },
      });
      await prisma.usuario.deleteMany({
        where: { empresaId: { in: empresaIdsCriados } },
      });
      await prisma.empresa.deleteMany({
        where: { id: { in: empresaIdsCriados } },
      });
    }

    await prisma.$disconnect();
  });

  it('deve executar o fluxo completo usando a Empresa autenticada', async () => {
    const contexto = await criarContexto();
    const outraEmpresa = await criarContexto();

    const cadastro = await request(app)
      .post('/servicos')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        ...dadosServico(),
        empresaId: outraEmpresa.empresa.id,
      });

    expect(cadastro.status).toBe(201);
    expect(cadastro.body.empresaId).toBe(contexto.empresa.id);
    expect(cadastro.body.ativo).toBe(true);

    const consulta = await request(app)
      .get(`/servicos/${cadastro.body.id}`)
      .set('Authorization', `Bearer ${contexto.token}`);
    const listagem = await request(app)
      .get('/servicos')
      .set('Authorization', `Bearer ${contexto.token}`);

    expect(consulta.status).toBe(200);
    expect(listagem.body).toHaveLength(1);

    const atualizacao = await request(app)
      .put(`/servicos/${cadastro.body.id}`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        ...dadosServico(),
        empresaId: outraEmpresa.empresa.id,
        descricao: 'Consultoria atualizada',
        aliquotaIss: 2.5,
        valorPadrao: 250,
      });
    const status = await request(app)
      .patch(`/servicos/${cadastro.body.id}/status`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({ ativo: false });

    expect(atualizacao.status).toBe(200);
    expect(atualizacao.body.empresaId).toBe(contexto.empresa.id);
    expect(atualizacao.body.descricao).toBe('Consultoria atualizada');
    expect(atualizacao.body.aliquotaIss).toBe(2.5);
    expect(atualizacao.body.valorPadrao).toBe(250);
    expect(status.status).toBe(200);
    expect(status.body.ativo).toBe(false);
  });

  it('deve rejeitar dados fiscais invalidos', async () => {
    const contexto = await criarContexto(PerfilUsuario.DONO);

    const descricaoVazia = await request(app)
      .post('/servicos')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({ ...dadosServico(), descricao: ' ' });
    const aliquotaInvalida = await request(app)
      .post('/servicos')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({ ...dadosServico(), aliquotaIss: 101 });
    const valorInvalido = await request(app)
      .post('/servicos')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({ ...dadosServico(), valorPadrao: 0 });

    expect(descricaoVazia.status).toBe(400);
    expect(aliquotaInvalida.status).toBe(400);
    expect(valorInvalido.status).toBe(400);
  });

  it('deve ocultar servicos pertencentes a outra Empresa', async () => {
    const primeiroContexto = await criarContexto(PerfilUsuario.ADMIN);
    const segundoContexto = await criarContexto();
    const cadastroOutraEmpresa = await request(app)
      .post('/servicos')
      .set('Authorization', `Bearer ${segundoContexto.token}`)
      .send(dadosServico());

    const consulta = await request(app)
      .get(`/servicos/${cadastroOutraEmpresa.body.id}`)
      .set('Authorization', `Bearer ${primeiroContexto.token}`);
    const atualizacao = await request(app)
      .put(`/servicos/${cadastroOutraEmpresa.body.id}`)
      .set('Authorization', `Bearer ${primeiroContexto.token}`)
      .send(dadosServico());
    const status = await request(app)
      .patch(`/servicos/${cadastroOutraEmpresa.body.id}/status`)
      .set('Authorization', `Bearer ${primeiroContexto.token}`)
      .send({ ativo: false });
    const listagem = await request(app)
      .get('/servicos')
      .set('Authorization', `Bearer ${primeiroContexto.token}`);

    expect(consulta.status).toBe(404);
    expect(atualizacao.status).toBe(404);
    expect(status.status).toBe(404);
    expect(listagem.body).toHaveLength(0);
  });
});
