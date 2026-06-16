export interface EnviarDpsAssinadaInput {
  xmlAssinado: string;
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

export interface ClienteNfseNacional {
  enviarDpsAssinada(
    input: EnviarDpsAssinadaInput,
  ): Promise<ResultadoEnvioDpsNfse>;
}
