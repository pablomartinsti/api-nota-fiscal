export class NotaServicoNaoEncontradaError extends Error {
  constructor() {
    super('Nota de servico nao encontrada.');
    this.name = 'NotaServicoNaoEncontradaError';
  }
}
