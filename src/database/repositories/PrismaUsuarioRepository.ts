import { PerfilUsuario, Usuario } from '../../entities/Usuario';
import { EmailJaCadastradoError } from '../../errors/EmailJaCadastradoError';
import { UsuarioRepository } from '../../repositories/UsuarioRepository';
import { PrismaUsuarioMapper } from '../mappers/PrismaUsuarioMapper';
import { prisma } from '../prisma.client';

export class PrismaUsuarioRepository implements UsuarioRepository {
  async salvar(usuario: Usuario): Promise<Usuario> {
    const dados = PrismaUsuarioMapper.paraPersistencia(usuario);

    try {
      const registro = usuario.id
        ? await prisma.usuario.update({
            where: { id: usuario.id },
            data: dados,
          })
        : await prisma.usuario.create({
            data: dados,
          });

      return PrismaUsuarioMapper.paraDominio(registro);
    } catch (error) {
      if (this.ehConflitoEmail(error)) {
        throw new EmailJaCadastradoError();
      }

      throw error;
    }
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const registro = await prisma.usuario.findUnique({
      where: { id },
    });

    return registro ? PrismaUsuarioMapper.paraDominio(registro) : null;
  }

  async buscarPorIdEEmpresaId(
    id: string,
    empresaId: string,
  ): Promise<Usuario | null> {
    const registro = await prisma.usuario.findFirst({
      where: {
        id,
        empresaId,
      },
    });

    return registro ? PrismaUsuarioMapper.paraDominio(registro) : null;
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const registro = await prisma.usuario.findUnique({
      where: { email },
    });

    return registro ? PrismaUsuarioMapper.paraDominio(registro) : null;
  }

  async buscarDonoPorEmpresaId(empresaId: string): Promise<Usuario | null> {
    const registro = await prisma.usuario.findFirst({
      where: {
        empresaId,
        perfil: PerfilUsuario.DONO,
      },
    });

    return registro ? PrismaUsuarioMapper.paraDominio(registro) : null;
  }

  async listarPorEmpresaId(empresaId: string): Promise<Usuario[]> {
    const registros = await prisma.usuario.findMany({
      where: { empresaId },
      orderBy: { createdAt: 'asc' },
    });

    return registros.map(PrismaUsuarioMapper.paraDominio);
  }

  private ehConflitoEmail(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002' &&
      'meta' in error &&
      typeof error.meta === 'object' &&
      error.meta !== null &&
      'modelName' in error.meta &&
      error.meta.modelName === 'Usuario'
    );
  }
}
