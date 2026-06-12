import { Servico } from '../../entities/Servico';
import { ServicoRepository } from '../../repositories/ServicoRepository';
import { PrismaServicoMapper } from '../mappers/PrismaServicoMapper';
import { prisma } from '../prisma.client';

export class PrismaServicoRepository implements ServicoRepository {
  async salvar(servico: Servico): Promise<Servico> {
    const dados = PrismaServicoMapper.paraPersistencia(servico);

    const registro = servico.id
      ? await prisma.servico.update({
          where: { id: servico.id },
          data: dados,
        })
      : await prisma.servico.create({ data: dados });

    return PrismaServicoMapper.paraDominio(registro);
  }

  async buscarPorIdEEmpresaId(
    id: string,
    empresaId: string,
  ): Promise<Servico | null> {
    const registro = await prisma.servico.findFirst({
      where: { id, empresaId },
    });

    return registro ? PrismaServicoMapper.paraDominio(registro) : null;
  }

  async listarPorEmpresaId(empresaId: string): Promise<Servico[]> {
    const registros = await prisma.servico.findMany({
      where: { empresaId },
      orderBy: { createdAt: 'asc' },
    });

    return registros.map(PrismaServicoMapper.paraDominio);
  }
}
