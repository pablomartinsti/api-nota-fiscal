import { DOMParser } from '@xmldom/xmldom';
import { SignedXml } from 'xml-crypto';

import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import { AssinadorXmlDps } from './AssinadorXmlDps';
import { CertificadoA1 } from './CertificadoA1';

const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const ENVELOPED_SIGNATURE =
  'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
const RSA_SHA256 = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
const SHA256 = 'http://www.w3.org/2001/04/xmlenc#sha256';
const NAMESPACE_XMLDSIG = 'http://www.w3.org/2000/09/xmldsig#';

export class AssinadorXmlPedRegEventoXmlDsig implements AssinadorXmlDps {
  assinar(xml: string, certificado: CertificadoA1): string {
    const assinatura = new SignedXml({
      privateKey: certificado.chavePrivadaPem,
      publicCert: certificado.certificadoPem,
      canonicalizationAlgorithm: C14N,
      signatureAlgorithm: RSA_SHA256,
      getKeyInfoContent: SignedXml.getKeyInfoContent,
    });

    assinatura.addReference({
      xpath: "//*[local-name(.)='infPedReg']",
      transforms: [ENVELOPED_SIGNATURE, C14N],
      digestAlgorithm: SHA256,
    });
    assinatura.computeSignature(xml, {
      location: {
        reference: "//*[local-name(.)='infPedReg']",
        action: 'after',
      },
    });

    const xmlAssinado = assinatura.getSignedXml();
    this.verificarAssinatura(xmlAssinado, certificado.certificadoPem);

    return xmlAssinado;
  }

  private verificarAssinatura(xml: string, certificadoPem: string): void {
    const documento = new DOMParser().parseFromString(xml, 'application/xml');
    const noAssinatura = documento.getElementsByTagNameNS(
      NAMESPACE_XMLDSIG,
      'Signature',
    )[0];

    if (!noAssinatura) {
      throw new CertificadoA1InvalidoError(
        'Assinatura XMLDSig nao foi gerada.',
      );
    }

    const verificador = new SignedXml({
      publicCert: certificadoPem,
      getCertFromKeyInfo: () => null,
    });
    verificador.loadSignature(noAssinatura.toString());

    if (!verificador.checkSignature(xml)) {
      throw new CertificadoA1InvalidoError(
        'Nao foi possivel verificar a assinatura XMLDSig.',
      );
    }
  }
}
