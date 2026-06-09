export interface ServicoProps {
  id?: string;
  empresaId: string;
  descricao: string;
  codigoServico: string;
  codigoTributacaoMunicipal?: string;
  aliquotaIss: number;
  valorPadrao?: number;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlterarDadosServicoProps {
  descricao: string;
  codigoServico: string;
  codigoTributacaoMunicipal?: string;
}

export class Servico {
  private readonly _id?: string;
  private readonly _empresaId: string;
  private _descricao: string;
  private _codigoServico: string;
  private _codigoTributacaoMunicipal?: string;
  private _aliquotaIss: number;
  private _valorPadrao?: number;
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
    Servico.validarAliquotaIss(props.aliquotaIss);
    Servico.validarValorPadrao(props.valorPadrao);

    this._id = props.id;
    this._empresaId = empresaId;
    this._descricao = descricao;
    this._codigoServico = codigoServico;
    this._codigoTributacaoMunicipal = props.codigoTributacaoMunicipal;
    this._aliquotaIss = props.aliquotaIss;
    this._valorPadrao = props.valorPadrao;
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

  get aliquotaIss(): number {
    return this._aliquotaIss;
  }

  get valorPadrao(): number | undefined {
    return this._valorPadrao;
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

    this._descricao = descricao;
    this._codigoServico = codigoServico;
    this._codigoTributacaoMunicipal = props.codigoTributacaoMunicipal;
    this.atualizarDataDeAlteracao();
  }

  alterarAliquotaIss(aliquotaIss: number): void {
    Servico.validarAliquotaIss(aliquotaIss);

    this._aliquotaIss = aliquotaIss;
    this.atualizarDataDeAlteracao();
  }

  alterarValorPadrao(valorPadrao?: number): void {
    Servico.validarValorPadrao(valorPadrao);

    this._valorPadrao = valorPadrao;
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

  private static validarValorPadrao(valorPadrao?: number): void {
    if (valorPadrao === undefined) {
      return;
    }

    if (!Number.isFinite(valorPadrao)) {
      throw new Error('Valor padrão deve ser um número válido.');
    }

    if (valorPadrao <= 0) {
      throw new Error('Valor padrão deve ser maior que zero.');
    }
  }

  private atualizarDataDeAlteracao(): void {
    this._updatedAt = new Date();
  }
}
