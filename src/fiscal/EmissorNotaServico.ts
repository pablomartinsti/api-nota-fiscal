import { NotaServico } from '../entities/NotaServico';

export interface EmitirNotaServicoInput {
  nota: NotaServico;
  simularFalha?: boolean;
}

export type ResultadoEmissaoNotaServico =
  | {
      sucesso: true;
      numeroNfse: string;
      codigoVerificacao: string;
      dataEmissao: Date;
      linkPdf?: string;
      xmlUrl?: string;
    }
  | {
      sucesso: false;
      mensagemErro: string;
    };

export interface EmissorNotaServico {
  emitir(
    input: EmitirNotaServicoInput,
  ): Promise<ResultadoEmissaoNotaServico>;
}
