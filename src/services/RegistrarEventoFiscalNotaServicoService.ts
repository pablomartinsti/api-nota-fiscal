import {
  NotaServicoEventoFiscal,
  StatusEventoFiscalNotaServico,
  TipoEventoFiscalNotaServico,
} from '../entities/NotaServicoEventoFiscal';
import { NotaServicoEventoFiscalRepository } from '../repositories/NotaServicoEventoFiscalRepository';

interface RegistrarEventoFiscalNotaServicoInput {
  empresaId: string;
  notaServicoId: string;
  usuarioId?: string;
  tipo: TipoEventoFiscalNotaServico;
  statusHttp?: number;
  chaveAcesso?: string;
  mensagem?: string;
}

const TAMANHO_MAXIMO_MENSAGEM = 1000;

export class RegistrarEventoFiscalNotaServicoService {
  constructor(
    private readonly eventoFiscalRepository: NotaServicoEventoFiscalRepository,
  ) {}

  async sucesso(
    input: RegistrarEventoFiscalNotaServicoInput,
  ): Promise<NotaServicoEventoFiscal> {
    return this.registrar(input, StatusEventoFiscalNotaServico.SUCESSO);
  }

  async erro(
    input: RegistrarEventoFiscalNotaServicoInput,
  ): Promise<NotaServicoEventoFiscal> {
    return this.registrar(input, StatusEventoFiscalNotaServico.ERRO);
  }

  private async registrar(
    input: RegistrarEventoFiscalNotaServicoInput,
    status: StatusEventoFiscalNotaServico,
  ): Promise<NotaServicoEventoFiscal> {
    return this.eventoFiscalRepository.salvar(
      new NotaServicoEventoFiscal({
        empresaId: input.empresaId,
        notaServicoId: input.notaServicoId,
        usuarioId: input.usuarioId,
        tipo: input.tipo,
        status,
        statusHttp: input.statusHttp,
        chaveAcesso: input.chaveAcesso,
        mensagem: this.limitarMensagem(input.mensagem),
      }),
    );
  }

  private limitarMensagem(mensagem?: string): string | undefined {
    const texto = mensagem?.trim();

    return texto ? texto.slice(0, TAMANHO_MAXIMO_MENSAGEM) : undefined;
  }
}
