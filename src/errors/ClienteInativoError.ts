export class ClienteInativoError extends Error {
  constructor() {
    super('Cliente inativo nao pode ser utilizado em uma nota.');
    this.name = 'ClienteInativoError';
  }
}
