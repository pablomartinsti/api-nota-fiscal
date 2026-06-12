import { Servico, ServicoProps } from '../entities/Servico';
import { ServicoRepository } from '../repositories/ServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

type DadosServico = Omit<
  ServicoProps,
  'id' | 'empresaId' | 'ativo' | 'createdAt' | 'updatedAt'
>;

export class CadastrarServicoService {
  constructor(private readonly servicoRepository: ServicoRepository) {}

  async executar(
    autenticacao: TokenPayload,
    dados: DadosServico,
  ): Promise<Servico> {
    const servico = new Servico({
      ...dados,
      empresaId: autenticacao.empresaId,
    });

    return this.servicoRepository.salvar(servico);
  }
}
