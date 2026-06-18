import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { AssinadorXmlDps } from '../fiscal/AssinadorXmlDps';
import { CertificadoA1, ProvedorCertificadoA1 } from '../fiscal/CertificadoA1';
import { ProvedorCertificadoA1Arquivo } from '../fiscal/ProvedorCertificadoA1Arquivo';
import { ValidadorXmlDps } from '../fiscal/ValidadorXmlDps';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { GerarXmlDpsNotaServicoService } from './GerarXmlDpsNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';

export class GerarXmlDpsAssinadoNotaServicoService {
  constructor(
    private readonly gerarXmlDpsService: GerarXmlDpsNotaServicoService,
    private readonly empresaRepository: EmpresaRepository,
    private readonly validadorXml: ValidadorXmlDps,
    private readonly provedorCertificado: ProvedorCertificadoA1,
    private readonly assinadorXml: AssinadorXmlDps,
    private readonly resolverConfiguracaoFiscal?: ResolverConfiguracaoFiscalEmpresaService,
  ) {}

  async executar(autenticacao: TokenPayload, notaId: string): Promise<string> {
    const xml = await this.gerarXmlDpsService.executar(autenticacao, notaId);
    const empresa = await this.empresaRepository.buscarPorId(
      autenticacao.empresaId,
    );

    if (!empresa) {
      throw new AutenticacaoInvalidaError();
    }

    await this.validadorXml.validar(xml);

    const certificado = await this.obterCertificado(autenticacao.empresaId);

    if (certificado.cnpj !== empresa.cnpj) {
      throw new CertificadoA1CnpjDivergenteError();
    }

    const xmlAssinado = this.assinadorXml.assinar(xml, certificado);

    await this.validadorXml.validar(xmlAssinado);

    return xmlAssinado;
  }

  private async obterCertificado(empresaId: string): Promise<CertificadoA1> {
    const configuracaoCertificado =
      await this.resolverConfiguracaoFiscal?.obterCertificadoA1(empresaId);

    if (!configuracaoCertificado) {
      return this.provedorCertificado.obter();
    }

    return new ProvedorCertificadoA1Arquivo(() => ({
      caminho: configuracaoCertificado.caminho,
      senha: configuracaoCertificado.senha,
    })).obter();
  }
}
