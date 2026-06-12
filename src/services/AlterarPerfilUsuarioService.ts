import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { UsuarioNaoEncontradoError } from '../errors/UsuarioNaoEncontradoError';
import { PoliticaGestaoUsuario } from '../policies/PoliticaGestaoUsuario';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class AlterarPerfilUsuarioService {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly politica: PoliticaGestaoUsuario,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    usuarioId: string,
    perfil: PerfilUsuario,
  ): Promise<Usuario> {
    const usuario = await this.usuarioRepository.buscarPorIdEEmpresaId(
      usuarioId,
      autenticacao.empresaId,
    );

    if (!usuario) {
      throw new UsuarioNaoEncontradoError();
    }

    this.politica.validarAlteracaoPerfil(autenticacao.perfil, usuario, perfil);
    usuario.alterarPerfil(perfil);

    return this.usuarioRepository.salvar(usuario);
  }
}
