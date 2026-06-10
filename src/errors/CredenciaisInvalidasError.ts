export class CredenciaisInvalidasError extends Error {
  constructor() {
    super('E-mail ou senha inválidos.');
    this.name = 'CredenciaisInvalidasError';
  }
}
