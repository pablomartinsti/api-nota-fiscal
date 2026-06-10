import { Usuario } from '../entities/Usuario';
import { CredenciaisInvalidasError } from '../errors/CredenciaisInvalidasError';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { ComparadorHash } from '../security/ComparadorHash';
import { GerenciadorToken } from '../security/GerenciadorToken';

export interface AutenticarUsuarioInput {
  email: string;
  senha: string;
}

export interface AutenticarUsuarioOutput {
  token: string;
  usuario: Usuario;
}

export class AutenticarUsuarioService {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly comparadorHash: ComparadorHash,
    private readonly gerenciadorToken: GerenciadorToken,
  ) {}

  async executar(
    input: AutenticarUsuarioInput,
  ): Promise<AutenticarUsuarioOutput> {
    const email = input.email.trim().toLowerCase();
    const usuario = await this.usuarioRepository.buscarPorEmail(email);

    if (!usuario) {
      throw new CredenciaisInvalidasError();
    }

    const senhaCorreta = await this.comparadorHash.comparar(
      input.senha,
      usuario.senhaHash,
    );

    if (!senhaCorreta || !usuario.ativo) {
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
}
