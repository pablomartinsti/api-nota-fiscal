import { NotaServico } from '../../entities/NotaServico';
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
}
