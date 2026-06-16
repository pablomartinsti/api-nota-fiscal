import { CertificadoA1 } from './CertificadoA1';

export interface AssinadorXmlDps {
  assinar(xml: string, certificado: CertificadoA1): string;
}
