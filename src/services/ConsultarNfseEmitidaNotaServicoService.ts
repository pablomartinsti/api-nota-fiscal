import { AmbienteFiscal, StatusNota } from '../entities/NotaServico';
import { TipoEventoFiscalNotaServico } from '../entities/NotaServicoEventoFiscal';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import {
  ClienteNfseNacional,
  ErroEnvioDpsNfse,
} from '../fiscal/ClienteNfseNacional';
import { formatarErrosFiscaisNfse } from '../fiscal/FormatadorErroFiscalNfse';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { RegistrarEventoFiscalNotaServicoService } from './RegistrarEventoFiscalNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';
import { prepararInputClienteNfse } from './PrepararInputClienteNfseService';

export interface ConsultaNfseEmitidaResultado {
  notaId?: string;
  chaveAcesso: string;
  sucesso: boolean;
  statusHttp: number;
  tipoAmbiente?: number;
  versaoAplicativo?: string;
  dataHoraProcessamento?: string;
  xmlAutorizado?: string;
  erros?: ErroEnvioDpsNfse[];
}

export class ConsultarNfseEmitidaNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly clienteNfse: ClienteNfseNacional,
    private readonly resolverConfiguracaoFiscal?: ResolverConfiguracaoFiscalEmpresaService,
    private readonly validarPermissaoProducaoReal?: ValidarPermissaoProducaoRealService,
    private readonly registrarEventoFiscal?: RegistrarEventoFiscalNotaServicoService,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
  ): Promise<ConsultaNfseEmitidaResultado> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (nota.status !== StatusNota.EMITIDA) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente uma nota emitida pode ser consultada na SEFIN Nacional.',
      );
    }

    if (!nota.chaveAcesso) {
      throw new TransicaoStatusNotaInvalidaError(
        'A nota emitida nao possui chave de acesso para consulta.',
      );
    }

    this.validarPermissaoProducaoReal?.executar(nota.ambienteFiscal);

    const resultado = await this.clienteNfse.consultarNfsePorChave(
      await this.criarInputConsultaNfse(
        autenticacao.empresaId,
        nota.ambienteFiscal,
        nota.chaveAcesso,
      ),
    );
    const mensagem = resultado.sucesso
      ? 'NFS-e consultada na SEFIN Nacional.'
      : formatarErrosFiscaisNfse(
          resultado.erros,
          'Consulta da NFS-e nao retornou sucesso.',
        );

    if (resultado.sucesso) {
      await this.registrarSucessoFiscal(
        autenticacao,
        notaId,
        mensagem,
        resultado.statusHttp,
        resultado.chaveAcesso ?? nota.chaveAcesso,
      );
    } else {
      await this.registrarErroFiscal(
        autenticacao,
        notaId,
        mensagem,
        resultado.statusHttp,
        resultado.chaveAcesso ?? nota.chaveAcesso,
      );
    }

    return {
      notaId: nota.id,
      chaveAcesso: resultado.chaveAcesso ?? nota.chaveAcesso,
      sucesso: resultado.sucesso,
      statusHttp: resultado.statusHttp,
      tipoAmbiente: resultado.tipoAmbiente,
      versaoAplicativo: resultado.versaoAplicativo,
      dataHoraProcessamento: resultado.dataHoraProcessamento,
      xmlAutorizado: resultado.xmlAutorizado,
      erros: resultado.erros,
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
      tipo: TipoEventoFiscalNotaServico.CONSULTA_NFSE,
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
      tipo: TipoEventoFiscalNotaServico.CONSULTA_NFSE,
      statusHttp,
      chaveAcesso,
      mensagem,
    });
  }

  private async criarInputConsultaNfse(
    empresaId: string,
    ambienteFiscal: AmbienteFiscal,
    chaveAcesso: string,
  ) {
    return prepararInputClienteNfse(
      this.resolverConfiguracaoFiscal,
      empresaId,
      ambienteFiscal,
      { chaveAcesso },
    );
  }

}
