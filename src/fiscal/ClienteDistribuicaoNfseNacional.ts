import { AmbienteFiscal } from '../entities/NotaServico';
import { ErroEnvioDpsNfse } from './ClienteNfseNacional';

export interface ConsultarDocumentosDistribuidosPorNsuInput {
  ambienteFiscal: AmbienteFiscal;
  certificadoPath?: string;
  certificadoSenha?: string;
  nsu: number;
}

export interface DocumentoFiscalDistribuidoNfse {
  nsu?: number;
  chaveAcesso?: string;
  xml: string;
}

export interface ResultadoConsultaDocumentosDistribuidosNfse {
  sucesso: boolean;
  statusHttp: number;
  documentos: DocumentoFiscalDistribuidoNfse[];
  proximoNsu?: number;
  maxNsu?: number;
  erros?: ErroEnvioDpsNfse[];
}

export interface ClienteDistribuicaoNfseNacional {
  consultarDocumentosPorNsu(
    input: ConsultarDocumentosDistribuidosPorNsuInput,
  ): Promise<ResultadoConsultaDocumentosDistribuidosNfse>;
}
