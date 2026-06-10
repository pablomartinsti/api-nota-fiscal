import { PerfilUsuario, Usuario } from '../../entities/Usuario';
import { UsuarioRepository } from '../../repositories/UsuarioRepository';
import { PrismaUsuarioMapper } from '../mappers/PrismaUsuarioMapper';
import { prisma } from '../prisma.client';

export class PrismaUsuarioRepository implements UsuarioRepository {
  async salvar(usuario: Usuario): Promise<Usuario> {
    const dados = PrismaUsuarioMapper.paraPersistencia(usuario);

    const registro = usuario.id
      ? await prisma.usuario.update({
          where: { id: usuario.id },
          data: dados,
        })
      : await prisma.usuario.create({
          data: dados,
        });

    return PrismaUsuarioMapper.paraDominio(registro);
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const registro = await prisma.usuario.findUnique({
      where: { id },
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
}
