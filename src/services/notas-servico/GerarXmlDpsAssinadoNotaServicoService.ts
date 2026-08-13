import { AmbienteFiscal } from '../../entities/NotaServico';
import { AutenticacaoInvalidaError } from '../../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../../errors/CertificadoA1CnpjDivergenteError';
import { NotaServicoNaoEncontradaError } from '../../errors/NotaServicoNaoEncontradaError';
import { AssinadorXmlDps } from '../../fiscal/xml/AssinadorXmlDps';
import { ProvedorCertificadoA1 } from '../../fiscal/certificados-a1/CertificadoA1';
import { ValidadorXmlDps } from '../../fiscal/xml/ValidadorXmlDps';
import { EmpresaRepository } from '../../repositories/EmpresaRepository';
import { NotaServicoRepository } from '../../repositories/NotaServicoRepository';
import { TokenPayload } from '../../security/GerenciadorToken';
import { GerarXmlDpsNotaServicoService } from './GerarXmlDpsNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from '../fiscal/ResolverConfiguracaoFiscalEmpresaService';
import { obterCertificadoA1Fiscal } from '../fiscal/PrepararInputClienteNfseService';

export class GerarXmlDpsAssinadoNotaServicoService {
  constructor(
    private readonly gerarXmlDpsService: GerarXmlDpsNotaServicoService,
    private readonly empresaRepository: EmpresaRepository,
    private readonly validadorXml: ValidadorXmlDps,
    private readonly provedorCertificado: ProvedorCertificadoA1 | undefined,
    private readonly assinadorXml: AssinadorXmlDps,
    private readonly resolverConfiguracaoFiscal: ResolverConfiguracaoFiscalEmpresaService,
    private readonly notaRepository: NotaServicoRepository,
  ) {}

  async executar(autenticacao: TokenPayload, notaId: string): Promise<string> {
    const ambienteFiscal = await this.buscarAmbienteFiscal(
      autenticacao,
      notaId,
    );
    const certificado = await obterCertificadoA1Fiscal({
      resolverConfiguracaoFiscal: this.resolverConfiguracaoFiscal,
      provedorCertificado: this.provedorCertificado,
      empresaId: autenticacao.empresaId,
      ambienteFiscal,
    });

    const xml = await this.gerarXmlDpsService.executar(autenticacao, notaId);
    const empresa = await this.empresaRepository.buscarPorId(
      autenticacao.empresaId,
    );

    if (!empresa) {
      throw new AutenticacaoInvalidaError();
    }

    await this.validadorXml.validar(xml);

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
  ): Promise<AmbienteFiscal> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    return nota.ambienteFiscal;
  }
}
