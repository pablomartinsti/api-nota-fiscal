import { AmbienteFiscal } from '../entities/NotaServico';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { ConfiguracaoFiscalAusenteError } from '../errors/ConfiguracaoFiscalAusenteError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { AssinadorXmlDps } from '../fiscal/AssinadorXmlDps';
import { CertificadoA1, ProvedorCertificadoA1 } from '../fiscal/CertificadoA1';
import { ProvedorCertificadoA1Arquivo } from '../fiscal/ProvedorCertificadoA1Arquivo';
import { ValidadorXmlDps } from '../fiscal/ValidadorXmlDps';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { GerarXmlDpsNotaServicoService } from './GerarXmlDpsNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { obterConfiguracaoCertificadoNotaServico } from './PrepararInputClienteNfseService';

export class GerarXmlDpsAssinadoNotaServicoService {
  constructor(
    private readonly gerarXmlDpsService: GerarXmlDpsNotaServicoService,
    private readonly empresaRepository: EmpresaRepository,
    private readonly validadorXml: ValidadorXmlDps,
    private readonly provedorCertificado: ProvedorCertificadoA1 | undefined,
    private readonly assinadorXml: AssinadorXmlDps,
    private readonly resolverConfiguracaoFiscal?: ResolverConfiguracaoFiscalEmpresaService,
    private readonly notaRepository?: NotaServicoRepository,
  ) {}

  async executar(autenticacao: TokenPayload, notaId: string): Promise<string> {
    const ambienteFiscal = await this.buscarAmbienteFiscal(
      autenticacao,
      notaId,
    );
    if (ambienteFiscal) {
      await obterConfiguracaoCertificadoNotaServico(
        this.resolverConfiguracaoFiscal,
        autenticacao.empresaId,
        ambienteFiscal,
      );
    }

    const xml = await this.gerarXmlDpsService.executar(autenticacao, notaId);
    const empresa = await this.empresaRepository.buscarPorId(
      autenticacao.empresaId,
    );

    if (!empresa) {
      throw new AutenticacaoInvalidaError();
    }

    await this.validadorXml.validar(xml);

    const certificado = await this.obterCertificado(
      autenticacao.empresaId,
      ambienteFiscal,
    );

    if (certificado.cnpj !== empresa.cnpj) {
      throw new CertificadoA1CnpjDivergenteError();
    }

    const xmlAssinado = this.assinadorXml.assinar(xml, certificado);

    await this.validadorXml.validar(xmlAssinado);

    return xmlAssinado;
  }

  private async buscarAmbienteFiscal(
    autenticacao: TokenPayload,
    notaId: string,
  ): Promise<AmbienteFiscal | undefined> {
    if (!this.notaRepository) {
      return undefined;
    }

    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    return nota.ambienteFiscal;
  }

  private async obterCertificado(
    empresaId: string,
    ambienteFiscal?: AmbienteFiscal,
  ): Promise<CertificadoA1> {
    const configuracaoCertificado =
      await obterConfiguracaoCertificadoNotaServico(
        this.resolverConfiguracaoFiscal,
        empresaId,
        ambienteFiscal,
      );

    if (!configuracaoCertificado) {
      if (this.provedorCertificado) {
        return this.provedorCertificado.obter();
      }

      throw new ConfiguracaoFiscalAusenteError();
    }

    return new ProvedorCertificadoA1Arquivo(() => ({
      conteudoBase64: configuracaoCertificado.conteudoBase64,
      senha: configuracaoCertificado.senha,
    })).obter();
  }

}
