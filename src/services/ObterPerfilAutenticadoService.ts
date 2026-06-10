import { Empresa } from '../entities/Empresa';
import { Usuario } from '../entities/Usuario';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export interface ObterPerfilAutenticadoOutput {
  usuario: Usuario;
  empresa: Empresa;
}

export class ObterPerfilAutenticadoService {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly empresaRepository: EmpresaRepository,
  ) {}

  async executar(
    autenticacao: TokenPayload,
  ): Promise<ObterPerfilAutenticadoOutput> {
    const [usuario, empresa] = await Promise.all([
      this.usuarioRepository.buscarPorId(autenticacao.usuarioId),
      this.empresaRepository.buscarPorId(autenticacao.empresaId),
    ]);

    if (!usuario || !empresa || usuario.empresaId !== empresa.id) {
      throw new AutenticacaoInvalidaError();
    }

    return { usuario, empresa };
  }
}
