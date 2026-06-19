const VALOR_MASCARADO = '[REDACTED]';
const TAMANHO_MAXIMO_STRING = 500;
const CHAVES_SENSIVEIS = [
  'authorization',
  'token',
  'senha',
  'password',
  'secret',
  'certificado',
  'certificadoa1senha',
  'certificadoa1path',
  'nfse_certificado_senha',
  'nfse_certificado_path',
  'xml',
  'xmlautorizado',
  'dpsxmlgzipb64',
  'pedidoregistroeventoxmlgzipb64',
];

export function sanitizarLog(valor: unknown): unknown {
  if (valor === null || valor === undefined) {
    return valor;
  }

  if (typeof valor === 'string') {
    return limitarString(valor);
  }

  if (typeof valor !== 'object') {
    return valor;
  }

  if (Array.isArray(valor)) {
    return valor.map(sanitizarLog);
  }

  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>).map(([chave, item]) => [
      chave,
      chaveSensivel(chave) ? VALOR_MASCARADO : sanitizarLog(item),
    ]),
  );
}

function chaveSensivel(chave: string): boolean {
  const chaveNormalizada = chave.toLowerCase().replace(/[^a-z0-9]/g, '');

  return CHAVES_SENSIVEIS.some((sensivel) =>
    chaveNormalizada.includes(sensivel),
  );
}

function limitarString(valor: string): string {
  if (valor.length <= TAMANHO_MAXIMO_STRING) {
    return valor;
  }

  return `${valor.slice(0, TAMANHO_MAXIMO_STRING)}...`;
}
