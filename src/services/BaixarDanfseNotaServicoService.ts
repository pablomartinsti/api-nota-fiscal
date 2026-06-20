import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import {
  ClienteDanfseNfseNacional,
  ResultadoDownloadDanfseNfse,
} from '../fiscal/ClienteDanfseNfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

export class BaixarDanfseNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly clienteDanfse: ClienteDanfseNfseNacional,
    private readonly resolverConfiguracaoFiscal: ResolverConfiguracaoFiscalEmpresaService,
    private readonly validarPermissaoProducaoReal: ValidarPermissaoProducaoRealService,
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

    return this.clienteDanfse.baixarDanfsePorChave({
      ambienteFiscal: nota.ambienteFiscal,
      chaveAcesso: nota.chaveAcesso,
      certificadoPath: certificado?.caminho,
      certificadoSenha: certificado?.senha,
    });
  }
}
