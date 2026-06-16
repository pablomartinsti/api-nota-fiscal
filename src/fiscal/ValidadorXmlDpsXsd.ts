import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, extname } from 'node:path';

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { validateXML, XMLFileInfo } from 'xmllint-wasm';

import { ConfiguracaoFiscalAusenteError } from '../errors/ConfiguracaoFiscalAusenteError';
import { XmlDpsInvalidoError } from '../errors/XmlDpsInvalidoError';
import { ValidadorXmlDps } from './ValidadorXmlDps';

export class ValidadorXmlDpsXsd implements ValidadorXmlDps {
  constructor(private readonly obterCaminhoXsd: () => string | undefined) {}

  async validar(xml: string): Promise<void> {
    const caminhoXsd = this.obterCaminhoXsd();

    if (!caminhoXsd) {
      throw new ConfiguracaoFiscalAusenteError();
    }

    try {
      const pasta = dirname(caminhoXsd);
      const nomePrincipal = basename(caminhoXsd);
      const arquivos = await readdir(pasta);
      const dependencias: XMLFileInfo[] = [];

      for (const arquivo of arquivos) {
        if (extname(arquivo).toLowerCase() !== '.xsd') {
          continue;
        }

        const conteudo = this.normalizarSchema(
          await readFile(`${pasta}/${arquivo}`, 'utf8'),
        );

        if (arquivo !== nomePrincipal) {
          dependencias.push({ fileName: arquivo, contents: conteudo });
        }
      }

      const schema = this.normalizarSchema(await readFile(caminhoXsd, 'utf8'));
      const resultado = await validateXML({
        xml: [{ fileName: 'dps.xml', contents: xml }],
        schema: [{ fileName: nomePrincipal, contents: schema }],
        preload: dependencias,
      });

      if (!resultado.valid) {
        throw new XmlDpsInvalidoError(
          resultado.errors.map((erro) => erro.message),
        );
      }
    } catch (error) {
      if (
        error instanceof XmlDpsInvalidoError ||
        error instanceof ConfiguracaoFiscalAusenteError
      ) {
        throw error;
      }

      throw new XmlDpsInvalidoError();
    }
  }

  private normalizarSchema(schema: string): string {
    const documento = new DOMParser().parseFromString(
      schema.replace(/^\uFEFF/, ''),
      'application/xml',
    );
    const patterns = documento.getElementsByTagNameNS(
      'http://www.w3.org/2001/XMLSchema',
      'pattern',
    );

    for (let indice = 0; indice < patterns.length; indice++) {
      const pattern = patterns.item(indice);
      const valor = pattern?.getAttribute('value');

      if (pattern && valor?.startsWith('^') && valor.endsWith('$')) {
        pattern.setAttribute('value', valor.slice(1, -1));
      }
    }

    return new XMLSerializer().serializeToString(documento);
  }
}
