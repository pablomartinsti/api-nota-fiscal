import { Usuario } from '../entities/Usuario';

export class UsuarioPresenter {
  static paraHttp(usuario: Usuario) {
    return {
      id: usuario.id,
      empresaId: usuario.empresaId,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ativo: usuario.ativo,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
    };
  }
}
