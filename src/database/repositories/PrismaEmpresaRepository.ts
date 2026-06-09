import { Empresa } from '../../entities/Empresa';
import { EmpresaRepository } from '../../repositories/EmpresaRepository';
import { prisma } from '../prisma.client';
import { PrismaEmpresaMapper } from '../mappers/PrismaEmpresaMapper';

export class PrismaEmpresaRepository implements EmpresaRepository {
  async salvar(empresa: Empresa): Promise<Empresa> {
    const dados = PrismaEmpresaMapper.paraPersistencia(empresa);

    const registro = empresa.id
      ? await prisma.empresa.update({
          where: { id: empresa.id },
          data: dados,
        })
      : await prisma.empresa.create({
          data: dados,
        });

    return PrismaEmpresaMapper.paraDominio(registro);
  }

  async buscarPorId(id: string): Promise<Empresa | null> {
    const registro = await prisma.empresa.findUnique({
      where: { id },
    });

    return registro ? PrismaEmpresaMapper.paraDominio(registro) : null;
  }

  async buscarPorCnpj(cnpj: string): Promise<Empresa | null> {
    const registro = await prisma.empresa.findUnique({
      where: { cnpj },
    });

    return registro ? PrismaEmpresaMapper.paraDominio(registro) : null;
  }
}
