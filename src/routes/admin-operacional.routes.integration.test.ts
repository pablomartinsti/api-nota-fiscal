import { randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { PrismaClienteRepository } from '../database/repositories/PrismaClienteRepository';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { PrismaServicoRepository } from '../database/repositories/PrismaServicoRepository';
import { PrismaUsuarioRepository } from '../database/repositories/PrismaUsuarioRepository';
import { prisma } from '../database/prisma.client';
import {
  AmbienteFiscal,
  StatusNota,
} from '../entities/NotaServico';
import {
  StatusEventoFiscalNotaServico,
  TipoEventoFiscalNotaServico,
} from '../entities/NotaServicoEventoFiscal';
import { Cliente } from '../entities/Cliente';
import { Empresa, RegimeTributario } from '../entities/Empresa';
import { Servico } from '../entities/Servico';
import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { BcryptGeradorHash } from '../security/BcryptGeradorHash';

const empresaIdsCriados: string[] = [];
const notaIdsCriadas: string[] = [];
const empresaRepository = new PrismaEmpresaRepository();
const usuarioRepository = new PrismaUsuarioRepository();
const clienteRepository = new PrismaClienteRepository();
const servicoRepository = new PrismaServicoRepository();
const geradorHash = new BcryptGeradorHash(4);

function documentoUnico(): string {
  return randomInt(10_000_000_000_000, 100_000_000_000_000).toString();
}

async function criarEmpresa(nome: string): Promise<Empresa> {
  const empresa = await empresaRepository.salvar(
    new Empresa({
      razaoSocial: nome,
      cnpj: documentoUnico(),
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      cidade: 'Uberlandia',
      uf: 'MG',
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
      nome: `Usuario ${perfil}`,
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

async function criarCliente(empresaId: string, nome: string): Promise<Cliente> {
  return clienteRepository.salvar(
    new Cliente({
      empresaId,
      nomeRazaoSocial: nome,
      cpfCnpj: documentoUnico(),
      cidade: 'Uberlandia',
      uf: 'MG',
    }),
  );
}

async function criarServico(empresaId: string): Promise<Servico> {
  return servicoRepository.salvar(
    new Servico({
      empresaId,
      descricao: 'Servicos contabeis',
      codigoServico: '17.19',
      codigoTributacaoNacional: '171901',
      aliquotaIss: 2,
    }),
  );
}

async function criarNotaComErro(empresa: Empresa) {
  const usuario = await criarUsuario(empresa.id!, PerfilUsuario.OPERADOR);
  const cliente = await criarCliente(empresa.id!, `Cliente ${empresa.cnpj}`);
  const servico = await criarServico(empresa.id!);
  const nota = await prisma.notaServico.create({
    data: {
      empresaId: empresa.id!,
      usuarioId: usuario.id!,
      clienteId: cliente.id!,
      servicoId: servico.id!,
      ambienteFiscal: AmbienteFiscal.PRODUCAO,
      serieDps: '1',
      numeroDps: randomInt(1, 10_000).toString(),
      codigoMunicipioPrestacao: '3170206',
      valorServico: 100,
      valorIss: 2,
      aliquotaIss: 2,
      descricao: 'Prestacao de servico',
      status: StatusNota.ERRO,
      mensagemErroFiscal: 'Falha retornada pela SEFIN Nacional.',
    },
  });
  notaIdsCriadas.push(nota.id);

  await prisma.notaServicoEventoFiscal.create({
    data: {
      empresaId: empresa.id!,
      notaServicoId: nota.id,
      usuarioId: usuario.id!,
      tipo: TipoEventoFiscalNotaServico.ENVIO_DPS,
      status: StatusEventoFiscalNotaServico.ERRO,
      statusHttp: 400,
      mensagem: 'Rejeicao fiscal retornada pela SEFIN Nacional.',
    },
  });

  return nota;
}

describe('Admin operacional HTTP', () => {
  afterAll(async () => {
    if (notaIdsCriadas.length > 0) {
      await prisma.notaServico.deleteMany({
        where: { id: { in: notaIdsCriadas } },
      });
    }

    if (empresaIdsCriados.length > 0) {
      await prisma.cliente.deleteMany({
        where: { empresaId: { in: empresaIdsCriados } },
      });
      await prisma.servico.deleteMany({
        where: { empresaId: { in: empresaIdsCriados } },
      });
      await prisma.usuario.deleteMany({
        where: { empresaId: { in: empresaIdsCriados } },
      });
      await prisma.configuracaoFiscalEmpresa.deleteMany({
        where: { empresaId: { in: empresaIdsCriados } },
      });
      await prisma.empresa.deleteMany({
        where: { id: { in: empresaIdsCriados } },
      });
    }

    await prisma.$disconnect();
  });

  it('deve impedir acesso de usuario que nao e ADMIN_SISTEMA', async () => {
    const empresa = await criarEmpresa('Empresa Cliente Admin Bloqueado Ltda');
    const usuario = await criarUsuario(empresa.id!, PerfilUsuario.DONO);
    const token = await autenticar(usuario);

    const response = await request(app)
      .get('/admin/notas')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('deve listar notas de todas as empresas para ADMIN_SISTEMA', async () => {
    const empresaAdmin = await criarEmpresa('Martir Admin Sistema Ltda');
    const admin = await criarUsuario(
      empresaAdmin.id!,
      PerfilUsuario.ADMIN_SISTEMA,
    );
    const token = await autenticar(admin);
    const primeiraEmpresa = await criarEmpresa('Primeira Empresa Monitorada');
    const segundaEmpresa = await criarEmpresa('Segunda Empresa Monitorada');
    await criarNotaComErro(primeiraEmpresa);
    await criarNotaComErro(segundaEmpresa);

    const response = await request(app)
      .get('/admin/notas')
      .query({ status: StatusNota.ERRO })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          empresa: expect.objectContaining({
            razaoSocial: primeiraEmpresa.razaoSocial,
          }),
          status: StatusNota.ERRO,
          mensagemErroFiscal: 'Falha retornada pela SEFIN Nacional.',
        }),
        expect.objectContaining({
          empresa: expect.objectContaining({
            razaoSocial: segundaEmpresa.razaoSocial,
          }),
          status: StatusNota.ERRO,
        }),
      ]),
    );
  });

  it('deve listar empresas monitoradas com resumo fiscal e erros', async () => {
    const empresaAdmin = await criarEmpresa('Martir Admin Empresas Ltda');
    const admin = await criarUsuario(
      empresaAdmin.id!,
      PerfilUsuario.ADMIN_SISTEMA,
    );
    const token = await autenticar(admin);
    const empresaMonitorada = await criarEmpresa(
      'Empresa Monitorada Bloqueada Ltda',
    );
    await prisma.configuracaoFiscalEmpresa.create({
      data: {
        empresaId: empresaMonitorada.id!,
        ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
        serieDpsPadrao: '1',
        emissaoHabilitada: false,
      },
    });
    await criarNotaComErro(empresaMonitorada);

    const response = await request(app)
      .get('/admin/empresas')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: empresaMonitorada.id,
          razaoSocial: empresaMonitorada.razaoSocial,
          configuracaoFiscal: expect.objectContaining({
            ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
            emissaoHabilitada: false,
          }),
          notas: expect.objectContaining({
            erros: 1,
          }),
          ultimoErro: expect.objectContaining({
            mensagem: 'Falha retornada pela SEFIN Nacional.',
          }),
        }),
      ]),
    );
  });

  it('deve bloquear e liberar emissao de uma empresa para ADMIN_SISTEMA', async () => {
    const empresaAdmin = await criarEmpresa('Martir Admin Emissao Ltda');
    const admin = await criarUsuario(
      empresaAdmin.id!,
      PerfilUsuario.ADMIN_SISTEMA,
    );
    const token = await autenticar(admin);
    const empresaMonitorada = await criarEmpresa('Empresa Alternar Emissao Ltda');

    const bloqueio = await request(app)
      .patch(`/admin/empresas/${empresaMonitorada.id}/emissao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ emissaoHabilitada: false });

    expect(bloqueio.status).toBe(200);
    expect(bloqueio.body.configuracaoFiscal.emissaoHabilitada).toBe(false);

    const liberacao = await request(app)
      .patch(`/admin/empresas/${empresaMonitorada.id}/emissao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ emissaoHabilitada: true });

    expect(liberacao.status).toBe(200);
    expect(liberacao.body.configuracaoFiscal.emissaoHabilitada).toBe(true);
  });

  it('deve listar eventos fiscais com contexto da nota e empresa', async () => {
    const empresaAdmin = await criarEmpresa('Martir Admin Eventos Ltda');
    const admin = await criarUsuario(
      empresaAdmin.id!,
      PerfilUsuario.ADMIN_SISTEMA,
    );
    const token = await autenticar(admin);
    const empresaMonitorada = await criarEmpresa('Empresa Evento Fiscal Ltda');
    const nota = await criarNotaComErro(empresaMonitorada);

    const response = await request(app)
      .get('/admin/eventos-fiscais')
      .query({
        notaServicoId: nota.id,
        status: StatusEventoFiscalNotaServico.ERRO,
      })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toEqual(
      expect.objectContaining({
        tipo: TipoEventoFiscalNotaServico.ENVIO_DPS,
        status: StatusEventoFiscalNotaServico.ERRO,
        statusHttp: 400,
        mensagem: 'Rejeicao fiscal retornada pela SEFIN Nacional.',
        empresa: expect.objectContaining({
          razaoSocial: empresaMonitorada.razaoSocial,
        }),
        nota: expect.objectContaining({
          id: nota.id,
          status: StatusNota.ERRO,
          cliente: expect.objectContaining({
            nomeRazaoSocial: `Cliente ${empresaMonitorada.cnpj}`,
          }),
        }),
      }),
    );
  });
});
