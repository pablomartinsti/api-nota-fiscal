import { DOMParser, Element as XmlElement } from '@xmldom/xmldom';

export interface DadosXmlNfseNacional {
  chaveAcesso?: string;
  numeroNfse?: string;
  cpfCnpjTomador?: string;
  codigoStatus?: string;
  statusFiscal?: string;
  dataEmissao?: string;
  dataCompetencia?: string;
  valorServico?: number;
}

export function extrairDadosXmlNfseNacional(
  xml: string,
): DadosXmlNfseNacional | undefined {
  if (!xml.trim()) {
    return undefined;
  }

  const documento = new DOMParser().parseFromString(xml, 'application/xml');
  const todosElementos = Array.from(documento.getElementsByTagName('*'));

  if (!todosElementos.length) {
    return undefined;
  }

  const codigoStatus = buscarTexto(todosElementos, ['cStat']);

  return {
    chaveAcesso: extrairChaveAcesso(todosElementos),
    numeroNfse: buscarTexto(todosElementos, ['nNFSe']),
    cpfCnpjTomador: buscarDocumentoTomador(todosElementos),
    codigoStatus,
    statusFiscal: mapearStatusFiscal(codigoStatus),
    dataEmissao: buscarTexto(todosElementos, ['dhProc', 'dhEmi']),
    dataCompetencia: buscarTexto(todosElementos, ['dCompet']),
    valorServico: buscarValorServico(todosElementos),
  };
}

function extrairChaveAcesso(elementos: XmlElement[]): string | undefined {
  const infNfse = elementos.find(
    (elemento) => localName(elemento) === 'infNFSe',
  );
  const id = infNfse?.getAttribute('Id')?.trim();

  if (id?.startsWith('NFS')) {
    return id.slice(3);
  }

  return buscarTexto(elementos, ['chNFSe', 'chaveAcesso']);
}

function buscarDocumentoTomador(elementos: XmlElement[]): string | undefined {
  const tomador = elementos.find((elemento) => localName(elemento) === 'toma');

  if (!tomador) {
    return undefined;
  }

  const filhos = Array.from(tomador.getElementsByTagName('*'));

  return buscarTexto(filhos, ['CNPJ', 'CPF']);
}

function buscarValorServico(elementos: XmlElement[]): number | undefined {
  const valor = buscarTexto(elementos, ['vLiq', 'vServ']);

  if (!valor) {
    return undefined;
  }

  const numero = Number(valor.replace(',', '.'));

  return Number.isFinite(numero) ? numero : undefined;
}

function buscarTexto(
  elementos: XmlElement[],
  nomes: string[],
): string | undefined {
  for (const nome of nomes) {
    const elemento = elementos.find(
      (item) => localName(item).toLowerCase() === nome.toLowerCase(),
    );
    const texto = elemento?.textContent?.trim();

    if (texto) {
      return texto;
    }
  }

  return undefined;
}

function mapearStatusFiscal(codigoStatus?: string): string | undefined {
  if (codigoStatus === '100') {
    return 'AUTORIZADA';
  }

  if (codigoStatus === '101') {
    return 'CANCELADA';
  }

  return codigoStatus ? 'OUTRO' : undefined;
}

function localName(elemento: XmlElement): string {
  return elemento.localName || elemento.nodeName.split(':').pop() || '';
}
