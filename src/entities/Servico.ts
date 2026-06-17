export interface ServicoProps {
  id?: string;
  empresaId: string;
  descricao: string;
  codigoServico: string;
  codigoTributacaoNacional?: string;
  codigoTributacaoMunicipal?: string;
  codigoNbs?: string;
  aliquotaIss: number;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlterarDadosServicoProps {
  descricao: string;
  codigoServico: string;
  codigoTributacaoNacional?: string;
  codigoTributacaoMunicipal?: string;
  codigoNbs?: string;
}

export class Servico {
  private readonly _id?: string;
  private readonly _empresaId: string;
  private _descricao: string;
  private _codigoServico: string;
  private _codigoTributacaoNacional?: string;
  private _codigoTributacaoMunicipal?: string;
  private _codigoNbs?: string;
  private _aliquotaIss: number;
  private _ativo: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ServicoProps) {
    const empresaId = props.empresaId.trim();
    const descricao = props.descricao.trim();
    const codigoServico = props.codigoServico.trim();

    Servico.validarEmpresaId(empresaId);
    Servico.validarDescricao(descricao);
    Servico.validarCodigoServico(codigoServico);
    Servico.validarCodigoTributacaoNacional(props.codigoTributacaoNacional);
    Servico.validarCodigoNbs(props.codigoNbs);
    Servico.validarAliquotaIss(props.aliquotaIss);

    this._id = props.id;
    this._empresaId = empresaId;
    this._descricao = descricao;
    this._codigoServico = codigoServico;
    this._codigoTributacaoNacional = props.codigoTributacaoNacional;
    this._codigoTributacaoMunicipal = props.codigoTributacaoMunicipal;
    this._codigoNbs = props.codigoNbs;
    this._aliquotaIss = props.aliquotaIss;
    this._ativo = props.ativo ?? true;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string | undefined {
    return this._id;
  }

  get empresaId(): string {
    return this._empresaId;
  }

  get descricao(): string {
    return this._descricao;
  }

  get codigoServico(): string {
    return this._codigoServico;
  }

  get codigoTributacaoMunicipal(): string | undefined {
    return this._codigoTributacaoMunicipal;
  }

  get codigoTributacaoNacional(): string | undefined {
    return this._codigoTributacaoNacional;
  }

  get codigoNbs(): string | undefined {
    return this._codigoNbs;
  }

  get aliquotaIss(): number {
    return this._aliquotaIss;
  }

  get ativo(): boolean {
    return this._ativo;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  alterarDados(props: AlterarDadosServicoProps): void {
    const descricao = props.descricao.trim();
    const codigoServico = props.codigoServico.trim();

    Servico.validarDescricao(descricao);
    Servico.validarCodigoServico(codigoServico);
    Servico.validarCodigoTributacaoNacional(props.codigoTributacaoNacional);
    Servico.validarCodigoNbs(props.codigoNbs);

    this._descricao = descricao;
    this._codigoServico = codigoServico;
    this._codigoTributacaoNacional = props.codigoTributacaoNacional;
    this._codigoTributacaoMunicipal = props.codigoTributacaoMunicipal;
    this._codigoNbs = props.codigoNbs;
    this.atualizarDataDeAlteracao();
  }

  alterarAliquotaIss(aliquotaIss: number): void {
    Servico.validarAliquotaIss(aliquotaIss);

    this._aliquotaIss = aliquotaIss;
    this.atualizarDataDeAlteracao();
  }

  ativar(): void {
    this._ativo = true;
    this.atualizarDataDeAlteracao();
  }

  desativar(): void {
    this._ativo = false;
    this.atualizarDataDeAlteracao();
  }

  private static validarEmpresaId(empresaId: string): void {
    if (!empresaId) {
      throw new Error('Empresa é obrigatória.');
    }
  }

  private static validarDescricao(descricao: string): void {
    if (!descricao) {
      throw new Error('Descrição é obrigatória.');
    }
  }

  private static validarCodigoServico(codigoServico: string): void {
    if (!codigoServico) {
      throw new Error('Código do serviço é obrigatório.');
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

  private static validarCodigoTributacaoNacional(codigo?: string): void {
    if (codigo !== undefined && !/^\d{6}$/.test(codigo)) {
      throw new Error('Codigo de tributacao nacional deve conter 6 digitos.');
    }
  }

  private static validarCodigoNbs(codigo?: string): void {
    if (codigo !== undefined && !/^\d{9}$/.test(codigo)) {
      throw new Error('Codigo NBS deve conter 9 digitos.');
    }
  }

  private atualizarDataDeAlteracao(): void {
    this._updatedAt = new Date();
  }
}
