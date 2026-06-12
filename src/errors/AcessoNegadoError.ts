export class AcessoNegadoError extends Error {
  constructor() {
    super('Acesso negado.');
    this.name = 'AcessoNegadoError';
  }
}
