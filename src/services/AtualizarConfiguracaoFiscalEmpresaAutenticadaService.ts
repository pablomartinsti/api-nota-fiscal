import {
  AlterarConfiguracaoFiscalEmpresaProps,
  ConfiguracaoFiscalEmpresa,
} from '../entities/ConfiguracaoFiscalEmpresa';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { TokenPayload } from '../security/GerenciadorToken';

export interface AtualizarConfiguracaoFiscalEmpresaAutenticadaInput {
  ambienteFiscalPadrao: AlterarConfiguracaoFiscalEmpresaProps['ambienteFiscalPadrao'];
  serieDpsPadrao: string;
  removerCertificadoA1?: boolean;
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
    const removerCertificado = dados.removerCertificadoA1 === true;

    return {
      ambienteFiscalPadrao: dados.ambienteFiscalPadrao,
      serieDpsPadrao: dados.serieDpsPadrao,
      certificadoA1Path: undefined,
      certificadoA1NomeArquivo: removerCertificado
        ? undefined
        : configuracaoExistente?.certificadoA1NomeArquivo,
      certificadoA1Conteudo: removerCertificado
        ? undefined
        : configuracaoExistente?.certificadoA1Conteudo,
      certificadoA1Senha: removerCertificado
        ? undefined
        : configuracaoExistente?.certificadoA1Senha,
      certificadoA1ValidoAte: removerCertificado
        ? undefined
        : configuracaoExistente?.certificadoA1ValidoAte,
    };
  }
}
