export enum RegimeTributario {
  MEI = 'MEI',
  SIMPLES_NACIONAL = 'SIMPLES_NACIONAL',
  LUCRO_PRESUMIDO = 'LUCRO_PRESUMIDO',
  LUCRO_REAL = 'LUCRO_REAL',
}

export interface EmpresaProps {
  id?: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoMunicipal?: string;
  regimeTributario: RegimeTributario;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade: string;
  uf: string;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlterarDadosCadastraisProps {
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoMunicipal?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade: string;
  uf: string;
}

export class Empresa {
  private readonly _id?: string;
  private _razaoSocial: string;
  private _nomeFantasia?: string;
  private readonly _cnpj: string;
  private _inscricaoMunicipal?: string;
  private _regimeTributario: RegimeTributario;
  private _email?: string;
  private _telefone?: string;
  private _cep?: string;
  private _endereco?: string;
  private _numero?: string;
  private _bairro?: string;
  private _cidade: string;
  private _uf: string;
  private _ativo: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: EmpresaProps) {
    const razaoSocial = props.razaoSocial.trim();
    const cnpj = props.cnpj.replace(/\D/g, '');
    const email = Empresa.normalizarEmail(props.email);
    const cep = Empresa.normalizarCep(props.cep);
    const cidade = props.cidade.trim();
    const uf = props.uf.trim().toUpperCase();

    if (!razaoSocial) {
      throw new Error('Razão social é obrigatória.');
    }

    if (cnpj.length !== 14) {
      throw new Error('CNPJ deve conter 14 dígitos.');
    }

    if (!cidade) {
      throw new Error('Cidade é obrigatória.');
    }

    if (!/^[A-Z]{2}$/.test(uf)) {
      throw new Error('UF deve conter duas letras.');
    }

    if (!Object.values(RegimeTributario).includes(props.regimeTributario)) {
      throw new Error('Regime tributário inválido.');
    }

    Empresa.validarEmail(email);
    Empresa.validarCep(cep);

    this._id = props.id;
    this._razaoSocial = razaoSocial;
    this._nomeFantasia = props.nomeFantasia;
    this._cnpj = cnpj;
    this._inscricaoMunicipal = props.inscricaoMunicipal;
    this._regimeTributario = props.regimeTributario;
    this._email = email;
    this._telefone = props.telefone;
    this._cep = cep;
    this._endereco = props.endereco;
    this._numero = props.numero;
    this._bairro = props.bairro;
    this._cidade = cidade;
    this._uf = uf;
    this._ativo = props.ativo ?? true;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string | undefined {
    return this._id;
  }

  get razaoSocial(): string {
    return this._razaoSocial;
  }

  get nomeFantasia(): string | undefined {
    return this._nomeFantasia;
  }

  get cnpj(): string {
    return this._cnpj;
  }

  get inscricaoMunicipal(): string | undefined {
    return this._inscricaoMunicipal;
  }

  get regimeTributario(): RegimeTributario {
    return this._regimeTributario;
  }

  get email(): string | undefined {
    return this._email;
  }

  get telefone(): string | undefined {
    return this._telefone;
  }

  get cep(): string | undefined {
    return this._cep;
  }

  get endereco(): string | undefined {
    return this._endereco;
  }

  get numero(): string | undefined {
    return this._numero;
  }

  get bairro(): string | undefined {
    return this._bairro;
  }

  get cidade(): string {
    return this._cidade;
  }

  get uf(): string {
    return this._uf;
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

  alterarDadosCadastrais(props: AlterarDadosCadastraisProps): void {
    const razaoSocial = props.razaoSocial.trim();
    const email = Empresa.normalizarEmail(props.email);
    const cep = Empresa.normalizarCep(props.cep);
    const cidade = props.cidade.trim();
    const uf = props.uf.trim().toUpperCase();

    if (!razaoSocial) {
      throw new Error('Razão social é obrigatória.');
    }

    if (!cidade) {
      throw new Error('Cidade é obrigatória.');
    }

    if (!/^[A-Z]{2}$/.test(uf)) {
      throw new Error('UF deve conter duas letras.');
    }

    Empresa.validarEmail(email);
    Empresa.validarCep(cep);

    this._razaoSocial = razaoSocial;
    this._nomeFantasia = props.nomeFantasia;
    this._inscricaoMunicipal = props.inscricaoMunicipal;
    this._email = email;
    this._telefone = props.telefone;
    this._cep = cep;
    this._endereco = props.endereco;
    this._numero = props.numero;
    this._bairro = props.bairro;
    this._cidade = cidade;
    this._uf = uf;
    this._updatedAt = new Date();
  }

  alterarRegimeTributario(regimeTributario: RegimeTributario): void {
    if (!Object.values(RegimeTributario).includes(regimeTributario)) {
      throw new Error('Regime tributário inválido.');
    }

    this._regimeTributario = regimeTributario;
    this._updatedAt = new Date();
  }

  ativar(): void {
    this._ativo = true;
    this._updatedAt = new Date();
  }

  desativar(): void {
    this._ativo = false;
    this._updatedAt = new Date();
  }

  private static normalizarEmail(email?: string): string | undefined {
    const normalizado = email?.trim().toLowerCase();

    return normalizado || undefined;
  }

  private static normalizarCep(cep?: string): string | undefined {
    if (!cep?.trim()) {
      return undefined;
    }

    return cep.replace(/\D/g, '');
  }

  private static validarEmail(email?: string): void {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('E-mail invalido.');
    }
  }

  private static validarCep(cep?: string): void {
    if (cep !== undefined && cep.length !== 8) {
      throw new Error('CEP deve conter 8 digitos.');
    }
  }
}
