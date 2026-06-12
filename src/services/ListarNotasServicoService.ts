import { NotaServico } from '../entities/NotaServico';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class ListarNotasServicoService {
  constructor(private readonly notaRepository: NotaServicoRepository) {}

  async executar(autenticacao: TokenPayload): Promise<NotaServico[]> {
    return this.notaRepository.listarPorEmpresaId(autenticacao.empresaId);
  }
}
