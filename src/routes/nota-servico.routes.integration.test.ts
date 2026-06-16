import { randomInt, randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { app } from '../app';
import { PrismaClienteRepository } from '../database/repositories/PrismaClienteRepository';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { PrismaServicoRepository } from '../database/repositories/PrismaServicoRepository';
import { PrismaUsuarioRepository } from '../database/repositories/PrismaUsuarioRepository';
import { prisma } from '../database/prisma.client';
import { Cliente } from '../entities/Cliente';
import { Empresa, RegimeTributario } from '../entities/Empresa';
import { Servico } from '../entities/Servico';
import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { BcryptGeradorHash } from '../security/BcryptGeradorHash';

const empresaIdsCriados: string[] = [];
const empresaRepository = new PrismaEmpresaRepository();
const usuarioRepository = new PrismaUsuarioRepository();
const clienteRepository = new PrismaClienteRepository();
const servicoRepository = new PrismaServicoRepository();
const geradorHash = new BcryptGeradorHash(4);

function documentoUnico(): string {
  return randomInt(10_000_000_000_000, 100_000_000_000_000).toString();
}

async function criarContexto(
  perfil = PerfilUsuario.OPERADOR,
  codigoMunicipioIbge?: string,
) {
  const empresa = await empresaRepository.salvar(
    new Empresa({
      razaoSocial: 'Empresa Notas Ltda',
      cnpj: documentoUnico(),
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
      codigoMunicipioIbge,
      cidade: 'Campinas',
      uf: 'SP',
    }),
  );
  empresaIdsCriados.push(empresa.id!);

  const usuario = await usuarioRepository.salvar(
    new Usuario({
      empresaId: empresa.id!,
      nome: 'Usuario Notas',
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

async function criarCliente(empresaId: string, ativo = true) {
  return clienteRepository.salvar(
    new Cliente({
      empresaId,
      nomeRazaoSocial: 'Cliente Nota Ltda',
      cpfCnpj: documentoUnico(),
      cidade: 'Campinas',
      uf: 'SP',
      ativo,
    }),
  );
}

async function criarServico(
  empresaId: string,
  aliquotaIss = 5,
  ativo = true,
  codigoTributacaoNacional?: string,
) {
  return servicoRepository.salvar(
    new Servico({
      empresaId,
      descricao: 'Consultoria tecnica',
      codigoServico: '01.01',
      codigoTributacaoNacional,
      aliquotaIss,
      ativo,
    }),
  );
}

function dadosRascunho(clienteId: string, servicoId: string) {
  return {
    clienteId,
    servicoId,
    valorServico: 200,
    descricao: 'Consultoria realizada',
  };
}

describe('Gestao de rascunhos de notas de servico HTTP', () => {
  afterAll(async () => {
    if (empresaIdsCriados.length > 0) {
      await prisma.notaServico.deleteMany({
        where: { empresaId: { in: empresaIdsCriados } },
      });
      await prisma.cliente.deleteMany({
        where: { empresaId: { in: empresaIdsCriados } },
      });
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

  it('deve criar e atualizar rascunho usando contexto e aliquota do servico', async () => {
    const contexto = await criarContexto();
    const outraEmpresa = await criarContexto();
    const cliente = await criarCliente(contexto.empresa.id!);
    const servico = await criarServico(contexto.empresa.id!, 5);

    const cadastro = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        ...dadosRascunho(cliente.id!, servico.id!),
        empresaId: outraEmpresa.empresa.id,
        usuarioId: outraEmpresa.usuario.id,
        aliquotaIss: 99,
        status: 'EMITIDA',
      });

    expect(cadastro.status).toBe(201);
    expect(cadastro.body.empresaId).toBe(contexto.empresa.id);
    expect(cadastro.body.usuarioId).toBe(contexto.usuario.id);
    expect(cadastro.body.status).toBe('RASCUNHO');
    expect(cadastro.body.aliquotaIss).toBe(5);
    expect(cadastro.body.valorIss).toBe(10);

    const consulta = await request(app)
      .get(`/notas-servico/${cadastro.body.id}`)
      .set('Authorization', `Bearer ${contexto.token}`);
    const listagem = await request(app)
      .get('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`);

    expect(consulta.status).toBe(200);
    expect(listagem.body).toHaveLength(1);

    const novoCliente = await criarCliente(contexto.empresa.id!);
    const novoServico = await criarServico(contexto.empresa.id!, 2.5);
    const atualizacao = await request(app)
      .put(`/notas-servico/${cadastro.body.id}`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        ...dadosRascunho(novoCliente.id!, novoServico.id!),
        valorServico: 300,
        aliquotaIss: 100,
      });

    expect(atualizacao.status).toBe(200);
    expect(atualizacao.body.clienteId).toBe(novoCliente.id);
    expect(atualizacao.body.servicoId).toBe(novoServico.id);
    expect(atualizacao.body.aliquotaIss).toBe(2.5);
    expect(atualizacao.body.valorIss).toBe(7.5);
  });

  it('deve rejeitar cliente ou servico inativo e referencias de outra Empresa', async () => {
    const contexto = await criarContexto(PerfilUsuario.DONO);
    const outraEmpresa = await criarContexto();
    const clienteAtivo = await criarCliente(contexto.empresa.id!);
    const clienteInativo = await criarCliente(contexto.empresa.id!, false);
    const clienteOutraEmpresa = await criarCliente(outraEmpresa.empresa.id!);
    const servicoAtivo = await criarServico(contexto.empresa.id!);
    const servicoInativo = await criarServico(contexto.empresa.id!, 5, false);

    const comClienteInativo = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send(dadosRascunho(clienteInativo.id!, servicoAtivo.id!));
    const comServicoInativo = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send(dadosRascunho(clienteAtivo.id!, servicoInativo.id!));
    const comClienteOutraEmpresa = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send(dadosRascunho(clienteOutraEmpresa.id!, servicoAtivo.id!));

    expect(comClienteInativo.status).toBe(409);
    expect(comServicoInativo.status).toBe(409);
    expect(comClienteOutraEmpresa.status).toBe(404);
  });

  it('deve ocultar notas pertencentes a outra Empresa', async () => {
    const primeiroContexto = await criarContexto(PerfilUsuario.ADMIN);
    const segundoContexto = await criarContexto();
    const cliente = await criarCliente(segundoContexto.empresa.id!);
    const servico = await criarServico(segundoContexto.empresa.id!);
    const cadastroOutraEmpresa = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${segundoContexto.token}`)
      .send(dadosRascunho(cliente.id!, servico.id!));

    const consulta = await request(app)
      .get(`/notas-servico/${cadastroOutraEmpresa.body.id}`)
      .set('Authorization', `Bearer ${primeiroContexto.token}`);
    const atualizacao = await request(app)
      .put(`/notas-servico/${cadastroOutraEmpresa.body.id}`)
      .set('Authorization', `Bearer ${primeiroContexto.token}`)
      .send(dadosRascunho(cliente.id!, servico.id!));
    const listagem = await request(app)
      .get('/notas-servico')
      .set('Authorization', `Bearer ${primeiroContexto.token}`);

    expect(consulta.status).toBe(404);
    expect(atualizacao.status).toBe(404);
    expect(listagem.body).toHaveLength(0);
  });

  it('deve impedir alteracao de nota fora de rascunho', async () => {
    const contexto = await criarContexto();
    const cliente = await criarCliente(contexto.empresa.id!);
    const servico = await criarServico(contexto.empresa.id!);
    const cadastro = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send(dadosRascunho(cliente.id!, servico.id!));

    await prisma.notaServico.update({
      where: { id: cadastro.body.id },
      data: {
        status: 'EMITIDA',
        numeroNfse: '100',
        codigoVerificacao: 'ABC123',
        dataEmissao: new Date(),
      },
    });

    const atualizacao = await request(app)
      .put(`/notas-servico/${cadastro.body.id}`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send(dadosRascunho(cliente.id!, servico.id!));

    expect(atualizacao.status).toBe(409);
  });

  it('deve emitir e cancelar uma nota usando o emissor simulado', async () => {
    const contexto = await criarContexto();
    const cliente = await criarCliente(contexto.empresa.id!);
    const servico = await criarServico(contexto.empresa.id!);
    const cadastro = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send(dadosRascunho(cliente.id!, servico.id!));

    const emissao = await request(app)
      .post(`/notas-servico/${cadastro.body.id}/emitir`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({});

    expect(emissao.status).toBe(200);
    expect(emissao.body.status).toBe('EMITIDA');
    expect(emissao.body.numeroNfse).toBeTruthy();
    expect(emissao.body.codigoVerificacao).toBeTruthy();
    expect(emissao.body.dataEmissao).toBeTruthy();
    expect(emissao.body.linkPdf).toBeTruthy();
    expect(emissao.body.xmlUrl).toBeTruthy();

    const segundaEmissao = await request(app)
      .post(`/notas-servico/${cadastro.body.id}/emitir`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({});
    const cancelamento = await request(app)
      .post(`/notas-servico/${cadastro.body.id}/cancelar`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({});
    const segundoCancelamento = await request(app)
      .post(`/notas-servico/${cadastro.body.id}/cancelar`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({});

    expect(segundaEmissao.status).toBe(409);
    expect(cancelamento.status).toBe(200);
    expect(cancelamento.body.status).toBe('CANCELADA');
    expect(segundoCancelamento.status).toBe(409);
  });

  it('deve informar pendencias e prontidao fiscal da DPS', async () => {
    const contextoIncompleto = await criarContexto();
    const clienteIncompleto = await criarCliente(contextoIncompleto.empresa.id!);
    const servicoIncompleto = await criarServico(contextoIncompleto.empresa.id!);
    const notaIncompleta = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contextoIncompleto.token}`)
      .send(dadosRascunho(clienteIncompleto.id!, servicoIncompleto.id!));

    const prontidaoIncompleta = await request(app)
      .get(`/notas-servico/${notaIncompleta.body.id}/prontidao-fiscal`)
      .set('Authorization', `Bearer ${contextoIncompleto.token}`);

    expect(prontidaoIncompleta.status).toBe(200);
    expect(prontidaoIncompleta.body.pronto).toBe(false);
    expect(prontidaoIncompleta.body.pendencias).toEqual(
      expect.arrayContaining([
        'empresa.codigoMunicipioIbge',
        'servico.codigoTributacaoNacional',
        'nota.serieDps',
        'nota.numeroDps',
        'nota.dataCompetencia',
        'nota.codigoMunicipioPrestacao',
      ]),
    );

    const contextoCompleto = await criarContexto(
      PerfilUsuario.OPERADOR,
      '3509502',
    );
    const clienteCompleto = await criarCliente(contextoCompleto.empresa.id!);
    const servicoCompleto = await criarServico(
      contextoCompleto.empresa.id!,
      5,
      true,
      '010101',
    );
    const notaCompleta = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contextoCompleto.token}`)
      .send({
        ...dadosRascunho(clienteCompleto.id!, servicoCompleto.id!),
        serieDps: '1',
        numeroDps: '100',
        dataCompetencia: '2026-06-15',
        codigoMunicipioPrestacao: '3509502',
      });

    const prontidaoCompleta = await request(app)
      .get(`/notas-servico/${notaCompleta.body.id}/prontidao-fiscal`)
      .set('Authorization', `Bearer ${contextoCompleto.token}`);

    expect(notaCompleta.body.ambienteFiscal).toBe('HOMOLOGACAO');
    expect(notaCompleta.body.serieDps).toBe('1');
    expect(prontidaoCompleta.status).toBe(200);
    expect(prontidaoCompleta.body).toEqual({
      pronto: true,
      pendencias: [],
    });
  });

  it('deve gerar o XML da DPS sem alterar o rascunho e manter isolamento', async () => {
    const contexto = await criarContexto(PerfilUsuario.OPERADOR, '3509502');
    const outraEmpresa = await criarContexto();
    const cliente = await criarCliente(contexto.empresa.id!);
    const servico = await criarServico(
      contexto.empresa.id!,
      5,
      true,
      '010101',
    );
    const cadastro = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        ...dadosRascunho(cliente.id!, servico.id!),
        descricao: 'Consultoria & desenvolvimento',
        serieDps: '1',
        numeroDps: '100',
        dataCompetencia: '2026-06-15',
        codigoMunicipioPrestacao: '3509502',
      });

    const tentativaOutraEmpresa = await request(app)
      .get(`/notas-servico/${cadastro.body.id}/xml-dps`)
      .set('Authorization', `Bearer ${outraEmpresa.token}`);
    const geracao = await request(app)
      .get(`/notas-servico/${cadastro.body.id}/xml-dps`)
      .set('Authorization', `Bearer ${contexto.token}`);
    const consulta = await request(app)
      .get(`/notas-servico/${cadastro.body.id}`)
      .set('Authorization', `Bearer ${contexto.token}`);

    expect(tentativaOutraEmpresa.status).toBe(404);
    expect(geracao.status).toBe(200);
    expect(geracao.headers['content-type']).toContain('application/xml');
    expect(geracao.text).toContain(
      '<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">',
    );
    expect(geracao.text).toContain('<cTribNac>010101</cTribNac>');
    expect(geracao.text).toContain(
      '<xDescServ>Consultoria &amp; desenvolvimento</xDescServ>',
    );
    expect(geracao.text).not.toContain('<Signature');
    expect(consulta.body.status).toBe('RASCUNHO');
  });

  it('nao deve gerar XML quando a nota possui pendencias fiscais', async () => {
    const contexto = await criarContexto();
    const cliente = await criarCliente(contexto.empresa.id!);
    const servico = await criarServico(contexto.empresa.id!);
    const cadastro = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send(dadosRascunho(cliente.id!, servico.id!));

    const geracao = await request(app)
      .get(`/notas-servico/${cadastro.body.id}/xml-dps`)
      .set('Authorization', `Bearer ${contexto.token}`);

    expect(geracao.status).toBe(409);
    expect(geracao.body.message).toBe(
      'A nota possui pendencias fiscais para gerar a DPS.',
    );
    expect(geracao.body.pendencias).toEqual(
      expect.arrayContaining([
        'empresa.codigoMunicipioIbge',
        'servico.codigoTributacaoNacional',
        'nota.serieDps',
        'nota.numeroDps',
        'nota.dataCompetencia',
        'nota.codigoMunicipioPrestacao',
      ]),
    );
  });

  it('deve exigir configuracao fiscal para gerar XML assinado', async () => {
    const contexto = await criarContexto(PerfilUsuario.OPERADOR, '3509502');
    const cliente = await criarCliente(contexto.empresa.id!);
    const servico = await criarServico(
      contexto.empresa.id!,
      5,
      true,
      '010101',
    );
    const cadastro = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        ...dadosRascunho(cliente.id!, servico.id!),
        serieDps: '1',
        numeroDps: '100',
        dataCompetencia: '2026-06-15',
        codigoMunicipioPrestacao: '3509502',
      });

    const geracao = await request(app)
      .get(`/notas-servico/${cadastro.body.id}/xml-dps-assinado`)
      .set('Authorization', `Bearer ${contexto.token}`);

    expect(geracao.status).toBe(503);
    expect(geracao.body).toEqual({
      message: 'Configuracao fiscal para assinatura da DPS nao foi informada.',
    });
  });

  it('deve exigir configuracao fiscal para enviar DPS assinada', async () => {
    const contexto = await criarContexto(PerfilUsuario.OPERADOR, '3509502');
    const cliente = await criarCliente(contexto.empresa.id!);
    const servico = await criarServico(
      contexto.empresa.id!,
      5,
      true,
      '010101',
    );
    const cadastro = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({
        ...dadosRascunho(cliente.id!, servico.id!),
        serieDps: '1',
        numeroDps: '100',
        dataCompetencia: '2026-06-15',
        codigoMunicipioPrestacao: '3509502',
      });

    const envio = await request(app)
      .post(`/notas-servico/${cadastro.body.id}/enviar-dps`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({});

    expect(envio.status).toBe(503);
    expect(envio.body).toEqual({
      message: 'Configuracao fiscal para assinatura da DPS nao foi informada.',
    });
  });

  it('deve registrar falha, retornar para rascunho e manter isolamento', async () => {
    const contexto = await criarContexto();
    const outraEmpresa = await criarContexto();
    const cliente = await criarCliente(contexto.empresa.id!);
    const servico = await criarServico(contexto.empresa.id!);
    const cadastro = await request(app)
      .post('/notas-servico')
      .set('Authorization', `Bearer ${contexto.token}`)
      .send(dadosRascunho(cliente.id!, servico.id!));

    const emissaoComFalha = await request(app)
      .post(`/notas-servico/${cadastro.body.id}/emitir`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({ simularFalha: true });

    expect(emissaoComFalha.status).toBe(200);
    expect(emissaoComFalha.body.status).toBe('ERRO');
    expect(emissaoComFalha.body.mensagemErro).toBeTruthy();

    const tentativaOutraEmpresa = await request(app)
      .post(`/notas-servico/${cadastro.body.id}/retornar-rascunho`)
      .set('Authorization', `Bearer ${outraEmpresa.token}`)
      .send({});
    const retorno = await request(app)
      .post(`/notas-servico/${cadastro.body.id}/retornar-rascunho`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({});
    const segundoRetorno = await request(app)
      .post(`/notas-servico/${cadastro.body.id}/retornar-rascunho`)
      .set('Authorization', `Bearer ${contexto.token}`)
      .send({});

    expect(tentativaOutraEmpresa.status).toBe(404);
    expect(retorno.status).toBe(200);
    expect(retorno.body.status).toBe('RASCUNHO');
    expect(retorno.body.mensagemErro).toBeUndefined();
    expect(segundoRetorno.status).toBe(409);
  });
});
