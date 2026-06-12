import { Usuario } from '../entities/Usuario';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { EmailJaCadastradoError } from '../errors/EmailJaCadastradoError';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export interface AtualizarContaUsuarioInput {
  nome: string;
  email: string;
}

export class AtualizarContaUsuarioService {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async executar(
    autenticacao: TokenPayload,
    dados: AtualizarContaUsuarioInput,
  ): Promise<Usuario> {
    const usuario = await this.usuarioRepository.buscarPorIdEEmpresaId(
      autenticacao.usuarioId,
      autenticacao.empresaId,
    );

    if (!usuario) {
      throw new AutenticacaoInvalidaError();
    }

    const email = dados.email.trim().toLowerCase();
    const usuarioComMesmoEmail =
      await this.usuarioRepository.buscarPorEmail(email);

    if (usuarioComMesmoEmail && usuarioComMesmoEmail.id !== usuario.id) {
      throw new EmailJaCadastradoError();
    }

    usuario.alterarNome(dados.nome);
    usuario.alterarEmail(email);

    return this.usuarioRepository.salvar(usuario);
  }
}
