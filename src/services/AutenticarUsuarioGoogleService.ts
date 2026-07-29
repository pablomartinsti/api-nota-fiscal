import { Usuario } from '../entities/Usuario';
import { CredenciaisInvalidasError } from '../errors/CredenciaisInvalidasError';
import { LoginGoogleNaoConfiguradoError } from '../errors/LoginGoogleNaoConfiguradoError';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { GerenciadorToken } from '../security/GerenciadorToken';
import { VerificadorTokenGoogle } from '../security/GoogleIdentityTokenVerifier';

export interface AutenticarUsuarioGoogleInput {
  credential: string;
}

export interface AutenticarUsuarioGoogleOutput {
  token: string;
  usuario: Usuario;
}

export class AutenticarUsuarioGoogleService {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly gerenciadorToken: GerenciadorToken,
    private readonly verificadorTokenGoogle?: VerificadorTokenGoogle,
  ) {}

  async executar(
    input: AutenticarUsuarioGoogleInput,
  ): Promise<AutenticarUsuarioGoogleOutput> {
    if (!this.verificadorTokenGoogle) {
      throw new LoginGoogleNaoConfiguradoError();
    }

    const payload = await this.verificarCredential(input.credential);

    if (!payload.emailVerified) {
      throw new CredenciaisInvalidasError();
    }

    const email = payload.email.trim().toLowerCase();
    const usuario = await this.usuarioRepository.buscarPorEmail(email);

    if (!usuario?.ativo) {
      throw new CredenciaisInvalidasError();
    }

    const empresa = await this.empresaRepository.buscarPorId(usuario.empresaId);

    if (!empresa?.ativo || !usuario.id) {
      throw new CredenciaisInvalidasError();
    }

    const token = await this.gerenciadorToken.gerar({
      usuarioId: usuario.id,
      empresaId: usuario.empresaId,
      perfil: usuario.perfil,
    });

    return {
      token,
      usuario,
    };
  }

  private async verificarCredential(credential: string) {
    try {
      return await this.verificadorTokenGoogle!.verificar(credential);
    } catch {
      throw new CredenciaisInvalidasError();
    }
  }
}
