import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { TipoEventoFiscalNotaServico } from '../entities/NotaServicoEventoFiscal';
import { ComunicacaoNfseError } from '../errors/ComunicacaoNfseError';
import {
  ClienteDanfseNfseNacional,
  ResultadoDownloadDanfseNfse,
} from '../fiscal/ClienteDanfseNfseNacional';
import { ErroEnvioDpsNfse } from '../fiscal/ClienteNfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { RegistrarEventoFiscalNotaServicoService } from './RegistrarEventoFiscalNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

export class BaixarDanfseNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly clienteDanfse: ClienteDanfseNfseNacional,
    private readonly resolverConfiguracaoFiscal: ResolverConfiguracaoFiscalEmpresaService,
    private readonly validarPermissaoProducaoReal: ValidarPermissaoProducaoRealService,
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

    const certificado =
      await this.resolverConfiguracaoFiscal.obterCertificadoA1ParaAmbiente(
        autenticacao.empresaId,
        nota.ambienteFiscal,
      );

    try {
      const resultado = await this.clienteDanfse.baixarDanfsePorChave({
        ambienteFiscal: nota.ambienteFiscal,
        chaveAcesso: nota.chaveAcesso,
        certificadoPath: certificado?.caminho,
        certificadoConteudoBase64: certificado?.conteudoBase64,
        certificadoSenha: certificado?.senha,
      });

      if (!resultado.sucesso) {
        await this.registrarErroFiscal(
          autenticacao,
          nota.id!,
          this.criarMensagemErroFiscal(resultado.erros),
          resultado.statusHttp,
          resultado.chaveAcesso,
        );

        return resultado;
      }

      await this.registrarSucessoFiscal(
        autenticacao,
        nota.id!,
        'DANFSe baixado com sucesso.',
        resultado.statusHttp,
        resultado.chaveAcesso,
      );

      return resultado;
    } catch (error) {
      const mensagem =
        error instanceof ComunicacaoNfseError || error instanceof Error
          ? error.message
          : 'Nao foi possivel baixar o DANFSe.';

      await this.registrarErroFiscal(
        autenticacao,
        nota.id!,
        mensagem,
        undefined,
        nota.chaveAcesso,
      );

      throw error;
    }
  }

  private criarMensagemErroFiscal(erros?: ErroEnvioDpsNfse[]): string {
    if (!erros?.length) {
      return 'Falha ao baixar o DANFSe.';
    }

    return erros.map((erro) => this.formatarErro(erro)).join('; ');
  }

  private formatarErro(erro: ErroEnvioDpsNfse): string {
    const prefixos = [erro.codigo, erro.campo].filter(Boolean).join(' ');

    return prefixos ? `${prefixos}: ${erro.mensagem}` : erro.mensagem;
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
