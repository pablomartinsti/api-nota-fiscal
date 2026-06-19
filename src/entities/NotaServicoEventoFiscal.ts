export enum TipoEventoFiscalNotaServico {
  ENVIO_DPS = 'ENVIO_DPS',
  CONSULTA_NFSE = 'CONSULTA_NFSE',
  RECONCILIACAO_ENVIO = 'RECONCILIACAO_ENVIO',
  CANCELAMENTO_NFSE = 'CANCELAMENTO_NFSE',
}

export enum StatusEventoFiscalNotaServico {
  SUCESSO = 'SUCESSO',
  ERRO = 'ERRO',
}

export interface NotaServicoEventoFiscalProps {
  id?: string;
  empresaId: string;
  notaServicoId: string;
  usuarioId?: string;
  tipo: TipoEventoFiscalNotaServico;
  status: StatusEventoFiscalNotaServico;
  statusHttp?: number;
  chaveAcesso?: string;
  mensagem?: string;
  createdAt?: Date;
}

const TAMANHO_MAXIMO_MENSAGEM = 1000;

export class NotaServicoEventoFiscal {
  private readonly _id?: string;
  private readonly _empresaId: string;
  private readonly _notaServicoId: string;
  private readonly _usuarioId?: string;
  private readonly _tipo: TipoEventoFiscalNotaServico;
  private readonly _status: StatusEventoFiscalNotaServico;
  private readonly _statusHttp?: number;
  private readonly _chaveAcesso?: string;
  private readonly _mensagem?: string;
  private readonly _createdAt: Date;

  constructor(props: NotaServicoEventoFiscalProps) {
    const empresaId = props.empresaId.trim();
    const notaServicoId = props.notaServicoId.trim();
    const usuarioId = this.normalizarTextoOpcional(props.usuarioId);
    const chaveAcesso = this.normalizarTextoOpcional(props.chaveAcesso);
    const mensagem = this.normalizarTextoOpcional(props.mensagem);

    this.validarTextoObrigatorio(empresaId, 'Empresa');
    this.validarTextoObrigatorio(notaServicoId, 'Nota de servico');
    this.validarTipo(props.tipo);
    this.validarStatus(props.status);
    this.validarStatusHttp(props.statusHttp);
    this.validarMensagem(mensagem);

    this._id = props.id;
    this._empresaId = empresaId;
    this._notaServicoId = notaServicoId;
    this._usuarioId = usuarioId;
    this._tipo = props.tipo;
    this._status = props.status;
    this._statusHttp = props.statusHttp;
    this._chaveAcesso = chaveAcesso;
    this._mensagem = mensagem;
    this._createdAt = props.createdAt ?? new Date();
  }

  get id(): string | undefined {
    return this._id;
  }

  get empresaId(): string {
    return this._empresaId;
  }

  get notaServicoId(): string {
    return this._notaServicoId;
  }

  get usuarioId(): string | undefined {
    return this._usuarioId;
  }

  get tipo(): TipoEventoFiscalNotaServico {
    return this._tipo;
  }

  get status(): StatusEventoFiscalNotaServico {
    return this._status;
  }

  get statusHttp(): number | undefined {
    return this._statusHttp;
  }

  get chaveAcesso(): string | undefined {
    return this._chaveAcesso;
  }

  get mensagem(): string | undefined {
    return this._mensagem;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  private normalizarTextoOpcional(valor?: string): string | undefined {
    const texto = valor?.trim();

    return texto ? texto : undefined;
  }

  private validarTextoObrigatorio(valor: string, campo: string): void {
    if (!valor) {
      throw new Error(`${campo} e obrigatorio.`);
    }
  }

  private validarTipo(tipo: TipoEventoFiscalNotaServico): void {
    if (!Object.values(TipoEventoFiscalNotaServico).includes(tipo)) {
      throw new Error('Tipo do evento fiscal invalido.');
    }
  }

  private validarStatus(status: StatusEventoFiscalNotaServico): void {
    if (!Object.values(StatusEventoFiscalNotaServico).includes(status)) {
      throw new Error('Status do evento fiscal invalido.');
    }
  }

  private validarStatusHttp(statusHttp?: number): void {
    if (statusHttp === undefined) {
      return;
    }

    if (!Number.isInteger(statusHttp) || statusHttp < 100 || statusHttp > 599) {
      throw new Error('Status HTTP do evento fiscal invalido.');
    }
  }

  private validarMensagem(mensagem?: string): void {
    if (mensagem && mensagem.length > TAMANHO_MAXIMO_MENSAGEM) {
      throw new Error(
        `Mensagem do evento fiscal deve conter no maximo ${TAMANHO_MAXIMO_MENSAGEM} caracteres.`,
      );
    }
  }
}
