import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { NotaServico } from '../entities/NotaServico';
import { TipoEventoFiscalNotaServico } from '../entities/NotaServicoEventoFiscal';
import { ResultadoDownloadDanfseNfse } from '../fiscal/ResultadoDownloadDanfseNfse';
import { GeradorPdfDanfseNacional } from '../fiscal/GeradorPdfDanfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { RegistrarEventoFiscalNotaServicoService } from './RegistrarEventoFiscalNotaServicoService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

const STATUS_HTTP_DANFSE_INDISPONIVEL = 409;
const MENSAGEM_XML_AUSENTE =
  'DANFSe indisponivel para esta nota porque o XML autorizado nao esta salvo no banco.';

export class BaixarDanfseNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly validarPermissaoProducaoReal: ValidarPermissaoProducaoRealService,
    private readonly geradorPdfDanfse: GeradorPdfDanfseNacional,
    private readonly registrarEventoFiscal?: RegistrarEventoFiscalNotaServicoService,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
  ): Promise<ResultadoDownloadDanfseNfse> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (!nota.chaveAcesso) {
      throw new TransicaoStatusNotaInvalidaError(
        'A nota nao possui chave de acesso para baixar o DANFSe.',
      );
    }

    this.validarPermissaoProducaoReal.executar(nota.ambienteFiscal);

    const pdfLocal = await this.tentarGerarDanfseLocal(
      autenticacao,
      nota,
      'DANFSe gerado localmente a partir do XML autorizado.',
    );

    if (pdfLocal) {
      return pdfLocal;
    }

    await this.registrarErroFiscal(
      autenticacao,
      nota.id!,
      MENSAGEM_XML_AUSENTE,
      STATUS_HTTP_DANFSE_INDISPONIVEL,
      nota.chaveAcesso,
    );

    return {
      sucesso: false,
      statusHttp: STATUS_HTTP_DANFSE_INDISPONIVEL,
      chaveAcesso: nota.chaveAcesso,
      erros: [
        {
          mensagem: MENSAGEM_XML_AUSENTE,
        },
      ],
    };
  }

  private async tentarGerarDanfseLocal(
    autenticacao: TokenPayload,
    nota: NotaServico,
    mensagem: string,
  ): Promise<ResultadoDownloadDanfseNfse | undefined> {
    const pdfLocal = this.geradorPdfDanfse.gerar(nota);

    if (!pdfLocal) {
      return undefined;
    }

    await this.registrarSucessoFiscal(
      autenticacao,
      nota.id!,
      mensagem,
      200,
      pdfLocal.chaveAcesso,
    );

    return {
      sucesso: true,
      statusHttp: 200,
      chaveAcesso: pdfLocal.chaveAcesso,
      pdf: pdfLocal.pdf,
      contentType: 'application/pdf',
    };
  }

  private async registrarSucessoFiscal(
    autenticacao: TokenPayload,
    notaServicoId: string,
    mensagem: string,
    statusHttp?: number,
    chaveAcesso?: string,
  ): Promise<void> {
    if (!this.registrarEventoFiscal) {
      return;
    }

    await this.registrarEventoFiscal.sucesso({
      empresaId: autenticacao.empresaId,
      notaServicoId,
      usuarioId: autenticacao.usuarioId,
      tipo: TipoEventoFiscalNotaServico.DOWNLOAD_DANFSE,
      statusHttp,
      chaveAcesso,
      mensagem,
    });
  }

  private async registrarErroFiscal(
    autenticacao: TokenPayload,
    notaServicoId: string,
    mensagem: string,
    statusHttp?: number,
    chaveAcesso?: string,
  ): Promise<void> {
    if (!this.registrarEventoFiscal) {
      return;
    }

    await this.registrarEventoFiscal.erro({
      empresaId: autenticacao.empresaId,
      notaServicoId,
      usuarioId: autenticacao.usuarioId,
      tipo: TipoEventoFiscalNotaServico.DOWNLOAD_DANFSE,
      statusHttp,
      chaveAcesso,
      mensagem,
    });
  }
}
