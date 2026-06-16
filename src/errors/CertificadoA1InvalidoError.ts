export class CertificadoA1InvalidoError extends Error {
  constructor(message = 'Certificado A1 invalido ou indisponivel.') {
    super(message);
    this.name = 'CertificadoA1InvalidoError';
  }
}
