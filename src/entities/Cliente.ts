export interface ClienteProps {
  id?: string;
  empresaId: string;
  nomeRazaoSocial: string;
  cpfCnpj: string;
  email?: string;
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade: string;
  uf: string;
  inscricaoMunicipal?: string;
  codigoMunicipioIbge?: string;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlterarDadosCadastraisClienteProps {
  nomeRazaoSocial: string;
  inscricaoMunicipal?: string;
}

export interface AlterarContatoClienteProps {
  email?: string;
  telefone?: string;
}

export interface AlterarEnderecoClienteProps {
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade: string;
  uf: string;
  codigoMunicipioIbge?: string;
}

export class Cliente {
  private readonly _id?: string;
  private readonly _empresaId: string;
  private _nomeRazaoSocial: string;
  private readonly _cpfCnpj: string;
  private _email?: string;
  private _telefone?: string;
  private _cep?: string;
  private _endereco?: string;
  private _numero?: string;
  private _bairro?: string;
  private _cidade: string;
  private _uf: string;
  private _inscricaoMunicipal?: string;
  private _codigoMunicipioIbge?: string;
  private _ativo: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ClienteProps) {
    const empresaId = props.empresaId.trim();
    const nomeRazaoSocial = props.nomeRazaoSocial.trim();
    const cpfCnpj = Cliente.somenteNumeros(props.cpfCnpj);
    const email = Cliente.normalizarEmail(props.email);
    const cep = Cliente.normalizarCep(props.cep);
    const cidade = props.cidade.trim();
    const uf = Cliente.normalizarUf(props.uf);
    const codigoMunicipioIbge = Cliente.normalizarCodigoMunicipioIbge(
      props.codigoMunicipioIbge,
    );

    Cliente.validarEmpresaId(empresaId);
    Cliente.validarNomeRazaoSocial(nomeRazaoSocial);
    Cliente.validarCpfCnpj(cpfCnpj);
    Cliente.validarEmail(email);
    Cliente.validarCep(cep);
    Cliente.validarCidade(cidade);
    Cliente.validarUf(uf);
    Cliente.validarCodigoMunicipioIbge(codigoMunicipioIbge);

    this._id = props.id;
    this._empresaId = empresaId;
    this._nomeRazaoSocial = nomeRazaoSocial;
    this._cpfCnpj = cpfCnpj;
    this._email = email;
    this._telefone = props.telefone;
    this._cep = cep;
    this._endereco = props.endereco;
    this._numero = props.numero;
    this._bairro = props.bairro;
    this._cidade = cidade;
    this._uf = uf;
    this._inscricaoMunicipal = props.inscricaoMunicipal;
    this._codigoMunicipioIbge = codigoMunicipioIbge;
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

  get nomeRazaoSocial(): string {
    return this._nomeRazaoSocial;
  }

  get cpfCnpj(): string {
    return this._cpfCnpj;
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

  get inscricaoMunicipal(): string | undefined {
    return this._inscricaoMunicipal;
  }

  get codigoMunicipioIbge(): string | undefined {
    return this._codigoMunicipioIbge;
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

  alterarDadosCadastrais(props: AlterarDadosCadastraisClienteProps): void {
    const nomeRazaoSocial = props.nomeRazaoSocial.trim();

    Cliente.validarNomeRazaoSocial(nomeRazaoSocial);

    this._nomeRazaoSocial = nomeRazaoSocial;
    this._inscricaoMunicipal = props.inscricaoMunicipal;
    this.atualizarDataDeAlteracao();
  }

  alterarContato(props: AlterarContatoClienteProps): void {
    const email = Cliente.normalizarEmail(props.email);

    Cliente.validarEmail(email);

    this._email = email;
    this._telefone = props.telefone;
    this.atualizarDataDeAlteracao();
  }

  alterarEndereco(props: AlterarEnderecoClienteProps): void {
    const cep = Cliente.normalizarCep(props.cep);
    const cidade = props.cidade.trim();
    const uf = Cliente.normalizarUf(props.uf);
    const codigoMunicipioIbge = Cliente.normalizarCodigoMunicipioIbge(
      props.codigoMunicipioIbge,
    );

    Cliente.validarCep(cep);
    Cliente.validarCidade(cidade);
    Cliente.validarUf(uf);
    Cliente.validarCodigoMunicipioIbge(codigoMunicipioIbge);

    this._cep = cep;
    this._endereco = props.endereco;
    this._numero = props.numero;
    this._bairro = props.bairro;
    this._cidade = cidade;
    this._uf = uf;
    this._codigoMunicipioIbge = codigoMunicipioIbge;
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

  private static somenteNumeros(valor: string): string {
    return valor.replace(/\D/g, '');
  }

  private static normalizarEmail(email?: string): string | undefined {
    const emailNormalizado = email?.trim().toLowerCase();

    return emailNormalizado || undefined;
  }

  private static normalizarCep(cep?: string): string | undefined {
    if (!cep?.trim()) {
      return undefined;
    }

    return Cliente.somenteNumeros(cep);
  }

  private static normalizarUf(uf: string): string {
    return uf.trim().toUpperCase();
  }

  private static validarEmpresaId(empresaId: string): void {
    if (!empresaId) {
      throw new Error('Empresa é obrigatória.');
    }
  }

  private static validarNomeRazaoSocial(nomeRazaoSocial: string): void {
    if (!nomeRazaoSocial) {
      throw new Error('Nome ou razão social é obrigatório.');
    }
  }

  private static validarCpfCnpj(cpfCnpj: string): void {
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      throw new Error('CPF/CNPJ deve conter 11 ou 14 dígitos.');
    }
  }

  private static validarEmail(email?: string): void {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('E-mail inválido.');
    }
  }

  private static validarCep(cep?: string): void {
    if (cep !== undefined && cep.length !== 8) {
      throw new Error('CEP deve conter 8 dígitos.');
    }
  }

  private static validarCidade(cidade: string): void {
    if (!cidade) {
      throw new Error('Cidade é obrigatória.');
    }
  }

  private static validarUf(uf: string): void {
    if (!/^[A-Z]{2}$/.test(uf)) {
      throw new Error('UF deve conter duas letras.');
    }
  }

  private static normalizarCodigoMunicipioIbge(
    codigo?: string,
  ): string | undefined {
    const normalizado = codigo?.replace(/\D/g, '');

    return normalizado || undefined;
  }

  private static validarCodigoMunicipioIbge(codigo?: string): void {
    if (codigo !== undefined && !/^\d{7}$/.test(codigo)) {
      throw new Error('Codigo IBGE do municipio deve conter 7 digitos.');
    }
  }

  private atualizarDataDeAlteracao(): void {
    this._updatedAt = new Date();
  }
}
