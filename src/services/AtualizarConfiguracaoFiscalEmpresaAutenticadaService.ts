import {
  AlterarConfiguracaoFiscalEmpresaProps,
  ConfiguracaoFiscalEmpresa,
} from '../entities/ConfiguracaoFiscalEmpresa';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { ProvedorCertificadoA1 } from '../fiscal/CertificadoA1';
import {
  ConfiguracaoCertificadoA1,
  ProvedorCertificadoA1Arquivo,
} from '../fiscal/ProvedorCertificadoA1Arquivo';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { CifradorTexto } from '../security/CifradorTexto';
import { TokenPayload } from '../security/GerenciadorToken';

export interface AtualizarConfiguracaoFiscalEmpresaAutenticadaInput {
  ambienteFiscalPadrao: AlterarConfiguracaoFiscalEmpresaProps['ambienteFiscalPadrao'];
  serieDpsPadrao: string;
  certificadoA1Path?: string | null;
  certificadoA1Senha?: string | null;
}

export type CriarProvedorCertificadoA1 = (
  configuracao: ConfiguracaoCertificadoA1,
) => ProvedorCertificadoA1;

export class AtualizarConfiguracaoFiscalEmpresaAutenticadaService {
  constructor(
    private readonly configuracaoFiscalRepository: ConfiguracaoFiscalEmpresaRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly cifradorTexto: CifradorTexto,
    private readonly criarProvedorCertificado: CriarProvedorCertificadoA1 = (
      configuracao,
    ) => new ProvedorCertificadoA1Arquivo(() => configuracao),
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

    if (this.deveValidarCertificado(dados)) {
      await this.validarCertificadoDaEmpresa(
        autenticacao.empresaId,
        dadosAlteracao,
      );
    }

    const dadosPersistencia = this.criptografarSenhaParaPersistencia(
      dadosAlteracao,
      dados,
    );
    const configuracao =
      configuracaoExistente ??
      new ConfiguracaoFiscalEmpresa({
        empresaId: autenticacao.empresaId,
      });

    configuracao.alterarDados(dadosPersistencia);
    configuracao.ativar();

    return this.configuracaoFiscalRepository.salvar(configuracao);
  }

  private deveValidarCertificado(
    dados: AtualizarConfiguracaoFiscalEmpresaAutenticadaInput,
  ): boolean {
    return (
      dados.certificadoA1Path !== undefined ||
      dados.certificadoA1Senha !== undefined
    );
  }

  private async validarCertificadoDaEmpresa(
    empresaId: string,
    dados: AlterarConfiguracaoFiscalEmpresaProps,
  ): Promise<void> {
    if (!dados.certificadoA1Path || !dados.certificadoA1Senha) {
      return;
    }

    const empresa = await this.empresaRepository.buscarPorId(empresaId);

    if (!empresa) {
      throw new AutenticacaoInvalidaError();
    }

    const certificado = await this.criarProvedorCertificado({
      caminho: dados.certificadoA1Path,
      senha: this.obterSenhaEmTexto(dados.certificadoA1Senha),
    }).obter();

    if (certificado.cnpj !== empresa.cnpj) {
      throw new CertificadoA1CnpjDivergenteError();
    }
  }

  private criptografarSenhaParaPersistencia(
    dados: AlterarConfiguracaoFiscalEmpresaProps,
    input: AtualizarConfiguracaoFiscalEmpresaAutenticadaInput,
  ): AlterarConfiguracaoFiscalEmpresaProps {
    if (!dados.certificadoA1Senha || input.certificadoA1Senha === undefined) {
      return dados;
    }

    if (this.cifradorTexto.estaCriptografado(dados.certificadoA1Senha)) {
      return dados;
    }

    return {
      ...dados,
      certificadoA1Senha: this.cifradorTexto.criptografar(
        dados.certificadoA1Senha,
      ),
    };
  }

  private obterSenhaEmTexto(senha: string): string {
    if (!this.cifradorTexto.estaCriptografado(senha)) {
      return senha;
    }

    return this.cifradorTexto.descriptografar(senha);
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
