import { StatusNota } from '../entities/NotaServico';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import {
  ClienteNfseNacional,
  ErroEnvioDpsNfse,
} from '../fiscal/ClienteNfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';

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

    const resultado = await this.clienteNfse.consultarNfsePorChave({
      chaveAcesso: nota.chaveAcesso,
    });

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
}
