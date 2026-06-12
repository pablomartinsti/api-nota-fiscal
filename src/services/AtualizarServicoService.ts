import { AlterarDadosServicoProps, Servico } from '../entities/Servico';
import { ServicoNaoEncontradoError } from '../errors/ServicoNaoEncontradoError';
import { ServicoRepository } from '../repositories/ServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export interface AtualizarServicoInput extends AlterarDadosServicoProps {
  aliquotaIss: number;
  valorPadrao?: number;
}

export class AtualizarServicoService {
  constructor(private readonly servicoRepository: ServicoRepository) {}

  async executar(
    autenticacao: TokenPayload,
    servicoId: string,
    dados: AtualizarServicoInput,
  ): Promise<Servico> {
    const servico = await this.servicoRepository.buscarPorIdEEmpresaId(
      servicoId,
      autenticacao.empresaId,
    );

    if (!servico) {
      throw new ServicoNaoEncontradoError();
    }

    servico.alterarDados(dados);
    servico.alterarAliquotaIss(dados.aliquotaIss);
    servico.alterarValorPadrao(dados.valorPadrao);

    return this.servicoRepository.salvar(servico);
  }
}
