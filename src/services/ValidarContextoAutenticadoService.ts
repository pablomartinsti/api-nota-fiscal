import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class ValidarContextoAutenticadoService {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly empresaRepository: EmpresaRepository,
  ) {}

  async executar(payload: TokenPayload): Promise<TokenPayload> {
    const usuario = await this.usuarioRepository.buscarPorId(payload.usuarioId);

    if (!usuario?.ativo || usuario.empresaId !== payload.empresaId) {
      throw new AutenticacaoInvalidaError();
    }

    const empresa = await this.empresaRepository.buscarPorId(usuario.empresaId);

    if (!empresa?.ativo || !usuario.id) {
      throw new AutenticacaoInvalidaError();
    }

    return {
      usuarioId: usuario.id,
      empresaId: usuario.empresaId,
      perfil: usuario.perfil,
    };
  }
}
