export enum StatusNota {
  RASCUNHO = 'RASCUNHO',
  EMITIDA = 'EMITIDA',
  CANCELADA = 'CANCELADA',
  ERRO = 'ERRO',
}

export interface NotaServicoProps {
  id?: string;
  empresaId: string;
  usuarioId: string;
  clienteId: string;
  servicoId: string;
  numeroNfse?: string;
  codigoVerificacao?: string;
  valorServico: number;
  valorIss?: number;
  aliquotaIss: number;
  descricao: string;
  status?: StatusNota;
  dataEmissao?: Date;
  linkPdf?: string;
  xmlUrl?: string;
  mensagemErro?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlterarRascunhoProps {
  clienteId: string;
  servicoId: string;
  valorServico: number;
  aliquotaIss: number;
  descricao: string;
}

export interface EmitirNotaProps {
  numeroNfse: string;
  codigoVerificacao: string;
  dataEmissao?: Date;
  linkPdf?: string;
  xmlUrl?: string;
}

export class NotaServico {
  private readonly _id?: string;
  private readonly _empresaId: string;
  private readonly _usuarioId: string;
  private _clienteId: string;
  private _servicoId: string;
  private _numeroNfse?: string;
  private _codigoVerificacao?: string;
  private _valorServico: number;
  private _valorIss: number;
  private _aliquotaIss: number;
  private _descricao: string;
  private _status: StatusNota;
  private _dataEmissao?: Date;
  private _linkPdf?: string;
  private _xmlUrl?: string;
  private _mensagemErro?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: NotaServicoProps) {
    const empresaId = props.empresaId.trim();
    const usuarioId = props.usuarioId.trim();
    const clienteId = props.clienteId.trim();
    const servicoId = props.servicoId.trim();
    const descricao = props.descricao.trim();
    const status = props.status ?? StatusNota.RASCUNHO;

    NotaServico.validarIdentificador(empresaId, 'Empresa');
    NotaServico.validarIdentificador(usuarioId, 'Usuário');
    NotaServico.validarIdentificador(clienteId, 'Cliente');
    NotaServico.validarIdentificador(servicoId, 'Serviço');
    NotaServico.validarDescricao(descricao);
    NotaServico.validarValorServico(props.valorServico);
    NotaServico.validarAliquotaIss(props.aliquotaIss);
    NotaServico.validarStatus(status);

    this._id = props.id;
    this._empresaId = empresaId;
    this._usuarioId = usuarioId;
    this._clienteId = clienteId;
    this._servicoId = servicoId;
    this._numeroNfse = props.numeroNfse;
    this._codigoVerificacao = props.codigoVerificacao;
    this._valorServico = props.valorServico;
    this._valorIss = NotaServico.calcularIss(
      props.valorServico,
      props.aliquotaIss,
    );
    this._aliquotaIss = props.aliquotaIss;
    this._descricao = descricao;
    this._status = status;
    this._dataEmissao = props.dataEmissao;
    this._linkPdf = props.linkPdf;
    this._xmlUrl = props.xmlUrl;
    this._mensagemErro = props.mensagemErro;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();

    this.validarDadosDoStatus();
  }

  get id(): string | undefined {
    return this._id;
  }

  get empresaId(): string {
    return this._empresaId;
  }

  get usuarioId(): string {
    return this._usuarioId;
  }

  get clienteId(): string {
    return this._clienteId;
  }

  get servicoId(): string {
    return this._servicoId;
  }

  get numeroNfse(): string | undefined {
    return this._numeroNfse;
  }

  get codigoVerificacao(): string | undefined {
    return this._codigoVerificacao;
  }

  get valorServico(): number {
    return this._valorServico;
  }

  get valorIss(): number {
    return this._valorIss;
  }

  get aliquotaIss(): number {
    return this._aliquotaIss;
  }

  get descricao(): string {
    return this._descricao;
  }

  get status(): StatusNota {
    return this._status;
  }

  get dataEmissao(): Date | undefined {
    return this._dataEmissao;
  }

  get linkPdf(): string | undefined {
    return this._linkPdf;
  }

  get xmlUrl(): string | undefined {
    return this._xmlUrl;
  }

  get mensagemErro(): string | undefined {
    return this._mensagemErro;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  alterarRascunho(props: AlterarRascunhoProps): void {
    this.garantirRascunho();

    const clienteId = props.clienteId.trim();
    const servicoId = props.servicoId.trim();
    const descricao = props.descricao.trim();

    NotaServico.validarIdentificador(clienteId, 'Cliente');
    NotaServico.validarIdentificador(servicoId, 'Serviço');
    NotaServico.validarDescricao(descricao);
    NotaServico.validarValorServico(props.valorServico);
    NotaServico.validarAliquotaIss(props.aliquotaIss);

    this._clienteId = clienteId;
    this._servicoId = servicoId;
    this._valorServico = props.valorServico;
    this._aliquotaIss = props.aliquotaIss;
    this._valorIss = NotaServico.calcularIss(
      props.valorServico,
      props.aliquotaIss,
    );
    this._descricao = descricao;
    this.atualizarDataDeAlteracao();
  }

  emitir(props: EmitirNotaProps): void {
    this.garantirRascunho();

    const numeroNfse = props.numeroNfse.trim();
    const codigoVerificacao = props.codigoVerificacao.trim();

    NotaServico.validarTextoObrigatorio(numeroNfse, 'Número da NFS-e');
    NotaServico.validarTextoObrigatorio(
      codigoVerificacao,
      'Código de verificação',
    );

    this._numeroNfse = numeroNfse;
    this._codigoVerificacao = codigoVerificacao;
    this._dataEmissao = props.dataEmissao ?? new Date();
    this._linkPdf = props.linkPdf;
    this._xmlUrl = props.xmlUrl;
    this._mensagemErro = undefined;
    this._status = StatusNota.EMITIDA;
    this.atualizarDataDeAlteracao();
  }

  registrarErro(mensagemErro: string): void {
    this.garantirRascunho();

    const mensagem = mensagemErro.trim();

    NotaServico.validarTextoObrigatorio(mensagem, 'Mensagem de erro');

    this._mensagemErro = mensagem;
    this._status = StatusNota.ERRO;
    this.atualizarDataDeAlteracao();
  }

  retornarParaRascunho(): void {
    if (this._status !== StatusNota.ERRO) {
      throw new Error('Somente uma nota com erro pode retornar para rascunho.');
    }

    this._mensagemErro = undefined;
    this._status = StatusNota.RASCUNHO;
    this.atualizarDataDeAlteracao();
  }

  cancelar(): void {
    if (this._status !== StatusNota.EMITIDA) {
      throw new Error('Somente uma nota emitida pode ser cancelada.');
    }

    this._status = StatusNota.CANCELADA;
    this.atualizarDataDeAlteracao();
  }

  private static calcularIss(valorServico: number, aliquotaIss: number): number {
    const valorIss = valorServico * (aliquotaIss / 100);

    return Math.round((valorIss + Number.EPSILON) * 100) / 100;
  }

  private static validarIdentificador(
    identificador: string,
    campo: string,
  ): void {
    NotaServico.validarTextoObrigatorio(identificador, campo);
  }

  private static validarTextoObrigatorio(valor: string, campo: string): void {
    if (!valor) {
      throw new Error(`${campo} é obrigatório.`);
    }
  }

  private static validarDescricao(descricao: string): void {
    NotaServico.validarTextoObrigatorio(descricao, 'Descrição');
  }

  private static validarValorServico(valorServico: number): void {
    if (!Number.isFinite(valorServico)) {
      throw new Error('Valor do serviço deve ser um número válido.');
    }

    if (valorServico <= 0) {
      throw new Error('Valor do serviço deve ser maior que zero.');
    }
  }

  private static validarAliquotaIss(aliquotaIss: number): void {
    if (!Number.isFinite(aliquotaIss)) {
      throw new Error('Alíquota de ISS deve ser um número válido.');
    }

    if (aliquotaIss < 0 || aliquotaIss > 100) {
      throw new Error('Alíquota de ISS deve estar entre 0 e 100.');
    }
  }

  private static validarStatus(status: StatusNota): void {
    if (!Object.values(StatusNota).includes(status)) {
      throw new Error('Status da nota inválido.');
    }
  }

  private validarDadosDoStatus(): void {
    if (
      this._status === StatusNota.EMITIDA ||
      this._status === StatusNota.CANCELADA
    ) {
      NotaServico.validarTextoObrigatorio(
        this._numeroNfse?.trim() ?? '',
        'Número da NFS-e',
      );
      NotaServico.validarTextoObrigatorio(
        this._codigoVerificacao?.trim() ?? '',
        'Código de verificação',
      );

      if (!this._dataEmissao) {
        throw new Error('Data de emissão é obrigatória para nota emitida.');
      }
    }

    if (this._status === StatusNota.ERRO) {
      NotaServico.validarTextoObrigatorio(
        this._mensagemErro?.trim() ?? '',
        'Mensagem de erro',
      );
    }
  }

  private garantirRascunho(): void {
    if (this._status !== StatusNota.RASCUNHO) {
      throw new Error('A operação só pode ser realizada em uma nota rascunho.');
    }
  }

  private atualizarDataDeAlteracao(): void {
    this._updatedAt = new Date();
  }
}
