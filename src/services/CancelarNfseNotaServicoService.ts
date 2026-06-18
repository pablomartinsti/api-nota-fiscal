import { NotaServico, StatusNota } from '../entities/NotaServico';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { AssinadorXmlDps } from '../fiscal/AssinadorXmlDps';
import { CertificadoA1, ProvedorCertificadoA1 } from '../fiscal/CertificadoA1';
import {
  ClienteNfseNacional,
  ErroEnvioDpsNfse,
} from '../fiscal/ClienteNfseNacional';
import {
  CodigoMotivoCancelamentoNfse,
  GeradorXmlPedidoCancelamentoNfseNacional,
} from '../fiscal/GeradorXmlPedidoCancelamentoNfseNacional';
import { ProvedorCertificadoA1Arquivo } from '../fiscal/ProvedorCertificadoA1Arquivo';
import { ValidadorXmlDps } from '../fiscal/ValidadorXmlDps';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

export interface CancelarNfseNotaServicoInput {
  codigoMotivo: CodigoMotivoCancelamentoNfse;
  motivo: string;
}

export interface CancelarNfseNotaServicoResultado {
  nota: NotaServico;
  sucesso: boolean;
  statusHttp: number;
  tipoAmbiente?: number;
  versaoAplicativo?: string;
  dataHoraProcessamento?: string;
  xmlEvento?: string;
  erros?: ErroEnvioDpsNfse[];
}

export class CancelarNfseNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly geradorXml: GeradorXmlPedidoCancelamentoNfseNacional,
    private readonly validadorXml: ValidadorXmlDps,
    private readonly provedorCertificado: ProvedorCertificadoA1,
    private readonly assinadorXml: AssinadorXmlDps,
    private readonly clienteNfse: ClienteNfseNacional,
    private readonly resolverConfiguracaoFiscal?: ResolverConfiguracaoFiscalEmpresaService,
    private readonly validarPermissaoProducaoReal?: ValidarPermissaoProducaoRealService,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
    input: CancelarNfseNotaServicoInput,
  ): Promise<CancelarNfseNotaServicoResultado> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (nota.status !== StatusNota.EMITIDA) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente uma nota emitida pode ser cancelada na SEFIN Nacional.',
      );
    }

    if (!nota.chaveAcesso) {
      throw new TransicaoStatusNotaInvalidaError(
        'A nota emitida nao possui chave de acesso para cancelamento.',
      );
    }

    this.validarPermissaoProducaoReal?.executar(nota.ambienteFiscal);

    const empresa = await this.empresaRepository.buscarPorId(
      autenticacao.empresaId,
    );

    if (!empresa) {
      throw new AutenticacaoInvalidaError();
    }

    const xmlPedido = this.geradorXml.gerar({
      empresa,
      nota,
      codigoMotivo: input.codigoMotivo,
      motivo: input.motivo,
    });

    await this.validadorXml.validar(xmlPedido);

    const certificado = await this.obterCertificado(autenticacao.empresaId);

    if (certificado.cnpj !== empresa.cnpj) {
      throw new CertificadoA1CnpjDivergenteError();
    }

    const xmlPedidoAssinado = this.assinadorXml.assinar(
      xmlPedido,
      certificado,
    );

    await this.validadorXml.validar(xmlPedidoAssinado);

    const resultado = await this.clienteNfse.registrarEventoCancelamento(
      await this.criarInputCancelamento(
        autenticacao.empresaId,
        nota.chaveAcesso,
        xmlPedidoAssinado,
      ),
    );

    if (!resultado.sucesso) {
      return {
        nota,
        sucesso: false,
        statusHttp: resultado.statusHttp,
        erros: resultado.erros,
      };
    }

    nota.cancelar();

    const notaCancelada = await this.notaRepository.salvar(nota);

    return {
      nota: notaCancelada,
      sucesso: true,
      statusHttp: resultado.statusHttp,
      tipoAmbiente: resultado.tipoAmbiente,
      versaoAplicativo: resultado.versaoAplicativo,
      dataHoraProcessamento: resultado.dataHoraProcessamento,
      xmlEvento: resultado.xmlEvento,
    };
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

  private async criarInputCancelamento(
    empresaId: string,
    chaveAcesso: string,
    xmlPedidoEventoAssinado: string,
  ) {
    const configuracaoCertificado =
      await this.resolverConfiguracaoFiscal?.obterCertificadoA1(empresaId);

    if (!configuracaoCertificado) {
      return {
        chaveAcesso,
        xmlPedidoEventoAssinado,
      };
    }

    return {
      chaveAcesso,
      xmlPedidoEventoAssinado,
      certificadoPath: configuracaoCertificado.caminho,
      certificadoSenha: configuracaoCertificado.senha,
    };
  }
}
