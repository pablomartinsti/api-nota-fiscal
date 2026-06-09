import {
  PerfilUsuario as PrismaPerfilUsuario,
  Usuario as PrismaUsuario,
} from '@prisma/client';

import { PerfilUsuario, Usuario } from '../../entities/Usuario';

export class PrismaUsuarioMapper {
  static paraDominio(registro: PrismaUsuario): Usuario {
    return new Usuario({
      id: registro.id,
      empresaId: registro.empresaId,
      nome: registro.nome,
      email: registro.email,
      senhaHash: registro.senhaHash,
      perfil: registro.perfil as PerfilUsuario,
      ativo: registro.ativo,
      createdAt: registro.createdAt,
      updatedAt: registro.updatedAt,
    });
  }

  static paraPersistencia(usuario: Usuario) {
    return {
      empresaId: usuario.empresaId,
      nome: usuario.nome,
      email: usuario.email,
      senhaHash: usuario.senhaHash,
      perfil: usuario.perfil as PrismaPerfilUsuario,
      ativo: usuario.ativo,
    };
  }
}
