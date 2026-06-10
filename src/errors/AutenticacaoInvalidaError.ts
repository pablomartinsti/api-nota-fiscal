export class AutenticacaoInvalidaError extends Error {
  constructor() {
    super('Autenticação inválida.');
    this.name = 'AutenticacaoInvalidaError';
  }
}
