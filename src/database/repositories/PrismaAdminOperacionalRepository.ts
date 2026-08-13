import { Prisma } from '@prisma/client';

import { AmbienteFiscal, StatusNota } from '../../entities/NotaServico';
import {
  StatusEventoFiscalNotaServico,
  TipoEventoFiscalNotaServico,
} from '../../entities/NotaServicoEventoFiscal';
import {
  AtualizarConfiguracaoFiscalEmpresaAdminInput,
  AdminEmpresaOperacionalResumo,
  AdminEventoFiscalResumo,
  AdminNotaResumo,
  AdminResumoNotasEmpresa,
  AdminOperacionalRepository,
  FiltrosAdminEventosFiscais,
  FiltrosAdminNotas,
} from '../../repositories/AdminOperacionalRepository';
import { prisma } from '../prisma.client';

export class PrismaAdminOperacionalRepository
  implements AdminOperacionalRepository
{
  async listarEmpresas(): Promise<AdminEmpresaOperacionalResumo[]> {
    const [empresas, contagensPorStatus] = await Promise.all([
      prisma.empresa.findMany({
        orderBy: {
          razaoSocial: 'asc',
        },
        select: {
          id: true,
          razaoSocial: true,
          cnpj: true,
          cidade: true,
          uf: true,
          ativo: true,
          configuracaoFiscal: {
            select: {
              ambienteFiscalPadrao: true,
              serieDpsPadrao: true,
              emissaoHabilitada: true,
              certificadoA1Path: true,
              certificadoA1Conteudo: true,
              certificadoA1Senha: true,
              certificadoA1ValidoAte: true,
              ativo: true,
            },
          },
          notas: {
            where: {
              status: StatusNota.ERRO,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
              numeroNfse: true,
              numeroDps: true,
              mensagemErro: true,
              mensagemErroFiscal: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.notaServico.groupBy({
        by: ['empresaId', 'status'],
        _count: {
          _all: true,
        },
      }),
    ]);

    const contagens = this.agruparContagensPorEmpresa(contagensPorStatus);

    return empresas.map((empresa) => {
      const configuracao = empresa.configuracaoFiscal;
      const ultimoErro = empresa.notas[0];

      return {
        id: empresa.id,
        razaoSocial: empresa.razaoSocial,
        cnpj: empresa.cnpj,
        cidade: empresa.cidade,
        uf: empresa.uf,
        ativo: empresa.ativo,
        configuracaoFiscal: {
          ambienteFiscalPadrao:
            (configuracao?.ambienteFiscalPadrao as AmbienteFiscal) ??
            AmbienteFiscal.HOMOLOGACAO,
          serieDpsPadrao: configuracao?.serieDpsPadrao ?? '1',
          emissaoHabilitada: configuracao?.emissaoHabilitada ?? true,
          certificadoA1Configurado: Boolean(
            configuracao?.certificadoA1Senha &&
              (configuracao.certificadoA1Conteudo ||
                configuracao.certificadoA1Path),
          ),
          certificadoA1ValidoAte:
            configuracao?.certificadoA1ValidoAte ?? undefined,
          ativo: configuracao?.ativo ?? true,
        },
        notas:
          contagens.get(empresa.id) ??
          this.criarContagemNotasVazia(),
        ultimoErro: ultimoErro
          ? {
              notaServicoId: ultimoErro.id,
              numeroNfse: ultimoErro.numeroNfse ?? undefined,
              numeroDps: ultimoErro.numeroDps ?? undefined,
              mensagem:
                ultimoErro.mensagemErroFiscal ??
                ultimoErro.mensagemErro ??
                undefined,
              updatedAt: ultimoErro.updatedAt,
            }
          : undefined,
      };
    });
  }

  async atualizarEmissaoEmpresa(
    empresaId: string,
    emissaoHabilitada: boolean,
  ): Promise<AdminEmpresaOperacionalResumo | null> {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true },
    });

    if (!empresa) {
      return null;
    }

    await prisma.configuracaoFiscalEmpresa.upsert({
      where: { empresaId },
      update: { emissaoHabilitada },
      create: { empresaId, emissaoHabilitada },
    });

    const empresas = await this.listarEmpresas();

    return (
      empresas.find((empresaResumo) => empresaResumo.id === empresaId) ?? null
    );
  }

  async atualizarConfiguracaoFiscalEmpresa(
    empresaId: string,
    dados: AtualizarConfiguracaoFiscalEmpresaAdminInput,
  ): Promise<AdminEmpresaOperacionalResumo | null> {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true },
    });

    if (!empresa) {
      return null;
    }

    const dadosEmissao =
      dados.emissaoHabilitada === undefined
        ? {}
        : { emissaoHabilitada: dados.emissaoHabilitada };

    await prisma.configuracaoFiscalEmpresa.upsert({
      where: { empresaId },
      update: {
        ambienteFiscalPadrao: dados.ambienteFiscalPadrao,
        serieDpsPadrao: dados.serieDpsPadrao,
        ...dadosEmissao,
      },
      create: {
        empresaId,
        ambienteFiscalPadrao: dados.ambienteFiscalPadrao,
        serieDpsPadrao: dados.serieDpsPadrao,
        ...dadosEmissao,
      },
    });

    const empresas = await this.listarEmpresas();

    return (
      empresas.find((empresaResumo) => empresaResumo.id === empresaId) ?? null
    );
  }

  async listarNotas(filtros: FiltrosAdminNotas): Promise<AdminNotaResumo[]> {
    const where: Prisma.NotaServicoWhereInput = {};

    if (filtros.empresaId) {
      where.empresaId = filtros.empresaId;
    }

    if (filtros.status) {
      where.status = filtros.status;
    }

    if (filtros.ambienteFiscal) {
      where.ambienteFiscal = filtros.ambienteFiscal;
    }

    const periodo = this.criarFiltroPeriodo(filtros.criadoDe, filtros.criadoAte);
    if (periodo) {
      where.createdAt = periodo;
    }

    if (filtros.busca) {
      const contains = filtros.busca;
      where.OR = [
        { numeroNfse: { contains, mode: 'insensitive' } },
        { numeroDps: { contains, mode: 'insensitive' } },
        { mensagemErro: { contains, mode: 'insensitive' } },
        { mensagemErroFiscal: { contains, mode: 'insensitive' } },
        { empresa: { razaoSocial: { contains, mode: 'insensitive' } } },
        { empresa: { cnpj: { contains, mode: 'insensitive' } } },
        { cliente: { nomeRazaoSocial: { contains, mode: 'insensitive' } } },
        { cliente: { cpfCnpj: { contains, mode: 'insensitive' } } },
        { servico: { descricao: { contains, mode: 'insensitive' } } },
      ];
    }

    const registros = await prisma.notaServico.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: filtros.limite,
      select: {
        id: true,
        numeroNfse: true,
        serieDps: true,
        numeroDps: true,
        ambienteFiscal: true,
        status: true,
        valorServico: true,
        valorIss: true,
        dataCompetencia: true,
        dataEmissao: true,
        chaveAcesso: true,
        mensagemErro: true,
        mensagemErroFiscal: true,
        createdAt: true,
        updatedAt: true,
        empresa: {
          select: {
            id: true,
            razaoSocial: true,
            cnpj: true,
            cidade: true,
            uf: true,
            ativo: true,
          },
        },
        cliente: {
          select: {
            id: true,
            nomeRazaoSocial: true,
            cpfCnpj: true,
          },
        },
        servico: {
          select: {
            id: true,
            descricao: true,
          },
        },
        eventosFiscais: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            notaServicoId: true,
            usuarioId: true,
            tipo: true,
            status: true,
            statusHttp: true,
            chaveAcesso: true,
            mensagem: true,
            createdAt: true,
          },
        },
      },
    });

    return registros.map((registro) => ({
      id: registro.id,
      empresa: registro.empresa,
      cliente: registro.cliente,
      servico: registro.servico,
      numeroNfse: registro.numeroNfse ?? undefined,
      serieDps: registro.serieDps ?? undefined,
      numeroDps: registro.numeroDps ?? undefined,
      ambienteFiscal: registro.ambienteFiscal as AmbienteFiscal,
      status: registro.status as StatusNota,
      valorServico: registro.valorServico.toNumber(),
      valorIss: registro.valorIss.toNumber(),
      dataCompetencia: registro.dataCompetencia ?? undefined,
      dataEmissao: registro.dataEmissao ?? undefined,
      chaveAcesso: registro.chaveAcesso ?? undefined,
      mensagemErro: registro.mensagemErro ?? undefined,
      mensagemErroFiscal: registro.mensagemErroFiscal ?? undefined,
      createdAt: registro.createdAt,
      updatedAt: registro.updatedAt,
      ultimoEvento: registro.eventosFiscais[0]
        ? {
            id: registro.eventosFiscais[0].id,
            notaServicoId: registro.eventosFiscais[0].notaServicoId,
            usuarioId: registro.eventosFiscais[0].usuarioId ?? undefined,
            tipo: registro.eventosFiscais[0]
              .tipo as TipoEventoFiscalNotaServico,
            status: registro.eventosFiscais[0]
              .status as StatusEventoFiscalNotaServico,
            statusHttp: registro.eventosFiscais[0].statusHttp ?? undefined,
            chaveAcesso: registro.eventosFiscais[0].chaveAcesso ?? undefined,
            mensagem: registro.eventosFiscais[0].mensagem ?? undefined,
            createdAt: registro.eventosFiscais[0].createdAt,
          }
        : undefined,
    }));
  }

  async listarEventosFiscais(
    filtros: FiltrosAdminEventosFiscais,
  ): Promise<AdminEventoFiscalResumo[]> {
    const where: Prisma.NotaServicoEventoFiscalWhereInput = {};

    if (filtros.empresaId) {
      where.empresaId = filtros.empresaId;
    }

    if (filtros.notaServicoId) {
      where.notaServicoId = filtros.notaServicoId;
    }

    if (filtros.tipo) {
      where.tipo = filtros.tipo;
    }

    if (filtros.status) {
      where.status = filtros.status;
    }

    const periodo = this.criarFiltroPeriodo(filtros.criadoDe, filtros.criadoAte);
    if (periodo) {
      where.createdAt = periodo;
    }

    if (filtros.busca) {
      const contains = filtros.busca;
      where.OR = [
        { mensagem: { contains, mode: 'insensitive' } },
        { chaveAcesso: { contains, mode: 'insensitive' } },
        { empresa: { razaoSocial: { contains, mode: 'insensitive' } } },
        { empresa: { cnpj: { contains, mode: 'insensitive' } } },
        {
          notaServico: {
            cliente: {
              nomeRazaoSocial: { contains, mode: 'insensitive' },
            },
          },
        },
        {
          notaServico: {
            cliente: {
              cpfCnpj: { contains, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const registros = await prisma.notaServicoEventoFiscal.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: filtros.limite,
      select: {
        id: true,
        notaServicoId: true,
        tipo: true,
        status: true,
        statusHttp: true,
        chaveAcesso: true,
        mensagem: true,
        createdAt: true,
        empresa: {
          select: {
            id: true,
            razaoSocial: true,
            cnpj: true,
            cidade: true,
            uf: true,
            ativo: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        notaServico: {
          select: {
            id: true,
            numeroNfse: true,
            serieDps: true,
            numeroDps: true,
            status: true,
            valorServico: true,
            dataEmissao: true,
            cliente: {
              select: {
                id: true,
                nomeRazaoSocial: true,
                cpfCnpj: true,
              },
            },
            servico: {
              select: {
                id: true,
                descricao: true,
              },
            },
          },
        },
      },
    });

    return registros.map((registro) => ({
      id: registro.id,
      empresa: registro.empresa,
      notaServicoId: registro.notaServicoId,
      usuario: registro.usuario ?? undefined,
      tipo: registro.tipo as TipoEventoFiscalNotaServico,
      status: registro.status as StatusEventoFiscalNotaServico,
      statusHttp: registro.statusHttp ?? undefined,
      chaveAcesso: registro.chaveAcesso ?? undefined,
      mensagem: registro.mensagem ?? undefined,
      createdAt: registro.createdAt,
      nota: {
        id: registro.notaServico.id,
        numeroNfse: registro.notaServico.numeroNfse ?? undefined,
        serieDps: registro.notaServico.serieDps ?? undefined,
        numeroDps: registro.notaServico.numeroDps ?? undefined,
        status: registro.notaServico.status as StatusNota,
        valorServico: registro.notaServico.valorServico.toNumber(),
        dataEmissao: registro.notaServico.dataEmissao ?? undefined,
        cliente: registro.notaServico.cliente,
        servico: registro.notaServico.servico,
      },
    }));
  }

  private criarFiltroPeriodo(
    criadoDe?: Date,
    criadoAte?: Date,
  ): Prisma.DateTimeFilter | undefined {
    if (!criadoDe && !criadoAte) {
      return undefined;
    }

    return {
      ...(criadoDe ? { gte: criadoDe } : {}),
      ...(criadoAte ? { lte: criadoAte } : {}),
    };
  }

  private agruparContagensPorEmpresa(
    contagensPorStatus: Array<{
      empresaId: string;
      status: string;
      _count: { _all: number };
    }>,
  ): Map<string, AdminResumoNotasEmpresa> {
    const contagens = new Map<string, AdminResumoNotasEmpresa>();

    for (const registro of contagensPorStatus) {
      const contagem =
        contagens.get(registro.empresaId) ??
        this.criarContagemNotasVazia();
      const quantidade = registro._count._all;

      contagem.total += quantidade;

      if (registro.status === StatusNota.EMITIDA) {
        contagem.emitidas += quantidade;
      }

      if (registro.status === StatusNota.RASCUNHO) {
        contagem.rascunhos += quantidade;
      }

      if (registro.status === StatusNota.PROCESSANDO) {
        contagem.processando += quantidade;
      }

      if (registro.status === StatusNota.ERRO) {
        contagem.erros += quantidade;
      }

      if (registro.status === StatusNota.CANCELADA) {
        contagem.canceladas += quantidade;
      }

      if (registro.status === StatusNota.SUBSTITUIDA) {
        contagem.substituidas += quantidade;
      }

      contagens.set(registro.empresaId, contagem);
    }

    return contagens;
  }

  private criarContagemNotasVazia(): AdminResumoNotasEmpresa {
    return {
      total: 0,
      emitidas: 0,
      rascunhos: 0,
      processando: 0,
      erros: 0,
      canceladas: 0,
      substituidas: 0,
    };
  }
}
