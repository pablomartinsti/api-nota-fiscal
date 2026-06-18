import { AmbienteFiscal } from '../entities/NotaServico';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { CifradorTexto } from '../security/CifradorTexto';

export interface ConfiguracaoFiscalEmpresaResolvida {
  ambienteFiscalPadrao: AmbienteFiscal;
  serieDpsPadrao: string;
  certificadoA1Path?: string;
  certificadoA1Senha?: string;
}

export interface ConfiguracaoCertificadoA1EmpresaResolvida {
  caminho: string;
  senha: string;
}

export class ResolverConfiguracaoFiscalEmpresaService {
  constructor(
    private readonly configuracaoFiscalRepository: ConfiguracaoFiscalEmpresaRepository,
    private readonly cifradorTexto?: CifradorTexto,
  ) {}

  async executar(
    empresaId: string,
  ): Promise<ConfiguracaoFiscalEmpresaResolvida> {
    const configuracao =
      await this.configuracaoFiscalRepository.buscarPorEmpresaId(empresaId);

    if (!configuracao?.ativo) {
      return this.criarConfiguracaoPadrao();
    }

    return {
      ambienteFiscalPadrao: configuracao.ambienteFiscalPadrao,
      serieDpsPadrao: configuracao.serieDpsPadrao,
      certificadoA1Path: configuracao.certificadoA1Path,
      certificadoA1Senha: configuracao.certificadoA1Senha,
    };
  }

  async obterCertificadoA1(
    empresaId: string,
  ): Promise<ConfiguracaoCertificadoA1EmpresaResolvida | undefined> {
    const configuracao = await this.executar(empresaId);

    if (!configuracao.certificadoA1Path || !configuracao.certificadoA1Senha) {
      return undefined;
    }

    return {
      caminho: configuracao.certificadoA1Path,
      senha: this.obterSenhaEmTexto(configuracao.certificadoA1Senha),
    };
  }

  async obterCertificadoA1ParaAmbiente(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
  ): Promise<ConfiguracaoCertificadoA1EmpresaResolvida | undefined> {
    const certificado = await this.obterCertificadoA1(empresaId);

    if (certificado) {
      return certificado;
    }

    if (ambienteFiscal === AmbienteFiscal.PRODUCAO) {
      throw new CertificadoA1EmpresaProducaoAusenteError();
    }

    return undefined;
  }

  private obterSenhaEmTexto(senha: string): string {
    if (!this.cifradorTexto?.estaCriptografado(senha)) {
      return senha;
    }

    return this.cifradorTexto.descriptografar(senha);
  }

  private criarConfiguracaoPadrao(): ConfiguracaoFiscalEmpresaResolvida {
    return {
      ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
      serieDpsPadrao: '1',
    };
  }
}
