import { Servico } from '../entities/Servico';
import { ServicoRepository } from '../repositories/ServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export class ListarServicosService {
  constructor(private readonly servicoRepository: ServicoRepository) {}

  async executar(autenticacao: TokenPayload): Promise<Servico[]> {
    return this.servicoRepository.listarPorEmpresaId(autenticacao.empresaId);
  }
}
