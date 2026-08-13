import { AmbienteFiscal } from '../entities/NotaServico';
import { RegimeTributario } from '../entities/Empresa';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { EmpresaEmissaoBloqueadaError } from '../errors/EmpresaEmissaoBloqueadaError';
import { RegimeTributarioProducaoNaoSuportadoError } from '../errors/RegimeTributarioProducaoNaoSuportadoError';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { CifradorTexto } from '../security/CifradorTexto';

export interface ConfiguracaoFiscalEmpresaResolvida {
  ambienteFiscalPadrao: AmbienteFiscal;
  serieDpsPadrao: string;
  certificadoA1NomeArquivo?: string;
  certificadoA1Conteudo?: string;
  certificadoA1Senha?: string;
  emissaoHabilitada: boolean;
}

export interface ConfiguracaoCertificadoA1EmpresaResolvida {
  conteudoBase64?: string;
  senha: string;
}

export class ResolverConfiguracaoFiscalEmpresaService {
  constructor(
    private readonly configuracaoFiscalRepository: ConfiguracaoFiscalEmpresaRepository,
    private readonly empresaRepository: EmpresaRepository,
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
      ...(configuracao.certificadoA1NomeArquivo
        ? { certificadoA1NomeArquivo: configuracao.certificadoA1NomeArquivo }
        : {}),
      ...(configuracao.certificadoA1Conteudo
        ? { certificadoA1Conteudo: configuracao.certificadoA1Conteudo }
        : {}),
      ...(configuracao.certificadoA1Senha
        ? { certificadoA1Senha: configuracao.certificadoA1Senha }
        : {}),
      emissaoHabilitada: configuracao.emissaoHabilitada,
    };
  }

  async validarEmissaoHabilitada(empresaId: string): Promise<void> {
    const configuracao =
      await this.configuracaoFiscalRepository.buscarPorEmpresaId(empresaId);

    if (configuracao?.emissaoHabilitada === false) {
      throw new EmpresaEmissaoBloqueadaError();
    }
  }

  async obterCertificadoA1(
    empresaId: string,
  ): Promise<ConfiguracaoCertificadoA1EmpresaResolvida | undefined> {
    const configuracao = await this.executar(empresaId);

    if (
      !configuracao.certificadoA1Senha ||
      !configuracao.certificadoA1Conteudo
    ) {
      return undefined;
    }

    return {
      conteudoBase64: configuracao.certificadoA1Conteudo
        ? this.obterTextoEmClaro(configuracao.certificadoA1Conteudo)
        : undefined,
      senha: this.obterSenhaEmTexto(configuracao.certificadoA1Senha),
    };
  }

  async obterCertificadoA1ParaAmbiente(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
  ): Promise<ConfiguracaoCertificadoA1EmpresaResolvida | undefined> {
    if (ambienteFiscal === AmbienteFiscal.PRODUCAO) {
      await this.validarRegimeProducaoReal(empresaId);
    }

    const certificado = await this.obterCertificadoA1(empresaId);

    if (certificado) {
      return certificado;
    }

    if (ambienteFiscal === AmbienteFiscal.PRODUCAO) {
      throw new CertificadoA1EmpresaProducaoAusenteError();
    }

    return undefined;
  }

  private async validarRegimeProducaoReal(empresaId: string): Promise<void> {
    const empresa = await this.empresaRepository.buscarPorId(empresaId);

    if (!empresa) {
      throw new AutenticacaoInvalidaError();
    }

    if (empresa.regimeTributario !== RegimeTributario.SIMPLES_NACIONAL) {
      throw new RegimeTributarioProducaoNaoSuportadoError();
    }
  }

  private obterSenhaEmTexto(senha: string): string {
    return this.obterTextoEmClaro(senha);
  }

  private obterTextoEmClaro(texto: string): string {
    if (!this.cifradorTexto?.estaCriptografado(texto)) {
      return texto;
    }

    return this.cifradorTexto.descriptografar(texto);
  }

  private criarConfiguracaoPadrao(): ConfiguracaoFiscalEmpresaResolvida {
    return {
      ambienteFiscalPadrao: AmbienteFiscal.HOMOLOGACAO,
      serieDpsPadrao: '1',
      emissaoHabilitada: true,
    };
  }
}
