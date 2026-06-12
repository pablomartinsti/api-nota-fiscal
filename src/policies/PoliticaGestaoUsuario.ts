import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { AcessoNegadoError } from '../errors/AcessoNegadoError';
import { TokenPayload } from '../security/GerenciadorToken';

export class PoliticaGestaoUsuario {
  validarListagem(perfilAtor: PerfilUsuario): void {
    if (![PerfilUsuario.DONO, PerfilUsuario.ADMIN].includes(perfilAtor)) {
      throw new AcessoNegadoError();
    }
  }

  validarCadastro(
    perfilAtor: PerfilUsuario,
    perfilNovoUsuario: PerfilUsuario,
  ): void {
    if (perfilNovoUsuario === PerfilUsuario.DONO) {
      throw new AcessoNegadoError();
    }

    if (perfilAtor === PerfilUsuario.DONO) {
      return;
    }

    if (
      perfilAtor === PerfilUsuario.ADMIN &&
      perfilNovoUsuario === PerfilUsuario.OPERADOR
    ) {
      return;
    }

    throw new AcessoNegadoError();
  }

  validarAlteracaoPerfil(
    perfilAtor: PerfilUsuario,
    usuarioAlvo: Usuario,
    novoPerfil: PerfilUsuario,
  ): void {
    if (
      perfilAtor !== PerfilUsuario.DONO ||
      usuarioAlvo.perfil === PerfilUsuario.DONO ||
      novoPerfil === PerfilUsuario.DONO
    ) {
      throw new AcessoNegadoError();
    }
  }

  validarAlteracaoStatus(
    ator: TokenPayload,
    usuarioAlvo: Usuario,
    ativo: boolean,
  ): void {
    if (usuarioAlvo.perfil === PerfilUsuario.DONO) {
      throw new AcessoNegadoError();
    }

    if (!ativo && ator.usuarioId === usuarioAlvo.id) {
      throw new AcessoNegadoError();
    }

    if (ator.perfil === PerfilUsuario.DONO) {
      return;
    }

    if (
      ator.perfil === PerfilUsuario.ADMIN &&
      usuarioAlvo.perfil === PerfilUsuario.OPERADOR
    ) {
      return;
    }

    throw new AcessoNegadoError();
  }
}
