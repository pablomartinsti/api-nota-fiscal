import { randomUUID } from 'crypto';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { NFSeGerarDanfse, extractChaveFromNFSeId } from '@treeunfe/danfe';
import { parseNFSeXml } from '@treeunfe/nfse';

import { NotaServico } from '../../entities/NotaServico';

export interface ResultadoPdfDanfseNacional {
  chaveAcesso: string;
  pdf: Buffer;
}

export class GeradorPdfDanfseNacional {
  async gerar(nota: NotaServico): Promise<ResultadoPdfDanfseNacional | undefined> {
    const xmlAutorizado = nota.xmlAutorizado?.trim();

    if (!xmlAutorizado) {
      return undefined;
    }

    const NFSe = parseNFSeXml(xmlAutorizado);
    const chaveAcesso = this.resolverChaveAcesso(nota, NFSe.infNFSe.id);
    const diretorioTemporario = await mkdtemp(join(tmpdir(), 'danfse-'));
    const caminhoPdf = join(diretorioTemporario, `${chaveAcesso}.pdf`);

    try {
      const gerador = new NFSeGerarDanfse({
        data: { NFSe },
        outputPath: caminhoPdf,
      });
      const resultado = await gerador.generatePDF();

      if (!resultado.success) {
        throw new Error(resultado.message);
      }

      return {
        chaveAcesso,
        pdf: await readFile(caminhoPdf),
      };
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'erro desconhecido';

      throw new Error(
        `Nao foi possivel gerar o DANFSe local a partir do XML autorizado: ${mensagem}`,
      );
    } finally {
      await rm(diretorioTemporario, { recursive: true, force: true });
    }
  }

  private resolverChaveAcesso(nota: NotaServico, idNfse?: string): string {
    if (nota.chaveAcesso) {
      return nota.chaveAcesso;
    }

    if (idNfse) {
      return extractChaveFromNFSeId(idNfse);
    }

    return randomUUID();
  }
}
