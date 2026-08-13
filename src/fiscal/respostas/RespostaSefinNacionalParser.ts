import { gunzipSync } from 'node:zlib';

import { ErroEnvioDpsNfse } from '../clientes/ClienteNfseNacional';

const TAMANHO_MAXIMO_MENSAGEM_ERRO = 500;
const MENSAGEM_SEFIN_INDISPONIVEL =
  'Portal Nacional da NFS-e indisponivel no momento (HTTP 503). Tente novamente em alguns minutos.';

export class RespostaSefinNacionalParser {
  parsear(textoResposta: string): unknown {
    if (!textoResposta.trim()) {
      return undefined;
    }

    try {
      return JSON.parse(textoResposta);
    } catch {
      return textoResposta;
    }
  }

  extrairErros(corpo: unknown, statusHttp: number): ErroEnvioDpsNfse[] {
    if (statusHttp === 503) {
      return [{ mensagem: MENSAGEM_SEFIN_INDISPONIVEL }];
    }

    const objeto = this.comoObjeto(corpo);
    const erros = objeto
      ? this.buscarValor(objeto, [
          'erros',
          'errors',
          'mensagens',
          'mensagensProcessamento',
          'Mensagens',
          'Erros',
        ])
      : undefined;

    if (Array.isArray(erros)) {
      return erros.map((erro) => this.normalizarErro(erro));
    }

    const erro = objeto
      ? this.buscarValor(objeto, [
          'erro',
          'error',
          'mensagemProcessamento',
          'MensagemProcessamento',
          'mensagem',
          'Mensagem',
        ])
      : undefined;

    if (erro && typeof erro === 'object') {
      return [this.normalizarErro(erro)];
    }

    const mensagem = this.buscarTexto(corpo, [
      'mensagem',
      'message',
      'detail',
      'descricao',
    ]);

    if (mensagem) {
      return [{ mensagem }];
    }

    return [{ mensagem: `SEFIN Nacional retornou HTTP ${statusHttp}.` }];
  }

  extrairXmlAutorizado(corpo: unknown): string | undefined {
    const xmlDireto = this.buscarString(corpo, [
      'xmlAutorizado',
      'xmlNfse',
      'xmlNFSe',
      'xml',
    ]);

    if (xmlDireto) {
      return xmlDireto;
    }

    const xmlCompactado = this.buscarString(corpo, [
      'nfseXmlGZipB64',
      'xmlAutorizadoGZipB64',
      'xmlNfseGZipB64',
    ]);

    if (!xmlCompactado) {
      return undefined;
    }

    try {
      return gunzipSync(Buffer.from(xmlCompactado, 'base64')).toString('utf8');
    } catch {
      return undefined;
    }
  }

  extrairXmlEvento(corpo: unknown): string | undefined {
    const xmlDireto = this.buscarString(corpo, [
      'xmlEvento',
      'eventoXml',
      'xml',
    ]);

    if (xmlDireto) {
      return xmlDireto;
    }

    const xmlCompactado = this.buscarString(corpo, [
      'eventoXmlGZipB64',
      'xmlEventoGZipB64',
    ]);

    if (!xmlCompactado) {
      return undefined;
    }

    try {
      return gunzipSync(Buffer.from(xmlCompactado, 'base64')).toString('utf8');
    } catch {
      return undefined;
    }
  }

  buscarTexto(corpo: unknown, chaves: string[]): string | undefined {
    const valor = this.buscarString(corpo, chaves);

    return valor ? this.limitarMensagem(valor) : undefined;
  }

  buscarNumero(corpo: unknown, chaves: string[]): number | undefined {
    const objeto = this.comoObjeto(corpo);

    if (!objeto) {
      return undefined;
    }

    for (const chave of chaves) {
      const valor = this.buscarValor(objeto, [chave]);

      if (typeof valor === 'number') {
        return valor;
      }

      if (typeof valor === 'string' && valor.trim()) {
        const numero = Number(valor);

        if (Number.isFinite(numero)) {
          return numero;
        }
      }
    }

    return undefined;
  }

  buscarTextoEmXml(
    xml: string | undefined,
    chaves: string[],
  ): string | undefined {
    if (!xml) {
      return undefined;
    }

    for (const chave of chaves) {
      const resultado = xml.match(
        new RegExp(
          `<(?:[\\w.-]+:)?${chave}\\b[^>]*>([^<]+)</(?:[\\w.-]+:)?${chave}>`,
        ),
      );
      const valor = resultado?.[1]?.trim();

      if (valor) {
        return this.limitarMensagem(valor);
      }
    }

    return undefined;
  }

  private normalizarErro(erro: unknown): ErroEnvioDpsNfse {
    const objeto = this.comoObjeto(erro);

    if (!objeto) {
      return { mensagem: this.limitarMensagem(String(erro)) };
    }

    return {
      codigo: this.buscarTexto(objeto, ['codigo', 'code', 'id']),
      mensagem: this.montarMensagemErro(objeto),
      campo: this.buscarTexto(objeto, ['campo', 'field', 'path']),
    };
  }

  private montarMensagemErro(objeto: Record<string, unknown>): string {
    const mensagem =
      this.buscarTexto(objeto, [
        'mensagem',
        'message',
        'detail',
        'descricao',
        'description',
        'erro',
      ]) ?? 'Erro retornado pela SEFIN Nacional.';
    const complemento = this.buscarTexto(objeto, [
      'complemento',
      'complement',
      'detalhe',
      'observacao',
    ]);

    return complemento ? `${mensagem} ${complemento}` : mensagem;
  }

  private buscarValor(
    objeto: Record<string, unknown>,
    chaves: string[],
  ): unknown {
    for (const chave of chaves) {
      if (chave in objeto) {
        return objeto[chave];
      }
    }

    const entradas = Object.entries(objeto);

    for (const chave of chaves) {
      const entrada = entradas.find(
        ([chaveObjeto]) => chaveObjeto.toLowerCase() === chave.toLowerCase(),
      );

      if (entrada) {
        return entrada[1];
      }
    }

    return undefined;
  }

  private buscarString(corpo: unknown, chaves: string[]): string | undefined {
    const objeto = this.comoObjeto(corpo);

    if (!objeto) {
      return undefined;
    }

    for (const chave of chaves) {
      const valor = this.buscarValor(objeto, [chave]);

      if (typeof valor === 'string' && valor.trim()) {
        return valor.trim();
      }

      if (typeof valor === 'number') {
        return String(valor);
      }
    }

    return undefined;
  }

  private comoObjeto(corpo: unknown): Record<string, unknown> | undefined {
    if (corpo && typeof corpo === 'object' && !Array.isArray(corpo)) {
      return corpo as Record<string, unknown>;
    }

    return undefined;
  }

  private limitarMensagem(mensagem: string): string {
    return mensagem.trim().slice(0, TAMANHO_MAXIMO_MENSAGEM_ERRO);
  }
}
