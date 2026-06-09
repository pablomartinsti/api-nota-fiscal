export enum PerfilUsuario {
  DONO = 'DONO',
  ADMIN = 'ADMIN',
  OPERADOR = 'OPERADOR',
}

export interface UsuarioProps {
  id?: string;
  empresaId: string;
  nome: string;
  email: string;
  senhaHash: string;
  perfil: PerfilUsuario;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Usuario {
  private readonly _id?: string;
  private readonly _empresaId: string;
  private _nome: string;
  private _email: string;
  private _senhaHash: string;
  private _perfil: PerfilUsuario;
  private _ativo: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UsuarioProps) {
    const empresaId = props.empresaId.trim();
    const nome = props.nome.trim();
    const email = Usuario.normalizarEmail(props.email);
    const senhaHash = props.senhaHash;

    if (!empresaId) {
      throw new Error('Empresa é obrigatória.');
    }

    if (!nome) {
      throw new Error('Nome é obrigatório.');
    }

    Usuario.validarEmail(email);

    if (!senhaHash.trim()) {
      throw new Error('Hash da senha é obrigatório.');
    }

    Usuario.validarPerfil(props.perfil);

    this._id = props.id;
    this._empresaId = empresaId;
    this._nome = nome;
    this._email = email;
    this._senhaHash = senhaHash;
    this._perfil = props.perfil;
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

  get nome(): string {
    return this._nome;
  }

  get email(): string {
    return this._email;
  }

  get senhaHash(): string {
    return this._senhaHash;
  }

  get perfil(): PerfilUsuario {
    return this._perfil;
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

  alterarNome(nome: string): void {
    const nomeNormalizado = nome.trim();

    if (!nomeNormalizado) {
      throw new Error('Nome é obrigatório.');
    }

    this._nome = nomeNormalizado;
    this.atualizarDataDeAlteracao();
  }

  alterarEmail(email: string): void {
    const emailNormalizado = Usuario.normalizarEmail(email);

    Usuario.validarEmail(emailNormalizado);

    this._email = emailNormalizado;
    this.atualizarDataDeAlteracao();
  }

  alterarSenhaHash(senhaHash: string): void {
    if (!senhaHash.trim()) {
      throw new Error('Hash da senha é obrigatório.');
    }

    this._senhaHash = senhaHash;
    this.atualizarDataDeAlteracao();
  }

  alterarPerfil(perfil: PerfilUsuario): void {
    Usuario.validarPerfil(perfil);

    this._perfil = perfil;
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

  private static normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private static validarEmail(email: string): void {
    if (!email) {
      throw new Error('E-mail é obrigatório.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('E-mail inválido.');
    }
  }

  private static validarPerfil(perfil: PerfilUsuario): void {
    if (!Object.values(PerfilUsuario).includes(perfil)) {
      throw new Error('Perfil de usuário inválido.');
    }
  }

  private atualizarDataDeAlteracao(): void {
    this._updatedAt = new Date();
  }
}
