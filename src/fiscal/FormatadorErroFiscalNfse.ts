import { ErroEnvioDpsNfse } from './ClienteNfseNacional';

export function formatarErrosFiscaisNfse(
  erros: ErroEnvioDpsNfse[] | undefined,
  mensagemPadrao: string,
): string {
  if (!erros?.length) {
    return mensagemPadrao;
  }

  return erros.map(formatarErroFiscalNfse).join('; ');
}

export function formatarErroFiscalNfse(erro: ErroEnvioDpsNfse): string {
  const prefixos = [erro.codigo, erro.campo].filter(Boolean).join(' ');

  return prefixos ? `${prefixos}: ${erro.mensagem}` : erro.mensagem;
}
