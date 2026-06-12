export class ClienteNaoEncontradoError extends Error {
  constructor() {
    super('Cliente não encontrado.');
    this.name = 'ClienteNaoEncontradoError';
  }
}
