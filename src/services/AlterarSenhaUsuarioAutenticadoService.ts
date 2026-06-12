import { Usuario } from '../entities/Usuario';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { SenhaAtualIncorretaError } from '../errors/SenhaAtualIncorretaError';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { ComparadorHash } from '../security/ComparadorHash';
import { GeradorHash } from '../security/GeradorHash';
import { TokenPayload } from '../security/GerenciadorToken';

export class AlterarSenhaUsuarioAutenticadoService {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly comparadorHash: ComparadorHash,
    private readonly geradorHash: GeradorHash,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    senhaAtual: string,
    novaSenha: string,
  ): Promise<Usuario> {
    const usuario = await this.usuarioRepository.buscarPorIdEEmpresaId(
      autenticacao.usuarioId,
      autenticacao.empresaId,
    );

    if (!usuario) {
      throw new AutenticacaoInvalidaError();
    }

    const senhaCorreta = await this.comparadorHash.comparar(
      senhaAtual,
      usuario.senhaHash,
    );

    if (!senhaCorreta) {
      throw new SenhaAtualIncorretaError();
    }

    usuario.alterarSenhaHash(await this.geradorHash.gerar(novaSenha));

    return this.usuarioRepository.salvar(usuario);
  }
}
