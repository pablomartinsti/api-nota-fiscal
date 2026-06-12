import { Cliente } from '../../entities/Cliente';
import { ClienteRepository } from '../../repositories/ClienteRepository';
import { PrismaClienteMapper } from '../mappers/PrismaClienteMapper';
import { prisma } from '../prisma.client';

export class PrismaClienteRepository implements ClienteRepository {
  async salvar(cliente: Cliente): Promise<Cliente> {
    const dados = PrismaClienteMapper.paraPersistencia(cliente);

    const registro = cliente.id
      ? await prisma.cliente.update({
          where: { id: cliente.id },
          data: dados,
        })
      : await prisma.cliente.create({ data: dados });

    return PrismaClienteMapper.paraDominio(registro);
  }

  async buscarPorIdEEmpresaId(
    id: string,
    empresaId: string,
  ): Promise<Cliente | null> {
    const registro = await prisma.cliente.findFirst({
      where: { id, empresaId },
    });

    return registro ? PrismaClienteMapper.paraDominio(registro) : null;
  }

  async buscarPorCpfCnpjEEmpresaId(
    cpfCnpj: string,
    empresaId: string,
  ): Promise<Cliente | null> {
    const registro = await prisma.cliente.findUnique({
      where: {
        empresaId_cpfCnpj: {
          empresaId,
          cpfCnpj,
        },
      },
    });

    return registro ? PrismaClienteMapper.paraDominio(registro) : null;
  }

  async listarPorEmpresaId(empresaId: string): Promise<Cliente[]> {
    const registros = await prisma.cliente.findMany({
      where: { empresaId },
      orderBy: { createdAt: 'asc' },
    });

    return registros.map(PrismaClienteMapper.paraDominio);
  }
}
