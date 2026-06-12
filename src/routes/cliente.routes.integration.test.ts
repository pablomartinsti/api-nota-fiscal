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
      razaoSocial: 'Empresa Clientes Ltda',
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
      nome: 'Usuário Clientes',
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

function dadosCliente(cpfCnpj = documentoUnico()) {
  return {
    nomeRazaoSocial: 'Cliente Teste Ltda',
    cpfCnpj,
    email: 'cliente@exemplo.com',
    telefone: '(11) 99999-9999',
    cep: '12345-678',
    endereco: 'Rua Teste',
    numero: '100',
    bairro: 'Centro',
    cidade: 'Campinas',
    uf: 'SP',
    inscricaoMunicipal: '12345',
  };
}

describe('Gestão de clientes HTTP', () => {
  afterAll(async () => {
    if (empresaIdsCriados.length > 0) {
      await prisma.cliente.deleteMany({
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

  it('deve executar o fluxo completo mantendo documento e Empresa imutáveis', async () => {
    const contexto = await criarContexto();
    const outraEmpresa = await criarContexto();
    const dados = dadosCliente();

    const cadastro = await request(app)
      .post('/clientes')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        ...dados,
        empresaId: outraEmpresa.empresa.id,
      });

    expect(cadastro.status).toBe(201);
    expect(cadastro.body.empresaId).toBe(contexto.empresa.id);
    expect(cadastro.body.cpfCnpj).toBe(dados.cpfCnpj);

    const consulta = await request(app)
      .get(`/clientes/${cadastro.body.id}`)
      .set('Authorization', `Bearer ${contexto.token}`);
    const listagem = await request(app)
      .get('/clientes')
      .set('Authorization', `Bearer ${contexto.token}`);

    expect(consulta.status).toBe(200);
    expect(listagem.body).toHaveLength(1);

    const atualizacao = await request(app)
      .put(`/clientes/${cadastro.body.id}`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        ...dados,
        nomeRazaoSocial: 'Cliente Atualizado Ltda',
        cpfCnpj: documentoUnico(),
        empresaId: outraEmpresa.empresa.id,
        cidade: 'Curitiba',
        uf: 'PR',
      });
    const status = await request(app)
      .patch(`/clientes/${cadastro.body.id}/status`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({ ativo: false });

    expect(atualizacao.status).toBe(200);
    expect(atualizacao.body.nomeRazaoSocial).toBe('Cliente Atualizado Ltda');
    expect(atualizacao.body.cpfCnpj).toBe(dados.cpfCnpj);
    expect(atualizacao.body.empresaId).toBe(contexto.empresa.id);
    expect(status.status).toBe(200);
    expect(status.body.ativo).toBe(false);
  });

  it('deve impedir documento duplicado somente dentro da mesma Empresa', async () => {
    const primeiroContexto = await criarContexto(PerfilUsuario.DONO);
    const segundoContexto = await criarContexto(PerfilUsuario.ADMIN);
    const dados = dadosCliente();

    const primeiroCadastro = await request(app)
      .post('/clientes')
      .set('Authorization', `Bearer ${primeiroContexto.token}`)
      .send(dados);
    const duplicadoMesmaEmpresa = await request(app)
      .post('/clientes')
      .set('Authorization', `Bearer ${primeiroContexto.token}`)
      .send(dados);
    const mesmaPessoaOutraEmpresa = await request(app)
      .post('/clientes')
      .set('Authorization', `Bearer ${segundoContexto.token}`)
      .send(dados);

    expect(primeiroCadastro.status).toBe(201);
    expect(duplicadoMesmaEmpresa.status).toBe(409);
    expect(mesmaPessoaOutraEmpresa.status).toBe(201);
  });

  it('deve ocultar clientes pertencentes a outra Empresa', async () => {
    const primeiroContexto = await criarContexto();
    const segundoContexto = await criarContexto();
    const cadastroOutraEmpresa = await request(app)
      .post('/clientes')
      .set('Authorization', `Bearer ${segundoContexto.token}`)
      .send(dadosCliente());

    const consulta = await request(app)
      .get(`/clientes/${cadastroOutraEmpresa.body.id}`)
      .set('Authorization', `Bearer ${primeiroContexto.token}`);
    const atualizacao = await request(app)
      .put(`/clientes/${cadastroOutraEmpresa.body.id}`)
      .set('Authorization', `Bearer ${primeiroContexto.token}`)
      .send(dadosCliente());
    const status = await request(app)
      .patch(`/clientes/${cadastroOutraEmpresa.body.id}/status`)
      .set('Authorization', `Bearer ${primeiroContexto.token}`)
      .send({ ativo: false });
    const listagem = await request(app)
      .get('/clientes')
      .set('Authorization', `Bearer ${primeiroContexto.token}`);

    expect(consulta.status).toBe(404);
    expect(atualizacao.status).toBe(404);
    expect(status.status).toBe(404);
    expect(listagem.body).toHaveLength(0);
  });
});
