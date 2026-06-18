import {
  AmbienteFiscal,
  NotaServico,
  StatusNota,
} from '../../entities/NotaServico';
import { NotaServicoRepository } from '../../repositories/NotaServicoRepository';
import { PrismaNotaServicoMapper } from '../mappers/PrismaNotaServicoMapper';
import { prisma } from '../prisma.client';

export class PrismaNotaServicoRepository implements NotaServicoRepository {
  async salvar(nota: NotaServico): Promise<NotaServico> {
    const dados = PrismaNotaServicoMapper.paraPersistencia(nota);

    const registro = nota.id
      ? await prisma.notaServico.update({
          where: { id: nota.id },
          data: dados,
        })
      : await prisma.notaServico.create({ data: dados });

    return PrismaNotaServicoMapper.paraDominio(registro);
  }

  async iniciarProcessamentoEnvio(
    id: string,
    empresaId: string,
  ): Promise<NotaServico | null> {
    const resultado = await prisma.notaServico.updateMany({
      where: {
        id,
        empresaId,
        status: StatusNota.RASCUNHO,
      },
      data: {
        status: StatusNota.PROCESSANDO,
        mensagemErro: null,
        mensagemErroFiscal: null,
      },
    });

    if (resultado.count !== 1) {
      return null;
    }

    return this.buscarPorIdEEmpresaId(id, empresaId);
  }

  async buscarPorIdEEmpresaId(
    id: string,
    empresaId: string,
  ): Promise<NotaServico | null> {
    const registro = await prisma.notaServico.findFirst({
      where: { id, empresaId },
    });

    return registro ? PrismaNotaServicoMapper.paraDominio(registro) : null;
  }

  async listarPorEmpresaId(empresaId: string): Promise<NotaServico[]> {
    const registros = await prisma.notaServico.findMany({
      where: { empresaId },
      orderBy: { createdAt: 'asc' },
    });

    return registros.map(PrismaNotaServicoMapper.paraDominio);
  }

  async buscarMaiorNumeroDpsPorEmpresaAmbienteESerie(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
    serieDps: string,
  ): Promise<number | null> {
    const registros = await prisma.notaServico.findMany({
      where: {
        empresaId,
        ambienteFiscal,
        serieDps,
        numeroDps: {
          not: null,
        },
      },
      select: {
        numeroDps: true,
      },
    });
    const numeros = registros
      .map((registro) => Number(registro.numeroDps))
      .filter((numero) => Number.isSafeInteger(numero) && numero > 0);

    return numeros.length ? Math.max(...numeros) : null;
  }
}
