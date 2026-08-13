export interface CertificadoA1 {
  chavePrivadaPem: string;
  certificadoPem: string;
  cnpj: string;
  validoDe: Date;
  validoAte: Date;
}

export interface ProvedorCertificadoA1 {
  obter(): Promise<CertificadoA1>;
}
