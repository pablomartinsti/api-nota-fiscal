import { AmbienteFiscal } from '../entities/NotaServico';

export interface ConfiguracaoCertificadoClienteNfseInput {
  certificadoPath?: string;
  certificadoSenha?: string;
}

export interface ConfiguracaoAmbienteFiscalClienteNfseInput {
  ambienteFiscal: AmbienteFiscal;
}

export interface EnviarDpsAssinadaInput
  extends ConfiguracaoCertificadoClienteNfseInput,
    ConfiguracaoAmbienteFiscalClienteNfseInput {
  xmlAssinado: string;
}

export interface ConsultarNfsePorChaveInput
  extends ConfiguracaoCertificadoClienteNfseInput,
    ConfiguracaoAmbienteFiscalClienteNfseInput {
  chaveAcesso: string;
}

export interface RegistrarEventoCancelamentoNfseInput
  extends ConfiguracaoCertificadoClienteNfseInput,
    ConfiguracaoAmbienteFiscalClienteNfseInput {
  chaveAcesso: string;
  xmlPedidoEventoAssinado: string;
}

export interface ErroEnvioDpsNfse {
  codigo?: string;
  mensagem: string;
  campo?: string;
}

export interface ResultadoEnvioDpsNfse {
  sucesso: boolean;
  statusHttp: number;
  protocolo?: string;
  chaveAcesso?: string;
  numeroNfse?: string;
  codigoVerificacao?: string;
  xmlAutorizado?: string;
  erros?: ErroEnvioDpsNfse[];
}

export interface ResultadoConsultaNfseNacional {
  sucesso: boolean;
  statusHttp: number;
  tipoAmbiente?: number;
  versaoAplicativo?: string;
  dataHoraProcessamento?: string;
  chaveAcesso?: string;
  xmlAutorizado?: string;
  erros?: ErroEnvioDpsNfse[];
}

export interface ResultadoRegistroEventoNfse {
  sucesso: boolean;
  statusHttp: number;
  tipoAmbiente?: number;
  versaoAplicativo?: string;
  dataHoraProcessamento?: string;
  xmlEvento?: string;
  erros?: ErroEnvioDpsNfse[];
}

export interface ClienteNfseNacional {
  enviarDpsAssinada(
    input: EnviarDpsAssinadaInput,
  ): Promise<ResultadoEnvioDpsNfse>;

  consultarNfsePorChave(
    input: ConsultarNfsePorChaveInput,
  ): Promise<ResultadoConsultaNfseNacional>;

  registrarEventoCancelamento(
    input: RegistrarEventoCancelamentoNfseInput,
  ): Promise<ResultadoRegistroEventoNfse>;
}
