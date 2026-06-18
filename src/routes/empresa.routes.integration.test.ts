import { randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { PrismaUsuarioRepository } from '../database/repositories/PrismaUsuarioRepository';
import { prisma } from '../database/prisma.client';
import { Empresa, RegimeTributario } from '../entities/Empresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { BcryptGeradorHash } from '../security/BcryptGeradorHash';

const empresaIdsCriados: string[] = [];
const empresaRepository = new PrismaEmpresaRepository();
const usuarioRepository = new PrismaUsuarioRepository();
const geradorHash = new BcryptGeradorHash(4);

function criarCnpjUnico(): string {
  return randomInt(10_000_000_000_000, 100_000_000_000_000).toString();
}

async function criarContexto(perfil: PerfilUsuario) {
  const empresa = await empresaRepository.salvar(
    new Empresa({
      razaoSocial: 'Empresa Gestao Cadastral Ltda',
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
      nome: `Usuario ${perfil}`,
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

function dadosAtualizacao() {
  return {
    razaoSocial: 'Empresa Atualizada Ltda',
    nomeFantasia: 'Empresa Atualizada',
    inscricaoMunicipal: '987654',
    regimeTributario: RegimeTributario.LUCRO_PRESUMIDO,
    email: ' CONTATO@EXEMPLO.COM ',
    telefone: '(41) 99999-9999',
    cep: '80.000-000',
    endereco: 'Rua Atualizada',
    numero: '100',
    bairro: 'Centro',
    cidade: 'Curitiba',
    uf: 'pr',
  };
}

describe('Gestao da Empresa autenticada HTTP', () => {
  afterAll(async () => {
    await prisma.configuracaoFiscalEmpresa.deleteMany({
      where: { empresaId: { in: empresaIdsCriados } },
    });
    await prisma.usuario.deleteMany({
      where: { empresaId: { in: empresaIdsCriados } },
    });
    await prisma.empresa.deleteMany({
      where: { id: { in: empresaIdsCriados } },
    });
    await prisma.$disconnect();
  });

  it('deve permitir que usuarios consultem somente a propria Empresa', async () => {
    const operador = await criarContexto(PerfilUsuario.OPERADOR);
    const outraEmpresa = await criarContexto(PerfilUsuario.DONO);

    const response = await request(app)
      .get('/empresa')
      .set('Authorization', `Bearer ${operador.token}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(operador.empresa.id);
    expect(response.body.id).not.toBe(outraEmpresa.empresa.id);
  });

  it('deve permitir ao DONO atualizar dados sem alterar identidade ou status', async () => {
    const dono = await criarContexto(PerfilUsuario.DONO);
    const outraEmpresa = await criarContexto(PerfilUsuario.DONO);
    const cnpjOriginal = dono.empresa.cnpj;

    const response = await request(app)
      .put('/empresa')
      .set('Authorization', `Bearer ${dono.token}`)
      .send({
        ...dadosAtualizacao(),
        id: outraEmpresa.empresa.id,
        empresaId: outraEmpresa.empresa.id,
        cnpj: criarCnpjUnico(),
        ativo: false,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: dono.empresa.id,
        cnpj: cnpjOriginal,
        ativo: true,
        razaoSocial: 'Empresa Atualizada Ltda',
        regimeTributario: RegimeTributario.LUCRO_PRESUMIDO,
        email: 'contato@exemplo.com',
        cep: '80000000',
        cidade: 'Curitiba',
        uf: 'PR',
      }),
    );

    const empresaNaoAlterada = await empresaRepository.buscarPorId(
      outraEmpresa.empresa.id!,
    );

    expect(empresaNaoAlterada?.razaoSocial).toBe(
      outraEmpresa.empresa.razaoSocial,
    );
  });

  it('deve impedir ADMIN e OPERADOR de atualizar a Empresa', async () => {
    const admin = await criarContexto(PerfilUsuario.ADMIN);
    const operador = await criarContexto(PerfilUsuario.OPERADOR);

    const respostaAdmin = await request(app)
      .put('/empresa')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(dadosAtualizacao());
    const respostaOperador = await request(app)
      .put('/empresa')
      .set('Authorization', `Bearer ${operador.token}`)
      .send(dadosAtualizacao());

    expect(respostaAdmin.status).toBe(403);
    expect(respostaOperador.status).toBe(403);
  });

  it('deve rejeitar contato e endereco invalidos', async () => {
    const dono = await criarContexto(PerfilUsuario.DONO);

    const emailInvalido = await request(app)
      .put('/empresa')
      .set('Authorization', `Bearer ${dono.token}`)
      .send({ ...dadosAtualizacao(), email: 'email-invalido' });
    const cepInvalido = await request(app)
      .put('/empresa')
      .set('Authorization', `Bearer ${dono.token}`)
      .send({ ...dadosAtualizacao(), cep: '123' });
    const ufInvalida = await request(app)
      .put('/empresa')
      .set('Authorization', `Bearer ${dono.token}`)
      .send({ ...dadosAtualizacao(), uf: 'Parana' });

    expect(emailInvalido.status).toBe(400);
    expect(cepInvalido.status).toBe(400);
    expect(ufInvalida.status).toBe(400);
  });

  it('deve permitir ao DONO consultar e atualizar configuracao fiscal da propria empresa', async () => {
    const dono = await criarContexto(PerfilUsuario.DONO);

    const consultaInicial = await request(app)
      .get('/empresa/configuracao-fiscal')
      .set('Authorization', `Bearer ${dono.token}`);

    expect(consultaInicial.status).toBe(200);
    expect(consultaInicial.body).toEqual(
      expect.objectContaining({
        empresaId: dono.empresa.id,
        configurada: false,
        ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
        serieDpsPadrao: '1',
        certificadoA1SenhaConfigurada: false,
        ativo: false,
      }),
    );

    const atualizacao = await request(app)
      .put('/empresa/configuracao-fiscal')
      .set('Authorization', `Bearer ${dono.token}`)
      .send({
        ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
        serieDpsPadrao: '2',
        certificadoA1Path: 'C:/certificados/empresa.pfx',
        certificadoA1Senha: 'senha-do-certificado',
      });

    expect(atualizacao.status).toBe(200);
    expect(atualizacao.body).toEqual(
      expect.objectContaining({
        empresaId: dono.empresa.id,
        configurada: true,
        ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
        serieDpsPadrao: '2',
        certificadoA1Path: 'C:/certificados/empresa.pfx',
        certificadoA1SenhaConfigurada: true,
        ativo: true,
      }),
    );
    expect(atualizacao.body.certificadoA1Senha).toBeUndefined();
  });

  it('deve impedir ADMIN e OPERADOR de atualizar configuracao fiscal', async () => {
    const admin = await criarContexto(PerfilUsuario.ADMIN);
    const operador = await criarContexto(PerfilUsuario.OPERADOR);
    const body = {
      ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
      serieDpsPadrao: '1',
    };

    const respostaAdmin = await request(app)
      .put('/empresa/configuracao-fiscal')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(body);
    const respostaOperador = await request(app)
      .put('/empresa/configuracao-fiscal')
      .set('Authorization', `Bearer ${operador.token}`)
      .send(body);

    expect(respostaAdmin.status).toBe(403);
    expect(respostaOperador.status).toBe(403);
  });
});
