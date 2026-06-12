import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { PoliticaGestaoUsuario } from '../policies/PoliticaGestaoUsuario';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class ListarUsuariosEmpresaService {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly politica: PoliticaGestaoUsuario,
  ) {}

  async executar(autenticacao: TokenPayload): Promise<Usuario[]> {
    this.politica.validarListagem(autenticacao.perfil);

    const usuarios = await this.usuarioRepository.listarPorEmpresaId(
      autenticacao.empresaId,
    );

    return autenticacao.perfil === PerfilUsuario.ADMIN
      ? usuarios.filter((usuario) => usuario.perfil === PerfilUsuario.OPERADOR)
      : usuarios;
  }
}
