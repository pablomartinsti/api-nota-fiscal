export class EmpresaNaoEncontradaError extends Error {
  constructor() {
    super('Empresa não encontrada.');
    this.name = 'EmpresaNaoEncontradaError';
  }
}
