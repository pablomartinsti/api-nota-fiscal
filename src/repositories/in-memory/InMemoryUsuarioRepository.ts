import { randomUUID } from 'node:crypto';

import { PerfilUsuario, Usuario } from '../../entities/Usuario';
import { UsuarioRepository } from '../UsuarioRepository';

export class InMemoryUsuarioRepository implements UsuarioRepository {
  items: Usuario[] = [];

  async salvar(usuario: Usuario): Promise<Usuario> {
    const usuarioPersistido = usuario.id
      ? usuario
      : new Usuario({
          id: randomUUID(),
          empresaId: usuario.empresaId,
          nome: usuario.nome,
          email: usuario.email,
          senhaHash: usuario.senhaHash,
          perfil: usuario.perfil,
          ativo: usuario.ativo,
          createdAt: usuario.createdAt,
          updatedAt: usuario.updatedAt,
        });

    const index = this.items.findIndex(
      (item) => item.id === usuarioPersistido.id,
    );

    if (index >= 0) {
      this.items[index] = usuarioPersistido;
    } else {
      this.items.push(usuarioPersistido);
    }

    return usuarioPersistido;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    return this.items.find((usuario) => usuario.id === id) ?? null;
  }

  async buscarPorIdEEmpresaId(
    id: string,
    empresaId: string,
  ): Promise<Usuario | null> {
    return (
      this.items.find(
        (usuario) => usuario.id === id && usuario.empresaId === empresaId,
      ) ?? null
    );
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    return this.items.find((usuario) => usuario.email === email) ?? null;
  }

  async buscarDonoPorEmpresaId(empresaId: string): Promise<Usuario | null> {
    return (
      this.items.find(
        (usuario) =>
          usuario.empresaId === empresaId &&
          usuario.perfil === PerfilUsuario.DONO,
      ) ?? null
    );
  }

  async listarPorEmpresaId(empresaId: string): Promise<Usuario[]> {
    return this.items.filter((usuario) => usuario.empresaId === empresaId);
  }
}
