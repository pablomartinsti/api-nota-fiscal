import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { EmailJaCadastradoError } from '../errors/EmailJaCadastradoError';
import { PoliticaGestaoUsuario } from '../policies/PoliticaGestaoUsuario';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { GeradorHash } from '../security/GeradorHash';
import { TokenPayload } from '../security/GerenciadorToken';

export interface CadastrarUsuarioEmpresaInput {
  autenticacao: TokenPayload;
  nome: string;
  email: string;
  senha: string;
  perfil: PerfilUsuario;
}

export class CadastrarUsuarioEmpresaService {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly geradorHash: GeradorHash,
    private readonly politica: PoliticaGestaoUsuario,
  ) {}

  async executar(input: CadastrarUsuarioEmpresaInput): Promise<Usuario> {
    this.politica.validarCadastro(input.autenticacao.perfil, input.perfil);

    const email = input.email.trim().toLowerCase();
    const usuarioExistente = await this.usuarioRepository.buscarPorEmail(email);

    if (usuarioExistente) {
      throw new EmailJaCadastradoError();
    }

    const senhaHash = await this.geradorHash.gerar(input.senha);
    const usuario = new Usuario({
      empresaId: input.autenticacao.empresaId,
      nome: input.nome,
      email,
      senhaHash,
      perfil: input.perfil,
    });

    return this.usuarioRepository.salvar(usuario);
  }
}
