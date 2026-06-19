import { NotaServicoEventoFiscal } from '../../entities/NotaServicoEventoFiscal';
import { NotaServicoEventoFiscalRepository } from '../../repositories/NotaServicoEventoFiscalRepository';
import { PrismaNotaServicoEventoFiscalMapper } from '../mappers/PrismaNotaServicoEventoFiscalMapper';
import { prisma } from '../prisma.client';

export class PrismaNotaServicoEventoFiscalRepository
  implements NotaServicoEventoFiscalRepository
{
  async salvar(
    evento: NotaServicoEventoFiscal,
  ): Promise<NotaServicoEventoFiscal> {
    const registro = await prisma.notaServicoEventoFiscal.create({
      data: PrismaNotaServicoEventoFiscalMapper.paraPersistencia(evento),
    });

    return PrismaNotaServicoEventoFiscalMapper.paraDominio(registro);
  }

  async listarPorNotaEEmpresa(
    notaServicoId: string,
    empresaId: string,
  ): Promise<NotaServicoEventoFiscal[]> {
    const registros = await prisma.notaServicoEventoFiscal.findMany({
      where: {
        notaServicoId,
        empresaId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return registros.map(PrismaNotaServicoEventoFiscalMapper.paraDominio);
  }
}
