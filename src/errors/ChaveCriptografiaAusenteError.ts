export class ChaveCriptografiaAusenteError extends Error {
  constructor() {
    super('Chave de criptografia do certificado A1 nao foi informada.');
    this.name = 'ChaveCriptografiaAusenteError';
  }
}
