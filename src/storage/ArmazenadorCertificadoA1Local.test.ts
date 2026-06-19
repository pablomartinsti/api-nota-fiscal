import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import { ArmazenadorCertificadoA1Local } from './ArmazenadorCertificadoA1Local';

let pastaTemporaria: string | undefined;

describe('ArmazenadorCertificadoA1Local', () => {
  afterEach(async () => {
    if (pastaTemporaria) {
      await rm(pastaTemporaria, { recursive: true, force: true });
      pastaTemporaria = undefined;
    }
  });

  it('deve salvar certificado A1 em pasta controlada', async () => {
    pastaTemporaria = await mkdtemp(join(tmpdir(), 'nfse-cert-storage-'));
    const armazenador = new ArmazenadorCertificadoA1Local(pastaTemporaria);
    const conteudo = Buffer.from('conteudo-pfx');

    const arquivo = await armazenador.salvar({
      empresaId: 'empresa-1',
      nomeArquivo: 'empresa.pfx',
      conteudoBase64: conteudo.toString('base64'),
    });

    await expect(readFile(arquivo.caminho)).resolves.toEqual(conteudo);
    expect(arquivo.caminho).toContain(pastaTemporaria);
    expect(arquivo.caminho).toMatch(/empresa-1-.+\.pfx$/);
    expect(arquivo.tamanhoBytes).toBe(conteudo.length);
  });

  it('deve rejeitar extensao invalida', async () => {
    pastaTemporaria = await mkdtemp(join(tmpdir(), 'nfse-cert-storage-'));
    const armazenador = new ArmazenadorCertificadoA1Local(pastaTemporaria);

    await expect(
      armazenador.salvar({
        empresaId: 'empresa-1',
        nomeArquivo: 'empresa.txt',
        conteudoBase64: Buffer.from('x').toString('base64'),
      }),
    ).rejects.toBeInstanceOf(CertificadoA1InvalidoError);
  });

  it('deve remover certificado salvo', async () => {
    pastaTemporaria = await mkdtemp(join(tmpdir(), 'nfse-cert-storage-'));
    const armazenador = new ArmazenadorCertificadoA1Local(pastaTemporaria);
    const arquivo = await armazenador.salvar({
      empresaId: 'empresa-1',
      nomeArquivo: 'empresa.p12',
      conteudoBase64: Buffer.from('conteudo-p12').toString('base64'),
    });

    await armazenador.remover(arquivo.caminho);

    await expect(access(arquivo.caminho)).rejects.toThrow();
  });
});
