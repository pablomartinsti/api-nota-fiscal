export class CertificadoA1CnpjDivergenteError extends Error {
  constructor() {
    super('O certificado A1 nao pertence a empresa emitente.');
    this.name = 'CertificadoA1CnpjDivergenteError';
  }
}
