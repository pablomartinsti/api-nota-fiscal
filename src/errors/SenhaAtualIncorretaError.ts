export class SenhaAtualIncorretaError extends Error {
  constructor() {
    super('Senha atual incorreta.');
    this.name = 'SenhaAtualIncorretaError';
  }
}
