import { randomUUID } from 'node:crypto';

import {
  EmissorNotaServico,
  EmitirNotaServicoInput,
  ResultadoEmissaoNotaServico,
} from './EmissorNotaServico';

export class EmissorNotaServicoSimulado implements EmissorNotaServico {
  async emitir(
    input: EmitirNotaServicoInput,
  ): Promise<ResultadoEmissaoNotaServico> {
    if (input.simularFalha) {
      return {
        sucesso: false,
        mensagemErro: 'Falha simulada na emissao da NFS-e.',
      };
    }

    const identificador = randomUUID();

    return {
      sucesso: true,
      numeroNfse: Date.now().toString(),
      codigoVerificacao: identificador.split('-')[0].toUpperCase(),
      dataEmissao: new Date(),
      linkPdf: `https://simulador.local/notas/${identificador}.pdf`,
      xmlUrl: `https://simulador.local/notas/${identificador}.xml`,
    };
  }
}
