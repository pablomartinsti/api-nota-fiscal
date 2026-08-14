import { NotaServico } from '../../entities/NotaServico';
import { TransicaoStatusNotaInvalidaError } from '../../errors/TransicaoStatusNotaInvalidaError';

const MENSAGEM_VALOR_SUBSTITUICAO_NAO_PERMITIDO =
  'Para substituir uma NFS-e do Simples Nacional, o valor do servico deve ser igual ao da nota original. Para corrigir valor, cancele a nota original e emita uma nova NFS-e com o valor correto.';

export function validarValorServicoSubstituicao(
  notaSubstituida: NotaServico,
  valorServicoSubstituto: number,
): void {
  if (
    converterParaCentavos(notaSubstituida.valorServico) ===
    converterParaCentavos(valorServicoSubstituto)
  ) {
    return;
  }

  throw new TransicaoStatusNotaInvalidaError(
    MENSAGEM_VALOR_SUBSTITUICAO_NAO_PERMITIDO,
  );
}

function converterParaCentavos(valor: number): number {
  return Math.round(valor * 100);
}
