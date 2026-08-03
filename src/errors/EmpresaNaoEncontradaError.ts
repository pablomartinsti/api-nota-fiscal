export class EmpresaNaoEncontradaError extends Error {
  constructor() {
    super('Empresa nao encontrada.');
    this.name = 'EmpresaNaoEncontradaError';
  }
}
