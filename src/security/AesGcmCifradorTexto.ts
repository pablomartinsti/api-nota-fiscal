import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

import { ChaveCriptografiaAusenteError } from '../errors/ChaveCriptografiaAusenteError';
import { CifradorTexto } from './CifradorTexto';

const PREFIXO = 'aes-256-gcm:v1';
const TAMANHO_CHAVE_BYTES = 32;
const TAMANHO_IV_BYTES = 12;

export class AesGcmCifradorTexto implements CifradorTexto {
  constructor(private readonly chave?: string) {}

  criptografar(texto: string): string {
    const chave = this.obterChave();
    const iv = randomBytes(TAMANHO_IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', chave, iv);
    const conteudoCriptografado = Buffer.concat([
      cipher.update(texto, 'utf8'),
      cipher.final(),
    ]);
    const tagAutenticacao = cipher.getAuthTag();

    return [
      PREFIXO,
      iv.toString('base64url'),
      tagAutenticacao.toString('base64url'),
      conteudoCriptografado.toString('base64url'),
    ].join(':');
  }

  descriptografar(textoCriptografado: string): string {
    if (!this.estaCriptografado(textoCriptografado)) {
      return textoCriptografado;
    }

    const chave = this.obterChave();
    const [, , ivBase64, tagBase64, conteudoBase64] =
      textoCriptografado.split(':');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      chave,
      Buffer.from(ivBase64, 'base64url'),
    );

    decipher.setAuthTag(Buffer.from(tagBase64, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(conteudoBase64, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  estaCriptografado(texto: string): boolean {
    return texto.startsWith(`${PREFIXO}:`);
  }

  private obterChave(): Buffer {
    const chave = this.chave?.trim();

    if (!chave) {
      throw new ChaveCriptografiaAusenteError();
    }

    const buffer = /^[a-f0-9]{64}$/i.test(chave)
      ? Buffer.from(chave, 'hex')
      : Buffer.from(chave, 'base64');

    if (buffer.length !== TAMANHO_CHAVE_BYTES) {
      throw new ChaveCriptografiaAusenteError();
    }

    return buffer;
  }
}
