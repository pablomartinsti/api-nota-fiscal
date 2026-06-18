import {
  AlterarConfiguracaoFiscalEmpresaProps,
  ConfiguracaoFiscalEmpresa,
} from '../entities/ConfiguracaoFiscalEmpresa';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export interface AtualizarConfiguracaoFiscalEmpresaAutenticadaInput {
  ambienteFiscalPadrao: AlterarConfiguracaoFiscalEmpresaProps['ambienteFiscalPadrao'];
  serieDpsPadrao: string;
  certificadoA1Path?: string | null;
  certificadoA1Senha?: string | null;
}

export class AtualizarConfiguracaoFiscalEmpresaAutenticadaService {
  constructor(
    private readonly configuracaoFiscalRepository: ConfiguracaoFiscalEmpresaRepository,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    dados: AtualizarConfiguracaoFiscalEmpresaAutenticadaInput,
  ): Promise<ConfiguracaoFiscalEmpresa> {
    const configuracaoExistente =
      await this.configuracaoFiscalRepository.buscarPorEmpresaId(
        autenticacao.empresaId,
      );
    const dadosAlteracao = this.criarDadosAlteracao(
      dados,
      configuracaoExistente,
    );
    const configuracao =
      configuracaoExistente ??
      new ConfiguracaoFiscalEmpresa({
        empresaId: autenticacao.empresaId,
      });

    configuracao.alterarDados(dadosAlteracao);
    configuracao.ativar();

    return this.configuracaoFiscalRepository.salvar(configuracao);
  }

  private criarDadosAlteracao(
    dados: AtualizarConfiguracaoFiscalEmpresaAutenticadaInput,
    configuracaoExistente: ConfiguracaoFiscalEmpresa | null,
  ): AlterarConfiguracaoFiscalEmpresaProps {
    return {
      ambienteFiscalPadrao: dados.ambienteFiscalPadrao,
      serieDpsPadrao: dados.serieDpsPadrao,
      certificadoA1Path:
        dados.certificadoA1Path === undefined
          ? configuracaoExistente?.certificadoA1Path
          : dados.certificadoA1Path ?? undefined,
      certificadoA1Senha:
        dados.certificadoA1Senha === undefined
          ? configuracaoExistente?.certificadoA1Senha
          : dados.certificadoA1Senha ?? undefined,
    };
  }
}
