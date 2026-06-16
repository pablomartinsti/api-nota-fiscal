import { NotaServico, StatusNota } from '../entities/NotaServico';
import {
  ClienteNfseNacional,
  ErroEnvioDpsNfse,
  ResultadoEnvioDpsNfse,
} from '../fiscal/ClienteNfseNacional';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { TokenPayload } from '../security/GerenciadorToken';
import { GerarXmlDpsAssinadoNotaServicoService } from './GerarXmlDpsAssinadoNotaServicoService';

export class EnviarDpsAssinadaNotaServicoService {
  constructor(
    private readonly notaRepository: NotaServicoRepository,
    private readonly gerarXmlDpsAssinadoService: GerarXmlDpsAssinadoNotaServicoService,
    private readonly clienteNfse: ClienteNfseNacional,
  ) {}

  async executar(
    autenticacao: TokenPayload,
    notaId: string,
  ): Promise<NotaServico> {
    const nota = await this.notaRepository.buscarPorIdEEmpresaId(
      notaId,
      autenticacao.empresaId,
    );

    if (!nota) {
      throw new NotaServicoNaoEncontradaError();
    }

    if (nota.status !== StatusNota.RASCUNHO) {
      throw new TransicaoStatusNotaInvalidaError(
        'Somente uma nota em rascunho pode ter a DPS enviada.',
      );
    }

    const xmlAssinado = await this.gerarXmlDpsAssinadoService.executar(
      autenticacao,
      notaId,
    );
    const resultado = await this.clienteNfse.enviarDpsAssinada({
      xmlAssinado,
    });

    if (!resultado.sucesso) {
      nota.registrarErroFiscal(this.criarMensagemErroFiscal(resultado.erros));

      return this.notaRepository.salvar(nota);
    }

    if (!resultado.numeroNfse || !resultado.codigoVerificacao) {
      nota.registrarErroFiscal(
        'Retorno fiscal da SEFIN nao informou numero da NFS-e ou codigo de verificacao.',
      );

      return this.notaRepository.salvar(nota);
    }

    nota.registrarSucessoFiscal({
      numeroNfse: resultado.numeroNfse,
      codigoVerificacao: resultado.codigoVerificacao,
      protocoloEmissao: resultado.protocolo,
      chaveAcesso: resultado.chaveAcesso,
      xmlAutorizado: resultado.xmlAutorizado,
    });

    return this.notaRepository.salvar(nota);
  }

  private criarMensagemErroFiscal(erros?: ErroEnvioDpsNfse[]): string {
    if (!erros?.length) {
      return 'DPS rejeitada pela SEFIN Nacional.';
    }

    return erros.map((erro) => this.formatarErro(erro)).join('; ');
  }

  private formatarErro(erro: ErroEnvioDpsNfse): string {
    const prefixos = [erro.codigo, erro.campo].filter(Boolean).join(' ');

    return prefixos ? `${prefixos}: ${erro.mensagem}` : erro.mensagem;
  }
}
