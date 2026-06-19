import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import {
  ArmazenadorCertificadoA1,
  CertificadoA1Armazenado,
  SalvarCertificadoA1Input,
} from './ArmazenadorCertificadoA1';

const TAMANHO_MAXIMO_CERTIFICADO_BYTES = 5 * 1024 * 1024;

export class ArmazenadorCertificadoA1Local
  implements ArmazenadorCertificadoA1
{
  private readonly diretorioBase: string;

  constructor(diretorioBase: string) {
    this.diretorioBase = resolve(diretorioBase);
  }

  async salvar(
    input: SalvarCertificadoA1Input,
  ): Promise<CertificadoA1Armazenado> {
    const extensao = this.validarExtensao(input.nomeArquivo);
    const conteudo = this.decodificarBase64(input.conteudoBase64);

    if (conteudo.length > TAMANHO_MAXIMO_CERTIFICADO_BYTES) {
      throw new CertificadoA1InvalidoError(
        'Arquivo do certificado A1 excede o tamanho maximo permitido.',
      );
    }

    await mkdir(this.diretorioBase, { recursive: true });

    const nomeArquivo = `${input.empresaId}-${randomUUID()}${extensao}`;
    const caminho = resolve(this.diretorioBase, nomeArquivo);

    await writeFile(caminho, conteudo, { mode: 0o600 });

    return {
      caminho,
      tamanhoBytes: conteudo.length,
    };
  }

  async remover(caminho: string): Promise<void> {
    await rm(caminho, { force: true });
  }

  private validarExtensao(nomeArquivo: string): '.pfx' | '.p12' {
    const extensao = extname(nomeArquivo.trim()).toLowerCase();

    if (extensao !== '.pfx' && extensao !== '.p12') {
      throw new CertificadoA1InvalidoError(
        'Arquivo do certificado A1 deve ter extensao .pfx ou .p12.',
      );
    }

    return extensao;
  }

  private decodificarBase64(conteudoBase64: string): Buffer {
    const conteudoNormalizado = conteudoBase64
      .replace(/^data:[^;]+;base64,/i, '')
      .replace(/\s/g, '');

    if (
      !conteudoNormalizado ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(conteudoNormalizado)
    ) {
      throw new CertificadoA1InvalidoError(
        'Conteudo do certificado A1 deve estar em Base64.',
      );
    }

    const buffer = Buffer.from(conteudoNormalizado, 'base64');
    const base64Reprocessado = buffer.toString('base64').replace(/=+$/, '');
    const base64Informado = conteudoNormalizado.replace(/=+$/, '');

    if (!buffer.length || base64Reprocessado !== base64Informado) {
      throw new CertificadoA1InvalidoError(
        'Conteudo do certificado A1 deve estar em Base64.',
      );
    }

    return buffer;
  }
}
