import { AmbienteFiscal } from '../entities/NotaServico';
import { ErroEnvioDpsNfse } from './ClienteNfseNacional';

export interface BaixarDanfsePorChaveInput {
  ambienteFiscal: AmbienteFiscal;
  chaveAcesso: string;
  certificadoPath?: string;
  certificadoConteudoBase64?: string;
  certificadoSenha?: string;
}

export interface ResultadoDownloadDanfseNfse {
  sucesso: boolean;
  statusHttp: number;
  chaveAcesso: string;
  pdf?: Buffer;
  contentType?: string;
  erros?: ErroEnvioDpsNfse[];
}

export interface ClienteDanfseNfseNacional {
  baixarDanfsePorChave(
    input: BaixarDanfsePorChaveInput,
  ): Promise<ResultadoDownloadDanfseNfse>;
}
