import { ErroEnvioDpsNfse } from './ClienteNfseNacional';

export interface ResultadoDownloadDanfseNfse {
  sucesso: boolean;
  statusHttp: number;
  chaveAcesso: string;
  pdf?: Buffer;
  contentType?: string;
  erros?: ErroEnvioDpsNfse[];
}
