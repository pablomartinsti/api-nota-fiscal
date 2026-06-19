import {
  AmbienteFiscal,
  NotaServico,
  StatusNota,
} from '../entities/NotaServico';
import { TipoEventoFiscalNotaServico } from '../entities/NotaServicoEventoFiscal';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
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
import { RegistrarEventoFiscalNotaServicoService } from './RegistrarEventoFiscalNotaServicoService';
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
    private readonly registrarEventoFiscal?: RegistrarEventoFiscalNotaServicoService,
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
    await this.obterConfiguracaoCertificado(
      autenticacao.empresaId,
      nota.ambienteFiscal,
    );

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

    const certificado = await this.obterCertificado(
      autenticacao.empresaId,
      nota.ambienteFiscal,
    );

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
        nota.ambienteFiscal,
        nota.chaveAcesso,
        xmlPedidoAssinado,
      ),
    );

    if (!resultado.sucesso) {
      await this.registrarErroFiscal(
        autenticacao,
        nota,
        this.criarMensagemErroFiscal(resultado.erros),
        resultado.statusHttp,
      );

      return {
        nota,
        sucesso: false,
        statusHttp: resultado.statusHttp,
        erros: resultado.erros,
      };
    }

    nota.cancelar();

    const notaCancelada = await this.notaRepository.salvar(nota);
    await this.registrarSucessoFiscal(
      autenticacao,
      notaCancelada,
      'Cancelamento da NFS-e registrado na SEFIN Nacional.',
      resultado.statusHttp,
    );

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

  private criarMensagemErroFiscal(erros?: ErroEnvioDpsNfse[]): string {
    if (!erros?.length) {
      return 'Cancelamento da NFS-e recusado pela SEFIN Nacional.';
    }

    return erros.map((erro) => this.formatarErro(erro)).join('; ');
  }

  private formatarErro(erro: ErroEnvioDpsNfse): string {
    const prefixos = [erro.codigo, erro.campo].filter(Boolean).join(' ');

    return prefixos ? `${prefixos}: ${erro.mensagem}` : erro.mensagem;
  }

  private async registrarSucessoFiscal(
    autenticacao: TokenPayload,
    nota: NotaServico,
    mensagem: string,
    statusHttp?: number,
  ): Promise<void> {
    if (!this.registrarEventoFiscal || !nota.id) {
      return;
    }

    await this.registrarEventoFiscal.sucesso({
      empresaId: autenticacao.empresaId,
      notaServicoId: nota.id,
      usuarioId: autenticacao.usuarioId,
      tipo: TipoEventoFiscalNotaServico.CANCELAMENTO_NFSE,
      statusHttp,
      chaveAcesso: nota.chaveAcesso,
      mensagem,
    });
  }

  private async registrarErroFiscal(
    autenticacao: TokenPayload,
    nota: NotaServico,
    mensagem: string,
    statusHttp?: number,
  ): Promise<void> {
    if (!this.registrarEventoFiscal || !nota.id) {
      return;
    }

    await this.registrarEventoFiscal.erro({
      empresaId: autenticacao.empresaId,
      notaServicoId: nota.id,
      usuarioId: autenticacao.usuarioId,
      tipo: TipoEventoFiscalNotaServico.CANCELAMENTO_NFSE,
      statusHttp,
      chaveAcesso: nota.chaveAcesso,
      mensagem,
    });
  }

  private async obterCertificado(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
  ): Promise<CertificadoA1> {
    const configuracaoCertificado = await this.obterConfiguracaoCertificado(
      empresaId,
      ambienteFiscal,
    );

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
    ambienteFiscal: AmbienteFiscal,
    chaveAcesso: string,
    xmlPedidoEventoAssinado: string,
  ) {
    const configuracaoCertificado = await this.obterConfiguracaoCertificado(
      empresaId,
      ambienteFiscal,
    );

    if (!configuracaoCertificado) {
      return {
        ambienteFiscal,
        chaveAcesso,
        xmlPedidoEventoAssinado,
      };
    }

    return {
      ambienteFiscal,
      chaveAcesso,
      xmlPedidoEventoAssinado,
      certificadoPath: configuracaoCertificado.caminho,
      certificadoSenha: configuracaoCertificado.senha,
    };
  }

  private async obterConfiguracaoCertificado(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
  ) {
    if (!this.resolverConfiguracaoFiscal) {
      if (ambienteFiscal === AmbienteFiscal.PRODUCAO) {
        throw new CertificadoA1EmpresaProducaoAusenteError();
      }

      return undefined;
    }

    return this.resolverConfiguracaoFiscal.obterCertificadoA1ParaAmbiente(
      empresaId,
      ambienteFiscal,
    );
  }
}
