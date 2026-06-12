import { Usuario } from '../entities/Usuario';
import { UsuarioNaoEncontradoError } from '../errors/UsuarioNaoEncontradoError';
import { PoliticaGestaoUsuario } from '../policies/PoliticaGestaoUsuario';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class AlterarStatusUsuarioService {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly politica: PoliticaGestaoUsuario,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    usuarioId: string,
    ativo: boolean,
  ): Promise<Usuario> {
    const usuario = await this.usuarioRepository.buscarPorIdEEmpresaId(
      usuarioId,
      autenticacao.empresaId,
    );

    if (!usuario) {
      throw new UsuarioNaoEncontradoError();
    }

    this.politica.validarAlteracaoStatus(autenticacao, usuario, ativo);
    ativo ? usuario.ativar() : usuario.desativar();

    return this.usuarioRepository.salvar(usuario);
  }
}
