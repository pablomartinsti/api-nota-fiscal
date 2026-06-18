import { AmbienteFiscal } from './NotaServico';

export interface ConfiguracaoFiscalEmpresaProps {
  id?: string;
  empresaId: string;
  ambienteFiscalPadrao?: AmbienteFiscal;
  serieDpsPadrao?: string;
  certificadoA1Path?: string;
  certificadoA1Senha?: string;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlterarConfiguracaoFiscalEmpresaProps {
  ambienteFiscalPadrao: AmbienteFiscal;
  serieDpsPadrao: string;
  certificadoA1Path?: string;
  certificadoA1Senha?: string;
}

export class ConfiguracaoFiscalEmpresa {
  private readonly _id?: string;
  private readonly _empresaId: string;
  private _ambienteFiscalPadrao: AmbienteFiscal;
  private _serieDpsPadrao: string;
  private _certificadoA1Path?: string;
  private _certificadoA1Senha?: string;
  private _ativo: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ConfiguracaoFiscalEmpresaProps) {
    const empresaId = props.empresaId.trim();
    const ambienteFiscalPadrao =
      props.ambienteFiscalPadrao ?? AmbienteFiscal.HOMOLOGACAO;
    const serieDpsPadrao = props.serieDpsPadrao ?? '1';
    const certificadoA1Path = ConfiguracaoFiscalEmpresa.normalizarTextoOpcional(
      props.certificadoA1Path,
    );
    const certificadoA1Senha =
      ConfiguracaoFiscalEmpresa.normalizarTextoOpcional(
        props.certificadoA1Senha,
      );

    ConfiguracaoFiscalEmpresa.validarEmpresaId(empresaId);
    ConfiguracaoFiscalEmpresa.validarAmbienteFiscal(ambienteFiscalPadrao);
    ConfiguracaoFiscalEmpresa.validarSerieDps(serieDpsPadrao);

    this._id = props.id;
    this._empresaId = empresaId;
    this._ambienteFiscalPadrao = ambienteFiscalPadrao;
    this._serieDpsPadrao = serieDpsPadrao;
    this._certificadoA1Path = certificadoA1Path;
    this._certificadoA1Senha = certificadoA1Senha;
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

  get ambienteFiscalPadrao(): AmbienteFiscal {
    return this._ambienteFiscalPadrao;
  }

  get serieDpsPadrao(): string {
    return this._serieDpsPadrao;
  }

  get certificadoA1Path(): string | undefined {
    return this._certificadoA1Path;
  }

  get certificadoA1Senha(): string | undefined {
    return this._certificadoA1Senha;
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

  alterarDados(props: AlterarConfiguracaoFiscalEmpresaProps): void {
    const certificadoA1Path = ConfiguracaoFiscalEmpresa.normalizarTextoOpcional(
      props.certificadoA1Path,
    );
    const certificadoA1Senha =
      ConfiguracaoFiscalEmpresa.normalizarTextoOpcional(
        props.certificadoA1Senha,
      );

    ConfiguracaoFiscalEmpresa.validarAmbienteFiscal(
      props.ambienteFiscalPadrao,
    );
    ConfiguracaoFiscalEmpresa.validarSerieDps(props.serieDpsPadrao);

    this._ambienteFiscalPadrao = props.ambienteFiscalPadrao;
    this._serieDpsPadrao = props.serieDpsPadrao;
    this._certificadoA1Path = certificadoA1Path;
    this._certificadoA1Senha = certificadoA1Senha;
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
      throw new Error('Empresa e obrigatoria.');
    }
  }

  private static validarAmbienteFiscal(ambienteFiscal: AmbienteFiscal): void {
    if (!Object.values(AmbienteFiscal).includes(ambienteFiscal)) {
      throw new Error('Ambiente fiscal padrao invalido.');
    }
  }

  private static validarSerieDps(serieDps: string): void {
    if (!/^\d{1,5}$/.test(serieDps)) {
      throw new Error('Serie padrao da DPS deve conter de 1 a 5 digitos.');
    }
  }

  private static normalizarTextoOpcional(valor?: string): string | undefined {
    const texto = valor?.trim();

    return texto || undefined;
  }

  private atualizarDataDeAlteracao(): void {
    this._updatedAt = new Date();
  }
}
