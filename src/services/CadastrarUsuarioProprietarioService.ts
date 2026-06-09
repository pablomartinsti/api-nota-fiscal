import { PerfilUsuario, Usuario } from '../entities/Usuario';
import { EmailJaCadastradoError } from '../errors/EmailJaCadastradoError';
import { EmpresaInativaError } from '../errors/EmpresaInativaError';
import { EmpresaNaoEncontradaError } from '../errors/EmpresaNaoEncontradaError';
import { ProprietarioJaCadastradoError } from '../errors/ProprietarioJaCadastradoError';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { UsuarioRepository } from '../repositories/UsuarioRepository';
import { GeradorHash } from '../security/GeradorHash';

export interface CadastrarUsuarioProprietarioInput {
  empresaId: string;
  nome: string;
  email: string;
  senha: string;
}

export class CadastrarUsuarioProprietarioService {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly usuarioRepository: UsuarioRepository,
    private readonly geradorHash: GeradorHash,
  ) {}

  async executar(input: CadastrarUsuarioProprietarioInput): Promise<Usuario> {
    const empresaId = input.empresaId.trim();
    const email = input.email.trim().toLowerCase();

    if (!input.senha.trim()) {
      throw new Error('Senha é obrigatória.');
    }

    const empresa = await this.empresaRepository.buscarPorId(empresaId);

    if (!empresa) {
      throw new EmpresaNaoEncontradaError();
    }

    if (!empresa.ativo) {
      throw new EmpresaInativaError();
    }

    const usuarioComMesmoEmail =
      await this.usuarioRepository.buscarPorEmail(email);

    if (usuarioComMesmoEmail) {
      throw new EmailJaCadastradoError();
    }

    const proprietarioExistente =
      await this.usuarioRepository.buscarDonoPorEmpresaId(empresaId);

    if (proprietarioExistente) {
      throw new ProprietarioJaCadastradoError();
    }

    const senhaHash = await this.geradorHash.gerar(input.senha);
    const usuario = new Usuario({
      empresaId,
      nome: input.nome,
      email,
      senhaHash,
      perfil: PerfilUsuario.DONO,
    });

    return this.usuarioRepository.salvar(usuario);
  }
}
