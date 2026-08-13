import { AmbienteFiscal } from './NotaServico';

export interface ConfiguracaoFiscalEmpresaProps {
  id?: string;
  empresaId: string;
  ambienteFiscalPadrao?: AmbienteFiscal;
  serieDpsPadrao?: string;
  certificadoA1Path?: string;
  certificadoA1NomeArquivo?: string;
  certificadoA1Conteudo?: string;
  certificadoA1Senha?: string;
  certificadoA1ValidoAte?: Date;
  emissaoHabilitada?: boolean;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlterarConfiguracaoFiscalEmpresaProps {
  ambienteFiscalPadrao: AmbienteFiscal;
  serieDpsPadrao: string;
  certificadoA1Path?: string;
  certificadoA1NomeArquivo?: string;
  certificadoA1Conteudo?: string;
  certificadoA1Senha?: string;
  certificadoA1ValidoAte?: Date;
}

export class ConfiguracaoFiscalEmpresa {
  private readonly _id?: string;
  private readonly _empresaId: string;
  private _ambienteFiscalPadrao: AmbienteFiscal;
  private _serieDpsPadrao: string;
  private _certificadoA1Path?: string;
  private _certificadoA1NomeArquivo?: string;
  private _certificadoA1Conteudo?: string;
  private _certificadoA1Senha?: string;
  private _certificadoA1ValidoAte?: Date;
  private _emissaoHabilitada: boolean;
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
    const certificadoA1NomeArquivo =
      ConfiguracaoFiscalEmpresa.normalizarTextoOpcional(
        props.certificadoA1NomeArquivo,
      );
    const certificadoA1Conteudo =
      ConfiguracaoFiscalEmpresa.normalizarTextoOpcional(
        props.certificadoA1Conteudo,
      );
    const certificadoA1Senha =
      ConfiguracaoFiscalEmpresa.normalizarTextoOpcional(
        props.certificadoA1Senha,
      );
    const certificadoA1ValidoAte = props.certificadoA1ValidoAte;

    ConfiguracaoFiscalEmpresa.validarEmpresaId(empresaId);
    ConfiguracaoFiscalEmpresa.validarAmbienteFiscal(ambienteFiscalPadrao);
    ConfiguracaoFiscalEmpresa.validarSerieDps(serieDpsPadrao);

    this._id = props.id;
    this._empresaId = empresaId;
    this._ambienteFiscalPadrao = ambienteFiscalPadrao;
    this._serieDpsPadrao = serieDpsPadrao;
    this._certificadoA1Path = certificadoA1Path;
    this._certificadoA1NomeArquivo = certificadoA1NomeArquivo;
    this._certificadoA1Conteudo = certificadoA1Conteudo;
    this._certificadoA1Senha = certificadoA1Senha;
    this._certificadoA1ValidoAte = certificadoA1ValidoAte;
    this._emissaoHabilitada = props.emissaoHabilitada ?? true;
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

  get certificadoA1NomeArquivo(): string | undefined {
    return this._certificadoA1NomeArquivo;
  }

  get certificadoA1Conteudo(): string | undefined {
    return this._certificadoA1Conteudo;
  }

  get certificadoA1Senha(): string | undefined {
    return this._certificadoA1Senha;
  }

  get certificadoA1ValidoAte(): Date | undefined {
    return this._certificadoA1ValidoAte;
  }

  get emissaoHabilitada(): boolean {
    return this._emissaoHabilitada;
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
    const certificadoA1NomeArquivo =
      ConfiguracaoFiscalEmpresa.normalizarTextoOpcional(
        props.certificadoA1NomeArquivo,
      );
    const certificadoA1Conteudo =
      ConfiguracaoFiscalEmpresa.normalizarTextoOpcional(
        props.certificadoA1Conteudo,
      );
    const certificadoA1Senha =
      ConfiguracaoFiscalEmpresa.normalizarTextoOpcional(
        props.certificadoA1Senha,
      );
    const certificadoA1ValidoAte = props.certificadoA1ValidoAte;

    ConfiguracaoFiscalEmpresa.validarAmbienteFiscal(
      props.ambienteFiscalPadrao,
    );
    ConfiguracaoFiscalEmpresa.validarSerieDps(props.serieDpsPadrao);

    this._ambienteFiscalPadrao = props.ambienteFiscalPadrao;
    this._serieDpsPadrao = props.serieDpsPadrao;
    this._certificadoA1Path = certificadoA1Path;
    this._certificadoA1NomeArquivo = certificadoA1NomeArquivo;
    this._certificadoA1Conteudo = certificadoA1Conteudo;
    this._certificadoA1Senha = certificadoA1Senha;
    this._certificadoA1ValidoAte = certificadoA1ValidoAte;
    this.atualizarDataDeAlteracao();
  }

  possuiCertificadoA1(): boolean {
    return Boolean(
      this._certificadoA1Senha &&
        this._certificadoA1Conteudo,
    );
  }

  ativar(): void {
    this._ativo = true;
    this.atualizarDataDeAlteracao();
  }

  desativar(): void {
    this._ativo = false;
    this.atualizarDataDeAlteracao();
  }

  habilitarEmissao(): void {
    this._emissaoHabilitada = true;
    this.atualizarDataDeAlteracao();
  }

  bloquearEmissao(): void {
    this._emissaoHabilitada = false;
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
