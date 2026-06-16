import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { AssinadorXmlDps } from '../fiscal/AssinadorXmlDps';
import { ProvedorCertificadoA1 } from '../fiscal/CertificadoA1';
import { ValidadorXmlDps } from '../fiscal/ValidadorXmlDps';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { GerarXmlDpsNotaServicoService } from './GerarXmlDpsNotaServicoService';

export class GerarXmlDpsAssinadoNotaServicoService {
  constructor(
    private readonly gerarXmlDpsService: GerarXmlDpsNotaServicoService,
    private readonly empresaRepository: EmpresaRepository,
    private readonly validadorXml: ValidadorXmlDps,
    private readonly provedorCertificado: ProvedorCertificadoA1,
    private readonly assinadorXml: AssinadorXmlDps,
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

    const certificado = await this.provedorCertificado.obter();

    if (certificado.cnpj !== empresa.cnpj) {
      throw new CertificadoA1CnpjDivergenteError();
    }

    const xmlAssinado = this.assinadorXml.assinar(xml, certificado);

    await this.validadorXml.validar(xmlAssinado);

    return xmlAssinado;
  }
}
