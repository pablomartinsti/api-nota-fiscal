export class TransicaoStatusNotaInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransicaoStatusNotaInvalidaError';
  }
}
