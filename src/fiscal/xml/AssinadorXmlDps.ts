import { CertificadoA1 } from '../certificados-a1/CertificadoA1';

export interface AssinadorXmlDps {
  assinar(xml: string, certificado: CertificadoA1): string;
}
