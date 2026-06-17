export enum StatusNota {
  RASCUNHO = 'RASCUNHO',
  EMITIDA = 'EMITIDA',
  CANCELADA = 'CANCELADA',
  ERRO = 'ERRO',
}

export enum AmbienteFiscal {
  PRODUCAO = 'PRODUCAO',
  HOMOLOGACAO = 'HOMOLOGACAO',
}

export enum TributacaoIssqn {
  TRIBUTAVEL = 'TRIBUTAVEL',
  IMUNIDADE = 'IMUNIDADE',
  EXPORTACAO = 'EXPORTACAO',
  NAO_INCIDENCIA = 'NAO_INCIDENCIA',
}

export enum TipoRetencaoIssqn {
  NAO_RETIDO = 'NAO_RETIDO',
  RETIDO_PELO_TOMADOR = 'RETIDO_PELO_TOMADOR',
  RETIDO_PELO_INTERMEDIARIO = 'RETIDO_PELO_INTERMEDIARIO',
}

export interface NotaServicoProps {
  id?: string;
  empresaId: string;
  usuarioId: string;
  clienteId: string;
  servicoId: string;
  numeroNfse?: string;
  codigoVerificacao?: string;
  protocoloEmissao?: string;
  chaveAcesso?: string;
  xmlAutorizado?: string;
  dataAutorizacao?: Date;
  mensagemErroFiscal?: string;
  ambienteFiscal?: AmbienteFiscal;
  serieDps?: string;
  numeroDps?: string;
  dataCompetencia?: Date;
  codigoMunicipioPrestacao?: string;
  tributacaoIssqn?: TributacaoIssqn;
  tipoRetencaoIssqn?: TipoRetencaoIssqn;
  informacoesComplementares?: string;
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
  serieDps?: string;
  numeroDps?: string;
  dataCompetencia?: Date;
  codigoMunicipioPrestacao?: string;
  tributacaoIssqn?: TributacaoIssqn;
  tipoRetencaoIssqn?: TipoRetencaoIssqn;
  informacoesComplementares?: string;
}

export interface EmitirNotaProps {
  numeroNfse: string;
  codigoVerificacao: string;
  dataEmissao?: Date;
  linkPdf?: string;
  xmlUrl?: string;
}

export interface RegistrarSucessoFiscalProps {
  numeroNfse?: string;
  codigoVerificacao?: string;
  dataEmissao?: Date;
  linkPdf?: string;
  xmlUrl?: string;
  protocoloEmissao?: string;
  chaveAcesso?: string;
  xmlAutorizado?: string;
  dataAutorizacao?: Date;
}

export class NotaServico {
  private readonly _id?: string;
  private readonly _empresaId: string;
  private readonly _usuarioId: string;
  private _clienteId: string;
  private _servicoId: string;
  private _numeroNfse?: string;
  private _codigoVerificacao?: string;
  private _protocoloEmissao?: string;
  private _chaveAcesso?: string;
  private _xmlAutorizado?: string;
  private _dataAutorizacao?: Date;
  private _mensagemErroFiscal?: string;
  private _ambienteFiscal: AmbienteFiscal;
  private _serieDps?: string;
  private _numeroDps?: string;
  private _dataCompetencia?: Date;
  private _codigoMunicipioPrestacao?: string;
  private _tributacaoIssqn: TributacaoIssqn;
  private _tipoRetencaoIssqn: TipoRetencaoIssqn;
  private _informacoesComplementares?: string;
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
    const ambienteFiscal = props.ambienteFiscal ?? AmbienteFiscal.HOMOLOGACAO;
    const tributacaoIssqn =
      props.tributacaoIssqn ?? TributacaoIssqn.TRIBUTAVEL;
    const tipoRetencaoIssqn =
      props.tipoRetencaoIssqn ?? TipoRetencaoIssqn.NAO_RETIDO;

    NotaServico.validarIdentificador(empresaId, 'Empresa');
    NotaServico.validarIdentificador(usuarioId, 'Usuário');
    NotaServico.validarIdentificador(clienteId, 'Cliente');
    NotaServico.validarIdentificador(servicoId, 'Serviço');
    NotaServico.validarDescricao(descricao);
    NotaServico.validarValorServico(props.valorServico);
    NotaServico.validarAliquotaIss(props.aliquotaIss);
    NotaServico.validarStatus(status);
    NotaServico.validarDadosFiscais({
      ambienteFiscal,
      serieDps: props.serieDps,
      numeroDps: props.numeroDps,
      dataCompetencia: props.dataCompetencia,
      codigoMunicipioPrestacao: props.codigoMunicipioPrestacao,
      tributacaoIssqn,
      tipoRetencaoIssqn,
      informacoesComplementares: props.informacoesComplementares,
    });
    NotaServico.validarDataOpcional(
      props.dataAutorizacao,
      'Data de autorizacao',
    );

    this._id = props.id;
    this._empresaId = empresaId;
    this._usuarioId = usuarioId;
    this._clienteId = clienteId;
    this._servicoId = servicoId;
    this._numeroNfse = props.numeroNfse;
    this._codigoVerificacao = props.codigoVerificacao;
    this._protocoloEmissao = props.protocoloEmissao;
    this._chaveAcesso = props.chaveAcesso;
    this._xmlAutorizado = props.xmlAutorizado;
    this._dataAutorizacao = props.dataAutorizacao;
    this._mensagemErroFiscal = props.mensagemErroFiscal;
    this._ambienteFiscal = ambienteFiscal;
    this._serieDps = props.serieDps;
    this._numeroDps = props.numeroDps;
    this._dataCompetencia = props.dataCompetencia;
    this._codigoMunicipioPrestacao = props.codigoMunicipioPrestacao;
    this._tributacaoIssqn = tributacaoIssqn;
    this._tipoRetencaoIssqn = tipoRetencaoIssqn;
    this._informacoesComplementares = props.informacoesComplementares;
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
    this._mensagemErro = props.mensagemErro ?? props.mensagemErroFiscal;
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

  get protocoloEmissao(): string | undefined {
    return this._protocoloEmissao;
  }

  get chaveAcesso(): string | undefined {
    return this._chaveAcesso;
  }

  get xmlAutorizado(): string | undefined {
    return this._xmlAutorizado;
  }

  get dataAutorizacao(): Date | undefined {
    return this._dataAutorizacao;
  }

  get mensagemErroFiscal(): string | undefined {
    return this._mensagemErroFiscal;
  }

  get ambienteFiscal(): AmbienteFiscal {
    return this._ambienteFiscal;
  }

  get serieDps(): string | undefined {
    return this._serieDps;
  }

  get numeroDps(): string | undefined {
    return this._numeroDps;
  }

  get dataCompetencia(): Date | undefined {
    return this._dataCompetencia;
  }

  get codigoMunicipioPrestacao(): string | undefined {
    return this._codigoMunicipioPrestacao;
  }

  get tributacaoIssqn(): TributacaoIssqn {
    return this._tributacaoIssqn;
  }

  get tipoRetencaoIssqn(): TipoRetencaoIssqn {
    return this._tipoRetencaoIssqn;
  }

  get informacoesComplementares(): string | undefined {
    return this._informacoesComplementares;
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
    NotaServico.validarDadosFiscais({
      ambienteFiscal: this._ambienteFiscal,
      serieDps: props.serieDps,
      numeroDps: props.numeroDps,
      dataCompetencia: props.dataCompetencia,
      codigoMunicipioPrestacao: props.codigoMunicipioPrestacao,
      tributacaoIssqn: props.tributacaoIssqn ?? this._tributacaoIssqn,
      tipoRetencaoIssqn:
        props.tipoRetencaoIssqn ?? this._tipoRetencaoIssqn,
      informacoesComplementares: props.informacoesComplementares,
    });

    this._clienteId = clienteId;
    this._servicoId = servicoId;
    this._valorServico = props.valorServico;
    this._aliquotaIss = props.aliquotaIss;
    this._valorIss = NotaServico.calcularIss(
      props.valorServico,
      props.aliquotaIss,
    );
    this._descricao = descricao;
    this._serieDps = props.serieDps;
    this._numeroDps = props.numeroDps;
    this._dataCompetencia = props.dataCompetencia;
    this._codigoMunicipioPrestacao = props.codigoMunicipioPrestacao;
    this._tributacaoIssqn = props.tributacaoIssqn ?? this._tributacaoIssqn;
    this._tipoRetencaoIssqn =
      props.tipoRetencaoIssqn ?? this._tipoRetencaoIssqn;
    this._informacoesComplementares = props.informacoesComplementares;
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
    this._protocoloEmissao = undefined;
    this._chaveAcesso = undefined;
    this._xmlAutorizado = undefined;
    this._dataAutorizacao = undefined;
    this._mensagemErro = undefined;
    this._mensagemErroFiscal = undefined;
    this._status = StatusNota.EMITIDA;
    this.atualizarDataDeAlteracao();
  }

  registrarSucessoFiscal(props: RegistrarSucessoFiscalProps): void {
    this.garantirRascunho();

    const numeroNfse = NotaServico.normalizarTextoOpcional(props.numeroNfse);
    const codigoVerificacao = NotaServico.normalizarTextoOpcional(
      props.codigoVerificacao,
    );
    const protocoloEmissao = NotaServico.normalizarTextoOpcional(
      props.protocoloEmissao,
    );
    const chaveAcesso = NotaServico.normalizarTextoOpcional(props.chaveAcesso);
    const xmlAutorizado = NotaServico.normalizarTextoOpcional(
      props.xmlAutorizado,
    );

    if (!protocoloEmissao && !chaveAcesso) {
      throw new Error(
        'Retorno fiscal deve informar protocolo ou chave de acesso.',
      );
    }

    if (
      props.dataAutorizacao !== undefined &&
      Number.isNaN(props.dataAutorizacao.getTime())
    ) {
      throw new Error('Data de autorizacao invalida.');
    }

    this._numeroNfse = numeroNfse;
    this._codigoVerificacao = codigoVerificacao;
    this._dataEmissao = props.dataEmissao ?? new Date();
    this._linkPdf = props.linkPdf;
    this._xmlUrl = props.xmlUrl;
    this._protocoloEmissao = protocoloEmissao;
    this._chaveAcesso = chaveAcesso;
    this._xmlAutorizado = xmlAutorizado;
    this._dataAutorizacao = props.dataAutorizacao ?? this._dataEmissao;
    this._mensagemErro = undefined;
    this._mensagemErroFiscal = undefined;
    this._status = StatusNota.EMITIDA;
    this.atualizarDataDeAlteracao();
  }

  registrarErro(mensagemErro: string): void {
    this.garantirRascunho();

    const mensagem = mensagemErro.trim();

    NotaServico.validarTextoObrigatorio(mensagem, 'Mensagem de erro');

    this._mensagemErro = mensagem;
    this._protocoloEmissao = undefined;
    this._chaveAcesso = undefined;
    this._xmlAutorizado = undefined;
    this._dataAutorizacao = undefined;
    this._status = StatusNota.ERRO;
    this.atualizarDataDeAlteracao();
  }

  registrarErroFiscal(mensagemErroFiscal: string): void {
    this.registrarErro(mensagemErroFiscal);
    this._mensagemErroFiscal = this._mensagemErro;
    this.atualizarDataDeAlteracao();
  }

  retornarParaRascunho(): void {
    if (this._status !== StatusNota.ERRO) {
      throw new Error('Somente uma nota com erro pode retornar para rascunho.');
    }

    this._mensagemErro = undefined;
    this._mensagemErroFiscal = undefined;
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

  private static validarDadosFiscais(dados: {
    ambienteFiscal: AmbienteFiscal;
    serieDps?: string;
    numeroDps?: string;
    dataCompetencia?: Date;
    codigoMunicipioPrestacao?: string;
    tributacaoIssqn: TributacaoIssqn;
    tipoRetencaoIssqn: TipoRetencaoIssqn;
    informacoesComplementares?: string;
  }): void {
    if (!Object.values(AmbienteFiscal).includes(dados.ambienteFiscal)) {
      throw new Error('Ambiente fiscal invalido.');
    }

    if (dados.serieDps !== undefined && !/^\d{1,5}$/.test(dados.serieDps)) {
      throw new Error('Serie da DPS deve conter de 1 a 5 digitos.');
    }

    if (
      dados.numeroDps !== undefined &&
      !/^[1-9]\d{0,14}$/.test(dados.numeroDps)
    ) {
      throw new Error('Numero da DPS deve conter de 1 a 15 digitos.');
    }

    if (
      dados.dataCompetencia !== undefined &&
      Number.isNaN(dados.dataCompetencia.getTime())
    ) {
      throw new Error('Data de competencia invalida.');
    }

    if (
      dados.codigoMunicipioPrestacao !== undefined &&
      !/^\d{7}$/.test(dados.codigoMunicipioPrestacao)
    ) {
      throw new Error(
        'Codigo IBGE do municipio da prestacao deve conter 7 digitos.',
      );
    }

    if (!Object.values(TributacaoIssqn).includes(dados.tributacaoIssqn)) {
      throw new Error('Tributacao do ISSQN invalida.');
    }

    if (!Object.values(TipoRetencaoIssqn).includes(dados.tipoRetencaoIssqn)) {
      throw new Error('Tipo de retencao do ISSQN invalido.');
    }

    if (
      dados.informacoesComplementares !== undefined &&
      dados.informacoesComplementares.length > 2000
    ) {
      throw new Error(
        'Informacoes complementares devem conter no maximo 2000 caracteres.',
      );
    }
  }

  private static normalizarTextoOpcional(valor?: string): string | undefined {
    const texto = valor?.trim();

    return texto ? texto : undefined;
  }

  private static validarDataOpcional(data: Date | undefined, campo: string): void {
    if (data !== undefined && Number.isNaN(data.getTime())) {
      throw new Error(`${campo} invalida.`);
    }
  }

  private validarDadosDoStatus(): void {
    if (
      this._status === StatusNota.EMITIDA ||
      this._status === StatusNota.CANCELADA
    ) {
      const numeroNfse = this._numeroNfse?.trim() ?? '';
      const codigoVerificacao = this._codigoVerificacao?.trim() ?? '';
      const temIdentificacaoTradicional = Boolean(
        numeroNfse && codigoVerificacao,
      );
      const temIdentificacaoNacional = Boolean(
        this._protocoloEmissao?.trim() || this._chaveAcesso?.trim(),
      );

      if (!temIdentificacaoTradicional && !temIdentificacaoNacional) {
        NotaServico.validarTextoObrigatorio(numeroNfse, 'Número da NFS-e');
        NotaServico.validarTextoObrigatorio(
          codigoVerificacao,
          'Código de verificação',
        );
      }

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
